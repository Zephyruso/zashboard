import { disconnectByIdAPI, fetchConnectionsAPI } from '@/api'
import { CONNECTION_TAB_TYPE, SORT_DIRECTION, SORT_TYPE } from '@/constant'
import { getChainsStringFromConnection, getInboundUserFromConnection } from '@/helper'
import type { Connection, ConnectionRawMessage } from '@/types'
import { useStorage, watchOnce } from '@vueuse/core'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import { autoDisconnectIdleUDP, autoDisconnectIdleUDPTime, useConnectionCard } from './settings'

export const connectionTabShow = ref(CONNECTION_TAB_TYPE.ACTIVE)
export const connectionSortType = useStorage<SORT_TYPE>(
  'config/connection-sort-type',
  SORT_TYPE.HOST,
)
export const connectionSortDirection = useStorage<SORT_DIRECTION>(
  'config/connection-sort-direction',
  SORT_DIRECTION.ASC,
)

export const quickFilterRegex = useStorage<string>('config/quick-filter-regex', 'direct|dns-out')
export const quickFilterEnabled = useStorage<boolean>('config/quick-filter-enabled', false)
export const connectionFilter = ref('')
export const sourceIPFilter = ref<string[] | null>(null)

export const activeConnections = ref<Connection[]>([])
export const closedConnections = ref<Connection[]>([])
export const isPaused = ref(false)

export const downloadTotal = ref(0)
export const uploadTotal = ref(0)

let cancel: () => void
let previousConnectionsMap = new Map<string, Connection>()

export const resetConnections = () => {
  cancel?.()
  activeConnections.value = []
  closedConnections.value = []
  downloadTotal.value = 0
  uploadTotal.value = 0
  previousConnectionsMap.clear()
}
export const initConnections = () => {
  resetConnections()

  const ws = fetchConnectionsAPI<{
    connections: ConnectionRawMessage[]
    downloadTotal: number
    uploadTotal: number
    memory: number
  }>()
  const unwatch = watch(ws.data, (data) => {
    if (!data) return

    downloadTotal.value = data.downloadTotal
    uploadTotal.value = data.uploadTotal

    if (isPaused.value) {
      return
    }

    const currentConnectionsMap = new Map<string, Connection>()

    activeConnections.value =
      data.connections?.map((conn) => {
        const connection = conn as Connection
        const preConnection = previousConnectionsMap.get(connection.id)

        if (
          (connection.metadata.destinationPort === '443' || connection.metadata.sniffHost) &&
          connection.metadata.network === 'udp'
        ) {
          connection.metadata.network = 'quic'
        }

        if (!preConnection) {
          connection.downloadSpeed = 0
          connection.uploadSpeed = 0
        } else {
          connection.downloadSpeed = connection.download - preConnection.download
          connection.uploadSpeed = connection.upload - preConnection.upload
        }

        previousConnectionsMap.delete(connection.id)
        currentConnectionsMap.set(connection.id, connection)
        return connection
      }) ?? []

    closedConnections.value = closedConnections.value
      .concat(Array.from(previousConnectionsMap.values()))
      .slice(-500)
    previousConnectionsMap = currentConnectionsMap
  })

  if (autoDisconnectIdleUDP.value) {
    watchOnce(activeConnections, () => {
      activeConnections.value
        .filter((conn) => conn.metadata.network !== 'tcp')
        .forEach((conn) => {
          const now = dayjs()
          const start = dayjs(conn.start)

          if (now.diff(start, 'minute') > autoDisconnectIdleUDPTime.value) {
            disconnectByIdAPI(conn.id)
          }
        })
    })
  }

  cancel = () => {
    unwatch()
    ws.close()
  }
}

const isDesc = computed(() => {
  return connectionSortDirection.value === SORT_DIRECTION.DESC
})

const sortFunctionMap: Record<SORT_TYPE, (a: Connection, b: Connection) => number> = {
  [SORT_TYPE.HOST]: (a: Connection, b: Connection) => {
    return (a.metadata.host || a.metadata.destinationIP).localeCompare(
      b.metadata.host || b.metadata.destinationIP,
    )
  },
  [SORT_TYPE.RULE]: (a: Connection, b: Connection) => {
    return a.rule.localeCompare(b.rule)
  },
  [SORT_TYPE.CHAINS]: (a: Connection, b: Connection) => {
    return getChainsStringFromConnection(a).localeCompare(getChainsStringFromConnection(b))
  },
  [SORT_TYPE.DOWNLOAD]: (a: Connection, b: Connection) => {
    return a.download - b.download
  },
  [SORT_TYPE.DOWNLOAD_SPEED]: (a: Connection, b: Connection) => {
    return a.downloadSpeed - b.downloadSpeed
  },
  [SORT_TYPE.UPLOAD]: (a: Connection, b: Connection) => {
    return a.upload - b.upload
  },
  [SORT_TYPE.UPLOAD_SPEED]: (a: Connection, b: Connection) => {
    return a.uploadSpeed - b.uploadSpeed
  },
  [SORT_TYPE.SOURCE_IP]: (a: Connection, b: Connection) => {
    return a.metadata.sourceIP.localeCompare(b.metadata.sourceIP)
  },
  [SORT_TYPE.TYPE]: (a: Connection, b: Connection) => {
    return (a.metadata.type + a.metadata.network).localeCompare(
      b.metadata.type + b.metadata.network,
    )
  },
  [SORT_TYPE.CONNECT_TIME]: (a: Connection, b: Connection) => {
    return dayjs(a.start).valueOf() - dayjs(b.start).valueOf()
  },
  [SORT_TYPE.INBOUND_USER]: (a: Connection, b: Connection) => {
    return getInboundUserFromConnection(a).localeCompare(getInboundUserFromConnection(b))
  },
}

export const connections = computed(() => {
  return connectionTabShow.value === CONNECTION_TAB_TYPE.ACTIVE
    ? activeConnections.value
    : closedConnections.value
})

export const renderConnections = computed(() => {
  const lowerCaseFilter = connectionFilter.value.split(' ').map((f) => f.toLowerCase().trim())

  let regex: RegExp | null = null

  if (quickFilterEnabled.value && quickFilterRegex.value) {
    regex = new RegExp(quickFilterRegex.value, 'i')
  }

  return connections.value
    .filter((conn) => {
      const metadatas = [
        conn.metadata.host,
        conn.metadata.destinationIP,
        conn.metadata.destinationPort,
        conn.metadata.sourceIP,
        conn.metadata.sourcePort,
        conn.metadata.sniffHost,
        conn.metadata.processPath,
        conn.metadata.type,
        conn.metadata.network,
        conn.chains.join(''),
        conn.rule,
        conn.rulePayload,
      ]

      if (
        sourceIPFilter.value !== null &&
        sourceIPFilter.value.every((i) => i !== conn.metadata.sourceIP)
      ) {
        return false
      }

      if (regex) {
        const quickFilterMatch = metadatas.some((i) => regex.test(i))

        if (quickFilterMatch) {
          return false
        }
      }

      if (connectionFilter.value) {
        return lowerCaseFilter.every((i) => metadatas.some((j) => j?.toLowerCase().includes(i)))
      }

      return true
    })
    .sort((a, b) => {
      if (useConnectionCard.value && isDesc.value) {
        ;[a, b] = [b, a]
      }
      const sortResult = useConnectionCard.value
        ? sortFunctionMap[connectionSortType.value](a, b)
        : sortFunctionMap[SORT_TYPE.HOST](a, b)

      if (sortResult === 0) {
        return a.id.localeCompare(b.id)
      }

      return sortResult
    })
})
