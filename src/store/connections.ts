import { fetchConnectionsAPI } from '@/api'
import { CONNECTION_TAB_TYPE, SORT_TYPE } from '@/config'
import type { Connection, ConnectionRawMessage } from '@/types'
import { useStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import _, { differenceWith } from 'lodash'
import { computed, ref, watch } from 'vue'
import { useConnectionCard } from './settings'

export const activeConnections = ref<Connection[]>([])
export const closedConnections = ref<Connection[]>([])

export const downloadTotal = ref(0)
export const uploadTotal = ref(0)

let cancel: () => void

export const initConnections = () => {
  cancel?.()
  activeConnections.value = []
  closedConnections.value = []
  downloadTotal.value = 0
  uploadTotal.value = 0

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

    closedConnections.value = [
      ...closedConnections.value,
      ...differenceWith(activeConnections.value, data.connections, (a, b) => a.id === b.id),
    ].slice(-500)
    activeConnections.value =
      data.connections?.map((connection) => {
        const preConnection = activeConnections.value.find((c) => c.id === connection.id)

        if (!preConnection) {
          return {
            ...connection,
            downloadSpeed: 0,
            uploadSpeed: 0,
          }
        }

        return {
          ...connection,
          downloadSpeed: connection.download - preConnection.download,
          uploadSpeed: connection.upload - preConnection.upload,
        }
      }) ?? []
  })

  cancel = () => {
    unwatch()
    ws.close()
  }
}

export const quickFilterRegex = useStorage<string>('config/quick-filter-regex', 'direct|dns-out')
export const quickFilterEnabled = useStorage<boolean>('config/quick-filter-enabled', false)
export const connectionTabShow = ref(CONNECTION_TAB_TYPE.ACTIVE)

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
    return a.chains.join('').localeCompare(b.chains.join(''))
  },
  [SORT_TYPE.DOWNLOAD]: (a: Connection, b: Connection) => {
    return b.download - a.download
  },
  [SORT_TYPE.DOWNLOAD_SPEED]: (a: Connection, b: Connection) => {
    return b.downloadSpeed - a.downloadSpeed
  },
  [SORT_TYPE.UPLOAD]: (a: Connection, b: Connection) => {
    return b.upload - a.upload
  },
  [SORT_TYPE.UPLOAD_SPEED]: (a: Connection, b: Connection) => {
    return b.uploadSpeed - a.uploadSpeed
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
    return dayjs(b.start).valueOf() - dayjs(a.start).valueOf()
  },
}

export const connectionSortType = useStorage<SORT_TYPE>(
  'config/connection-sort-type',
  SORT_TYPE.HOST,
)
export const connectionFilter = ref('')
export const isPaused = ref(false)

export const renderConnections = computed(() => {
  let regex: RegExp | null = null
  if (quickFilterEnabled.value && quickFilterRegex.value) {
    regex = new RegExp(quickFilterRegex.value, 'i')
  }
  return (
    connectionTabShow.value === CONNECTION_TAB_TYPE.ACTIVE
      ? activeConnections.value
      : closedConnections.value
  )
    .filter((conn) => {
      if (regex) {
        const quickFilterMatch =
          regex.test(conn.chains.join('')) ||
          regex.test(conn.metadata.host) ||
          regex.test(conn.metadata.destinationIP)

        if (quickFilterMatch) {
          return false
        }
      }

      if (sourceIPFilter.value && conn.metadata.sourceIP !== sourceIPFilter.value) {
        return false
      }

      if (connectionFilter.value) {
        return [
          conn.metadata.host,
          conn.metadata.destinationIP,
          conn.metadata.destinationPort,
          conn.metadata.sourceIP,
          conn.metadata.sourcePort,
          conn.metadata.processPath,
          conn.metadata.type,
          conn.metadata.network,
          conn.chains.join(''),
          conn.rule,
          conn.rulePayload,
        ].some((i) => i?.includes(connectionFilter.value))
      }

      return true
    })
    .sort((a, b) => {
      const sortResult = useConnectionCard.value
        ? sortFunctionMap[connectionSortType.value](a, b)
        : sortFunctionMap[SORT_TYPE.HOST](a, b)

      if (sortResult === 0) {
        return a.id.localeCompare(b.id)
      }

      return sortResult
    })
})

export const sourceIPFilter = ref('')

export const sourceIPs = computed(() => {
  return _.uniq(activeConnections.value.map((conn) => conn.metadata.sourceIP)).sort()
})
