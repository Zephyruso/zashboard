import { disconnectByIdAPI, fetchConnectionsAPI } from '@/api'
import { CONNECTION_TAB_TYPE, SORT_DIRECTION, SORT_TYPE } from '@/constant'
import { getChainsStringFromConnection, getInboundUserFromConnection } from '@/helper'
import { toSearchRegex } from '@/helper/search'
import type { Connection, ConnectionRawMessage } from '@/types'
import { useStorage } from '@vueuse/core'
import { computed, ref, shallowRef, watch } from 'vue'
import { initAggregatedDataMap, saveConnectionHistory } from './connHistory'
import { autoDisconnectIdleUDP, autoDisconnectIdleUDPTime, isConnectionCard } from './settings'
import { activeBackend } from './setup'

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

// shallowRef: connection objects are replaced wholesale on every WS message
// (see initConnections below); we never mutate sub-fields after the array is
// assigned. Skipping the deep Proxy wrap avoids 1000+ reactive wrappers per
// tick when the user has a busy traffic graph.
export const activeConnections = shallowRef<Connection[]>([])
const closedConnections = shallowRef<Connection[]>([])
export const isPaused = ref(false)

export const downloadTotal = ref(0)
export const uploadTotal = ref(0)

export interface ConnectionChainStats {
  downloadSpeed: number
  uploadSpeed: number
  count: number
}

interface ConnectionDerivedData {
  chainsText: string
  inboundUser: string
  searchFields: string[]
  startTime: number
  typeText: string
}

const connectionDerivedData = new WeakMap<Connection, ConnectionDerivedData>()

const ensureConnectionDerivedData = (connection: Connection) => {
  let derived = connectionDerivedData.get(connection)

  if (derived) {
    return derived
  }

  derived = {
    chainsText: getChainsStringFromConnection(connection),
    inboundUser: getInboundUserFromConnection(connection),
    searchFields: [
      connection.metadata.host,
      connection.metadata.destinationIP,
      connection.metadata.destinationPort,
      connection.metadata.sourceIP,
      connection.metadata.sourcePort,
      connection.metadata.sniffHost,
      connection.metadata.inboundUser,
      connection.metadata.inboundName,
      connection.metadata.inboundPort,
      connection.metadata.process,
      connection.metadata.processPath,
      connection.metadata.type,
      connection.metadata.network,
      connection.chains.join(''),
      connection.rule,
      connection.rulePayload,
    ],
    startTime: Date.parse(connection.start),
    typeText: connection.metadata.type + connection.metadata.network,
  }

  connectionDerivedData.set(connection, derived)

  return derived
}

export const activeConnectionChainStats = computed(() => {
  const stats = new Map<string, ConnectionChainStats>()

  for (const conn of activeConnections.value) {
    for (const chain of new Set(conn.chains)) {
      if (!chain) {
        continue
      }

      const current = stats.get(chain)

      if (current) {
        current.downloadSpeed += conn.downloadSpeed
        current.uploadSpeed += conn.uploadSpeed
        current.count += 1
      } else {
        stats.set(chain, {
          downloadSpeed: conn.downloadSpeed,
          uploadSpeed: conn.uploadSpeed,
          count: 1,
        })
      }
    }
  }

  return stats
})

let cancel: (() => void) | undefined
let cancelAutoDisconnectWatcher: (() => void) | undefined
let previousConnectionsMap = new Map<string, Connection>()
const disconnectingIdleConnectionIds = new Set<string>()

const connectConnectionsStream = () => {
  if (!activeBackend.value) return

  cancel?.()

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

        ensureConnectionDerivedData(connection)
        previousConnectionsMap.delete(connection.id)
        currentConnectionsMap.set(connection.id, connection)
        return connection
      }) ?? []

    const newlyClosedConnections = Array.from(previousConnectionsMap.values())
    closedConnections.value = closedConnections.value.concat(newlyClosedConnections).slice(-500)

    if (newlyClosedConnections.length > 0) {
      saveConnectionHistory(newlyClosedConnections)
    }

    previousConnectionsMap = currentConnectionsMap
  })

  cancelAutoDisconnectWatcher?.()
  cancelAutoDisconnectWatcher = watch(
    [activeConnections, autoDisconnectIdleUDP, autoDisconnectIdleUDPTime],
    ([currentConnections, enabled, idleMinutes]) => {
      const currentConnectionIds = new Set(currentConnections.map((conn) => conn.id))

      for (const id of disconnectingIdleConnectionIds) {
        if (!currentConnectionIds.has(id)) {
          disconnectingIdleConnectionIds.delete(id)
        }
      }

      if (!enabled) return

      const now = Date.now()
      currentConnections
        .filter((conn) => conn.metadata.network !== 'tcp')
        .forEach((conn) => {
          if (disconnectingIdleConnectionIds.has(conn.id)) return

          const startTime = ensureConnectionDerivedData(conn).startTime
          if (!Number.isFinite(startTime)) return
          if (Math.floor((now - startTime) / 60000) <= idleMinutes) return

          disconnectingIdleConnectionIds.add(conn.id)
          void disconnectByIdAPI(conn.id).catch(() => {
            disconnectingIdleConnectionIds.delete(conn.id)
          })
        })
    },
    { immediate: true },
  )

  cancel = () => {
    unwatch()
    cancelAutoDisconnectWatcher?.()
    cancelAutoDisconnectWatcher = undefined
    disconnectingIdleConnectionIds.clear()
    ws.close()
    cancel = undefined
  }
}

export const pauseConnections = () => {
  cancel?.()
  previousConnectionsMap.clear()
  disconnectingIdleConnectionIds.clear()
}

export const resumeConnections = () => {
  if (cancel) return
  connectConnectionsStream()
}

export const initConnections = () => {
  pauseConnections()
  activeConnections.value = []
  closedConnections.value = []
  downloadTotal.value = 0
  uploadTotal.value = 0
  previousConnectionsMap.clear()
  initAggregatedDataMap()
  connectConnectionsStream()
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
    return ensureConnectionDerivedData(a).chainsText.localeCompare(
      ensureConnectionDerivedData(b).chainsText,
    )
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
    return ensureConnectionDerivedData(a).typeText.localeCompare(
      ensureConnectionDerivedData(b).typeText,
    )
  },
  [SORT_TYPE.CONNECT_TIME]: (a: Connection, b: Connection) => {
    return ensureConnectionDerivedData(a).startTime - ensureConnectionDerivedData(b).startTime
  },
  [SORT_TYPE.INBOUND_USER]: (a: Connection, b: Connection) => {
    return ensureConnectionDerivedData(a).inboundUser.localeCompare(
      ensureConnectionDerivedData(b).inboundUser,
    )
  },
}

export const connections = computed(() => {
  return connectionTabShow.value === CONNECTION_TAB_TYPE.ACTIVE
    ? activeConnections.value
    : closedConnections.value
})

export const renderConnections = computed(() => {
  const searchRegex = connectionFilter.value ? toSearchRegex(connectionFilter.value) : null
  const hideRegex = quickFilterEnabled.value ? toSearchRegex(quickFilterRegex.value) : null
  const sourceIPFilterSet = sourceIPFilter.value === null ? null : new Set(sourceIPFilter.value)

  const shouldFilter = sourceIPFilterSet !== null || searchRegex !== null || hideRegex !== null
  const filteredConnections = shouldFilter
    ? connections.value.filter((conn) => {
        if (sourceIPFilterSet !== null && !sourceIPFilterSet.has(conn.metadata.sourceIP)) {
          return false
        }

        if (hideRegex === null && searchRegex === null) {
          return true
        }

        const searchFields = ensureConnectionDerivedData(conn).searchFields

        if (hideRegex && hideRegex.testAny(searchFields)) {
          return false
        }

        if (searchRegex) {
          return searchRegex.testAny(searchFields)
        }

        return true
      })
    : connections.value.slice()

  return filteredConnections.sort((a, b) => {
    if (isConnectionCard.value && isDesc.value) {
      ;[a, b] = [b, a]
    }
    const sortResult = isConnectionCard.value
      ? sortFunctionMap[connectionSortType.value](a, b)
      : sortFunctionMap[SORT_TYPE.HOST](a, b)

    if (sortResult === 0) {
      return a.id.localeCompare(b.id)
    }

    return sortResult
  })
})
