import {
  activeConnections,
  closedConnections,
  getConnectionVisibleSearchValues,
} from '@/assembly/connections'
import { useStorage } from '@/composables/use-storage'
import {
  CONNECTION_SEARCHABLE_KEYS,
  CONNECTION_TAB_TYPE,
  SORT_DIRECTION,
  SORT_TYPE,
  isConnectionGroupableKey,
  type ConnectionGroupableKey,
} from '@/constant'
import {
  getChainsStringFromConnection,
  getConnectionDownload,
  getConnectionRule,
  getConnectionSourceIP,
  getConnectionStart,
  getConnectionUpload,
  getHostFromConnection,
  getInboundUserFromConnection,
  getNetworkTypeFromConnection,
} from '@/helper'
import { toSearchRegex } from '@/helper/search'
import type { Connection } from '@/types'
import { computed, ref } from 'vue'
import {
  connectionCardLines,
  connectionTableColumns,
  isConnectionCard,
  proxyChainDirection,
  showFullProxyChain,
} from './settings'

export const connectionTabShow = ref(CONNECTION_TAB_TYPE.ACTIVE)
export const showClosedOnly = useStorage<boolean>('config/connection-show-closed-only', false)
export const isClosedOnlyView = computed(
  () => connectionTabShow.value === CONNECTION_TAB_TYPE.ALL && showClosedOnly.value,
)
export const connectionSortType = useStorage<SORT_TYPE>(
  'config/connection-sort-type',
  SORT_TYPE.HOST,
)
export const connectionSortDirection = useStorage<SORT_DIRECTION>(
  'config/connection-sort-direction',
  SORT_DIRECTION.ASC,
)
export const connectionCardGroupKey = useStorage<ConnectionGroupableKey | null>(
  'config/connection-card-group-key',
  null,
)

if (
  connectionCardGroupKey.value !== null &&
  !isConnectionGroupableKey(connectionCardGroupKey.value)
) {
  connectionCardGroupKey.value = null
}

export const quickFilterRegex = useStorage<string>('config/quick-filter-regex', 'direct|dns-out')
export const quickFilterEnabled = useStorage<boolean>('config/quick-filter-enabled', false)
export const connectionFilter = ref('')
export const searchHiddenColumns = useStorage<boolean>('config/search-hidden-columns', false)
export const sourceIPFilter = ref<string[] | null>(null)

const isDesc = computed(() => {
  return connectionSortDirection.value === SORT_DIRECTION.DESC
})

const sortKeyFunctionMap: Record<SORT_TYPE, (connection: Connection) => string | number> = {
  [SORT_TYPE.HOST]: getHostFromConnection,
  [SORT_TYPE.RULE]: getConnectionRule,
  [SORT_TYPE.CHAINS]: getChainsStringFromConnection,
  [SORT_TYPE.DOWNLOAD]: getConnectionDownload,
  [SORT_TYPE.DOWNLOAD_SPEED]: (connection) => connection.downloadSpeed,
  [SORT_TYPE.UPLOAD]: getConnectionUpload,
  [SORT_TYPE.UPLOAD_SPEED]: (connection) => connection.uploadSpeed,
  [SORT_TYPE.SOURCE_IP]: getConnectionSourceIP,
  [SORT_TYPE.TYPE]: getNetworkTypeFromConnection,
  [SORT_TYPE.CONNECT_TIME]: (connection) => {
    const start = getConnectionStart(connection)

    if (typeof start === 'number') {
      return start
    }
    const parsed = Date.parse(start)

    return Number.isNaN(parsed) ? 0 : parsed
  },
  [SORT_TYPE.INBOUND_USER]: getInboundUserFromConnection,
}

export const connections = computed(() => {
  if (connectionTabShow.value === CONNECTION_TAB_TYPE.ACTIVE) {
    return activeConnections.value
  }

  return showClosedOnly.value
    ? closedConnections.value
    : closedConnections.value.concat(activeConnections.value)
})

const closedConnectionIds = computed(() => new Set(closedConnections.value.map((conn) => conn.id)))

export const isClosedConnection = (connection: Connection) =>
  closedConnectionIds.value.has(connection.id)

const filterConnections = (items: readonly Connection[]) => {
  const searchRegex = toSearchRegex(connectionFilter.value)
  const hideRegex = quickFilterEnabled.value ? toSearchRegex(quickFilterRegex.value) : null
  const sourceIPs = sourceIPFilter.value
  const needSearchValues = Boolean(searchRegex || hideRegex)
  const displayOptions = {
    mode: isConnectionCard.value ? ('card' as const) : ('table' as const),
    proxyChainDirection: proxyChainDirection.value,
    showFullProxyChain: showFullProxyChain.value,
  }
  const visibleKeys = isConnectionCard.value
    ? connectionCardLines.value.flat()
    : connectionTableColumns.value
  const searchKeys = searchHiddenColumns.value ? CONNECTION_SEARCHABLE_KEYS : visibleKeys

  return items.filter((conn) => {
    if (sourceIPs !== null && sourceIPs.every((i) => i !== getConnectionSourceIP(conn))) {
      return false
    }

    if (!needSearchValues) {
      return true
    }

    const allValues = hideRegex
      ? getConnectionVisibleSearchValues(conn, CONNECTION_SEARCHABLE_KEYS, displayOptions)
      : null

    if (allValues && hideRegex?.testAny(allValues)) {
      return false
    }

    if (searchRegex) {
      return searchRegex.testAny(
        searchKeys === CONNECTION_SEARCHABLE_KEYS && allValues
          ? allValues
          : getConnectionVisibleSearchValues(conn, searchKeys, displayOptions),
      )
    }

    return true
  })
}

export const filteredActiveConnections = computed(() => filterConnections(activeConnections.value))

export const renderConnections = computed(() => {
  const filtered = filterConnections(connections.value)

  const sortType = isConnectionCard.value ? connectionSortType.value : SORT_TYPE.HOST
  const getSortKey = sortKeyFunctionMap[sortType]
  const desc = isConnectionCard.value && isDesc.value
  const decorated: [string | number, string, Connection][] = filtered.map((conn) => [
    getSortKey(conn),
    conn.id,
    conn,
  ])

  decorated.sort((x, y) => {
    const a = desc ? y : x
    const b = desc ? x : y
    const keyA = a[0]
    const keyB = b[0]
    let result = 0

    if (typeof keyA === 'number') {
      result = keyA - (keyB as number)
    } else {
      result = keyA.localeCompare(keyB as string)
    }

    if (result === 0) {
      result = a[1].localeCompare(b[1])
    }

    return result
  })

  return decorated.map((item) => item[2])
})
