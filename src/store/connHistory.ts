import {
  getConnectionChains,
  getConnectionDownload,
  getConnectionHostname,
  getConnectionSourceIP,
  getConnectionUpload,
  getProcessFromConnection,
} from '@/helper'
import {
  ConnectionHistoryType,
  getConnectionHistoryFromIndexedDB,
  saveConnectionHistoryToIndexedDB,
  type ConnectionHistoryData,
} from '@/helper/indexeddb'
import type { Connection } from '@/types'
import ipaddr from 'ipaddr.js'
import { shallowRef } from 'vue'
import { activeBackend } from './setup'

const uuid = () => activeBackend.value?.uuid || ''
const allHistoryTypes = [
  ConnectionHistoryType.SourceIP,
  ConnectionHistoryType.Destination,
  ConnectionHistoryType.Process,
  ConnectionHistoryType.Outbound,
  ConnectionHistoryType.ProxyGroup,
]

// 内存态:每类型一个 Map,关闭连接到达时原地累加。非响应式 —— 原实现每拍对 5 张表
// 全量克隆 merge + JSON.stringify + IndexedDB 事务,这是常驻 CPU/磁盘的最大项之一。
const aggMaps = {
  [ConnectionHistoryType.SourceIP]: new Map<string, ConnectionHistoryData>(),
  [ConnectionHistoryType.Destination]: new Map<string, ConnectionHistoryData>(),
  [ConnectionHistoryType.Process]: new Map<string, ConnectionHistoryData>(),
  [ConnectionHistoryType.Outbound]: new Map<string, ConnectionHistoryData>(),
  [ConnectionHistoryType.ProxyGroup]: new Map<string, ConnectionHistoryData>(),
} as Record<ConnectionHistoryType, Map<string, ConnectionHistoryData>>

const emptyView = (): Record<ConnectionHistoryType, ConnectionHistoryData[]> => ({
  [ConnectionHistoryType.SourceIP]: [],
  [ConnectionHistoryType.Destination]: [],
  [ConnectionHistoryType.Process]: [],
  [ConnectionHistoryType.Outbound]: [],
  [ConnectionHistoryType.ProxyGroup]: [],
})

// 展示态:由内存态每 5s 重建数组的视图,整体换引用(shallowRef 语义)。
export const aggregatedDataMap = shallowRef(emptyView())

const VIEW_REFRESH_MS = 5_000
// 6 个视图节拍落一次盘 = 30s;hidden/pagehide 兜底 flush。
const FLUSH_EVERY_TICKS = 6
// 与 init 修剪同规则:超过 2000 键按下载量保留前 1500,运行期同样执行,防会话内无界增长。
const TRIM_THRESHOLD = 2000
const TRIM_KEEP = 1500

let ready = false
let sessionUuid = ''
let initEpoch = 0
let pendingClosed: Connection[] = []
let dirtySinceFlush = false
const dirtyTypes = new Set<ConnectionHistoryType>()

const refreshView = () => {
  if (!dirtyTypes.size) {
    return
  }
  const next = { ...aggregatedDataMap.value }

  for (const type of dirtyTypes) {
    next[type] = Array.from(aggMaps[type].values())
  }
  dirtyTypes.clear()
  aggregatedDataMap.value = next
}

const trimMap = (type: ConnectionHistoryType) => {
  const map = aggMaps[type]

  if (map.size <= TRIM_THRESHOLD) {
    return
  }
  const kept = Array.from(map.values())
    .sort((a, b) => b.download - a.download)
    .slice(0, TRIM_KEEP)

  map.clear()
  for (const item of kept) {
    map.set(item.key, item)
  }
  dirtyTypes.add(type)
}

const flushToIDB = async (targetUuid: string) => {
  if (!targetUuid || !dirtySinceFlush) {
    return
  }
  dirtySinceFlush = false

  for (const type of allHistoryTypes) {
    try {
      trimMap(type)
      await saveConnectionHistoryToIndexedDB(targetUuid, type, Array.from(aggMaps[type].values()))
    } catch (error) {
      console.error(`Failed to save connection history for ${type}:`, error)
    }
  }
}

const accumulate = (connections: Connection[]) => {
  for (const type of allHistoryTypes) {
    const map = aggMaps[type]

    for (const item of aggregateConnections(connections, type)) {
      const existing = map.get(item.key)

      if (existing) {
        existing.download += item.download
        existing.upload += item.upload
        existing.count += item.count
      } else {
        map.set(item.key, item)
      }
    }
    dirtyTypes.add(type)
  }
  dirtySinceFlush = true
}

let viewTick = 0
setInterval(() => {
  if (!ready || document.hidden) {
    return
  }
  refreshView()
  if (++viewTick >= FLUSH_EVERY_TICKS) {
    viewTick = 0
    flushToIDB(sessionUuid)
  }
}, VIEW_REFRESH_MS)

document.addEventListener('visibilitychange', () => {
  if (document.hidden && ready) {
    flushToIDB(sessionUuid)
  }
})
window.addEventListener('pagehide', () => {
  if (ready) {
    flushToIDB(sessionUuid)
  }
})

export const initAggregatedDataMap = async () => {
  const epoch = ++initEpoch
  const previousUuid = sessionUuid

  ready = false
  // 旧后端的未落盘增量先写掉(uuid 用旧会话捕获值,避免切换瞬间串库)
  await flushToIDB(previousUuid)
  if (epoch !== initEpoch) {
    return
  }

  pendingClosed = []
  sessionUuid = uuid()
  for (const type of allHistoryTypes) {
    aggMaps[type].clear()
    dirtyTypes.add(type)
  }

  for (const type of allHistoryTypes) {
    let data = await getConnectionHistoryFromIndexedDB(sessionUuid, type)

    if (epoch !== initEpoch) {
      return
    }

    if (data.length > TRIM_THRESHOLD) {
      data = data.sort((a, b) => b.download - a.download).slice(0, TRIM_KEEP)
      await saveConnectionHistoryToIndexedDB(sessionUuid, type, data)
      if (epoch !== initEpoch) {
        return
      }
    }

    const map = aggMaps[type]

    for (const item of data) {
      map.set(item.key, item)
    }
  }

  ready = true
  if (pendingClosed.length) {
    const buffered = pendingClosed

    pendingClosed = []
    accumulate(buffered)
  }
  refreshView()
}

export const aggregateConnections = (
  connections: Connection[],
  type: ConnectionHistoryType,
): ConnectionHistoryData[] => {
  const map = new Map<string, ConnectionHistoryData>()

  connections.forEach((connection) => {
    let key: string = ''

    if (type === ConnectionHistoryType.SourceIP) {
      key = getConnectionSourceIP(connection)
    } else if (type === ConnectionHistoryType.Destination) {
      const hostkey = getConnectionHostname(connection)
      if (ipaddr.IPv4.isValid(hostkey) || ipaddr.IPv6.isValid(hostkey)) {
        key = hostkey
      } else {
        key = hostkey.split('.').slice(-2).join('.')
      }
    } else if (type === ConnectionHistoryType.Process) {
      key = getProcessFromConnection(connection)
    } else if (type === ConnectionHistoryType.Outbound) {
      key = getConnectionChains(connection)[0] || '-'
    } else if (type === ConnectionHistoryType.ProxyGroup) {
      const chains = getConnectionChains(connection)
      key = chains[chains.length - 1] || '-'
    }

    if (map.has(key)) {
      const existing = map.get(key)!
      existing.download += getConnectionDownload(connection)
      existing.upload += getConnectionUpload(connection)
      existing.count += 1
    } else {
      map.set(key, {
        key,
        download: getConnectionDownload(connection),
        upload: getConnectionUpload(connection),
        count: 1,
      })
    }
  })

  return Array.from(map.values())
}

export const mergeAggregatedData = (
  historical: ConnectionHistoryData[],
  newData: ConnectionHistoryData[],
): ConnectionHistoryData[] => {
  const map = new Map<string, ConnectionHistoryData>()

  // 历史项直接复用引用,仅 key 碰撞项克隆 —— 全量克隆是无谓 GC,
  // 而就地叠加会把当拍数据写坏进历史对象(按秒复利),两个坑都要躲。
  for (const item of historical) {
    map.set(item.key, item)
  }

  for (const item of newData) {
    const existing = map.get(item.key)

    if (existing) {
      map.set(item.key, {
        key: existing.key,
        download: existing.download + item.download,
        upload: existing.upload + item.upload,
        count: existing.count + item.count,
      })
    } else {
      map.set(item.key, { ...item })
    }
  }

  return Array.from(map.values())
}

export const saveConnectionHistory = (newClosedConnections: Connection[]) => {
  if (newClosedConnections.length === 0) {
    return
  }

  if (!ready) {
    // init 加载期间到达的关闭连接先缓冲,加载完成后统一并入,不丢数据
    pendingClosed.push(...newClosedConnections)
    return
  }

  accumulate(newClosedConnections)
}
