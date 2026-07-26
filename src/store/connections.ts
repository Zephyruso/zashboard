import {
  disconnectByIdAPI,
  fetchConnectionsAPI,
  getConnectionVisibleSearchValues,
} from '@/assembly/connections'
import { CONNECTION_TAB_TYPE, SORT_DIRECTION, SORT_TYPE } from '@/constant'
import {
  getChainsStringFromConnection,
  getConnectionDownload,
  getConnectionNetwork,
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
import { useStorage, watchOnce } from '@vueuse/core'
import dayjs from 'dayjs'
import { computed, ref, shallowRef, watch } from 'vue'
import { initAggregatedDataMap, saveConnectionHistory } from './connHistory'
import {
  autoDisconnectIdleUDP,
  autoDisconnectIdleUDPTime,
  connectionCardLines,
  connectionTableColumns,
  isConnectionCard,
  proxyChainDirection,
  showFullProxyChain,
} from './settings'

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

// 每拍整体换引用、元素不可变的管道:深 ref 会为每拍数千个一次性对象建 Proxy 与依赖记录,
// shallowRef 才是与该数据流语义吻合的粒度。
export const activeConnections = shallowRef<Connection[]>([])
export const closedConnections = shallowRef<Connection[]>([])
export const isPaused = ref(false)

// 内核自启动的上/下行总量。clash 随连接 WS 消息携带,在下方快照 watch 写入;
// sing-box 的连接流不带总量,由 status 统计流经 store/overview 的 traffic watch 写入。
export const downloadTotal = ref(0)
export const uploadTotal = ref(0)

let cancel: (() => void) | undefined

export const initConnections = () => {
  cancel?.()
  activeConnections.value = []
  closedConnections.value = []
  downloadTotal.value = 0
  uploadTotal.value = 0
  initAggregatedDataMap()
  // active(已带瞬时速率)与 closed(本拍新关闭增量)均由各后端 assembly 算好,store 只消费。
  const ws = fetchConnectionsAPI()
  const unwatch = watch(ws.data, (snapshot) => {
    if (!snapshot) return

    if (snapshot.downloadTotal != null && snapshot.uploadTotal != null) {
      downloadTotal.value = snapshot.downloadTotal
      uploadTotal.value = snapshot.uploadTotal
    }

    if (isPaused.value) {
      return
    }

    activeConnections.value = snapshot.active

    if (snapshot.closed.length > 0) {
      closedConnections.value = closedConnections.value.concat(snapshot.closed).slice(-500)
      saveConnectionHistory(snapshot.closed)
    }
  })

  if (autoDisconnectIdleUDP.value) {
    watchOnce(activeConnections, () => {
      activeConnections.value
        .filter((conn) => getConnectionNetwork(conn) !== 'tcp')
        .forEach((conn) => {
          const now = dayjs()
          const start = dayjs(getConnectionStart(conn))

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

export const stopConnections = () => {
  cancel?.()
  cancel = undefined
}

const isDesc = computed(() => {
  return connectionSortDirection.value === SORT_DIRECTION.DESC
})

// 排序键提取器:每条连接每拍只算一次键,替代在 O(N log N) 次比较里反复构串/建 dayjs。
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
    // clash 的 start 是 ISO 串,sing-box 已是数值时间戳
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
  return connectionTabShow.value === CONNECTION_TAB_TYPE.ACTIVE
    ? activeConnections.value
    : closedConnections.value
})

export const renderConnections = computed(() => {
  const searchRegex = toSearchRegex(connectionFilter.value)
  const hideRegex = quickFilterEnabled.value ? toSearchRegex(quickFilterRegex.value) : null
  const sourceIPs = sourceIPFilter.value
  // 无正则过滤时跳过搜索串构建:那是每拍每连接十余次字符串/dayjs 分配的大头
  const needSearchValues = Boolean(searchRegex || hideRegex)
  const displayOptions = {
    mode: isConnectionCard.value ? ('card' as const) : ('table' as const),
    proxyChainDirection: proxyChainDirection.value,
    showFullProxyChain: showFullProxyChain.value,
  }
  const visibleKeys = isConnectionCard.value
    ? connectionCardLines.value.flat()
    : connectionTableColumns.value

  const filtered = connections.value.filter((conn) => {
    if (sourceIPs !== null && sourceIPs.every((i) => i !== getConnectionSourceIP(conn))) {
      return false
    }

    if (!needSearchValues) {
      return true
    }

    const visibleValues = getConnectionVisibleSearchValues(conn, visibleKeys, displayOptions)

    if (hideRegex?.testAny(visibleValues)) {
      return false
    }

    if (searchRegex) {
      return searchRegex.testAny(visibleValues)
    }

    return true
  })

  const sortType = isConnectionCard.value ? connectionSortType.value : SORT_TYPE.HOST
  const getSortKey = sortKeyFunctionMap[sortType]
  const desc = isConnectionCard.value && isDesc.value
  const decorated: [string | number, string, Connection][] = filtered.map((conn) => [
    getSortKey(conn),
    conn.id,
    conn,
  ])

  decorated.sort((x, y) => {
    // desc 连同 id tie-break 一起反转,与原比较器语义一致
    const a = desc ? y : x
    const b = desc ? x : y
    const keyA = a[0]
    const keyB = b[0]
    let result = 0

    if (typeof keyA === 'number') {
      result = keyA - (keyB as number)
    } else {
      // 保留原 localeCompare 的语义(含大小写/非 ASCII 代理名),只移除比较器内的键构建。
      result = keyA.localeCompare(keyB as string)
    }

    if (result === 0) {
      result = a[1].localeCompare(b[1])
    }

    return result
  })

  return decorated.map((item) => item[2])
})
