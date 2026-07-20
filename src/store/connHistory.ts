import {
  getConnectionChains,
  getConnectionDownload,
  getConnectionHostname,
  getConnectionSourceIP,
  getConnectionUpload,
  getProcessFromConnection,
} from '@/helper'
import {
  clearConnectionHistoryFromIndexedDB,
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
const allHistoryTypes: ConnectionHistoryType[] = [
  ConnectionHistoryType.SourceIP,
  ConnectionHistoryType.Destination,
  ConnectionHistoryType.Process,
  ConnectionHistoryType.Outbound,
  ConnectionHistoryType.ProxyGroup,
]

type AggregationMaps = Record<ConnectionHistoryType, Map<string, ConnectionHistoryData>>

// 内存态:每类型一个 Map,关闭连接到达时原地累加。非响应式 —— 原实现每拍对 5 张表
// 全量克隆 merge + JSON.stringify + IndexedDB 事务,这是常驻 CPU/磁盘的最大项之一。
const createAggregationMaps = (): AggregationMaps => ({
  [ConnectionHistoryType.SourceIP]: new Map<string, ConnectionHistoryData>(),
  [ConnectionHistoryType.Destination]: new Map<string, ConnectionHistoryData>(),
  [ConnectionHistoryType.Process]: new Map<string, ConnectionHistoryData>(),
  [ConnectionHistoryType.Outbound]: new Map<string, ConnectionHistoryData>(),
  [ConnectionHistoryType.ProxyGroup]: new Map<string, ConnectionHistoryData>(),
})

let aggMaps = createAggregationMaps()

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
let sessionGeneration = 0
let initEpoch = 0
let lastClearEpoch = 0
let dirty = false
const dirtyTypes = new Set<ConnectionHistoryType>()

interface InitContext {
  epoch: number
  uuid: string
  pending: Connection[]
}

let currentContext: InitContext | undefined
let persistenceQueue: Promise<void> = Promise.resolve()

const enqueuePersistence = <T>(operation: () => Promise<T>) => {
  const result = persistenceQueue.then(operation)

  persistenceQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

const markAllTypesDirty = () => {
  dirtyTypes.clear()
  for (const type of allHistoryTypes) {
    dirtyTypes.add(type)
  }
}

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

const trimMap = (maps: AggregationMaps, type: ConnectionHistoryType) => {
  const map = maps[type]

  if (map.size <= TRIM_THRESHOLD) {
    return false
  }
  const kept = Array.from(map.values())
    .sort((a, b) => b.download - a.download)
    .slice(0, TRIM_KEEP)

  map.clear()
  for (const item of kept) {
    map.set(item.key, item)
  }
  return true
}

const snapshotMaps = (
  maps: AggregationMaps,
): Record<ConnectionHistoryType, ConnectionHistoryData[]> =>
  Object.fromEntries(
    allHistoryTypes.map((type) => [type, Array.from(maps[type].values(), (item) => ({ ...item }))]),
  ) as Record<ConnectionHistoryType, ConnectionHistoryData[]>

const saveSnapshot = async (
  targetUuid: string,
  snapshot: Record<ConnectionHistoryType, ConnectionHistoryData[]>,
) => {
  let success = true

  for (const type of allHistoryTypes) {
    try {
      await saveConnectionHistoryToIndexedDB(targetUuid, type, snapshot[type])
    } catch (error) {
      success = false
      console.error(`Failed to save connection history for ${type}:`, error)
    }
  }
  return success
}

const flushCurrentSession = () => {
  if (!sessionUuid || !dirty) {
    return Promise.resolve()
  }

  for (const type of allHistoryTypes) {
    if (trimMap(aggMaps, type)) {
      dirtyTypes.add(type)
    }
  }

  // 在第一个 await 之前同时捕获 UUID 与全部数据,避免切后端时从共享 Map
  // 读到新会话的部分状态。对象也要克隆,因为后续累加会原地修改它们。
  const targetUuid = sessionUuid
  const targetGeneration = sessionGeneration
  const snapshot = snapshotMaps(aggMaps)

  dirty = false
  return enqueuePersistence(async () => {
    const success = await saveSnapshot(targetUuid, snapshot)

    if (!success && sessionUuid === targetUuid && sessionGeneration === targetGeneration) {
      dirty = true
    }
  })
}

const accumulateInto = (maps: AggregationMaps, connections: Connection[]) => {
  for (const type of allHistoryTypes) {
    const map = maps[type]

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
  }
}

const accumulateCurrent = (connections: Connection[]) => {
  accumulateInto(aggMaps, connections)
  markAllTypesDirty()
  dirty = true
}

const loadHistoryMaps = async (targetUuid: string) => {
  const maps = createAggregationMaps()

  for (const type of allHistoryTypes) {
    let data = await getConnectionHistoryFromIndexedDB(targetUuid, type)

    if (data.length > TRIM_THRESHOLD) {
      data = data.sort((a, b) => b.download - a.download).slice(0, TRIM_KEEP)
      await saveConnectionHistoryToIndexedDB(targetUuid, type, data)
    }

    for (const item of data) {
      maps[type].set(item.key, item)
    }
  }
  return maps
}

const resetCurrentSession = (targetUuid: string) => {
  ready = false
  sessionUuid = targetUuid
  sessionGeneration++
  aggMaps = createAggregationMaps()
  dirty = false
  viewTick = 0
  markAllTypesDirty()
  aggregatedDataMap.value = emptyView()
}

const settleStaleContext = async (context: InitContext, maps: AggregationMaps) => {
  if (!context.pending.length || context.epoch < lastClearEpoch) {
    return
  }

  const pending = context.pending.splice(0)

  if (currentContext && currentContext !== context && currentContext.uuid === context.uuid) {
    currentContext.pending.push(...pending)
    return
  }

  accumulateInto(maps, pending)
  const snapshot = snapshotMaps(maps)

  await enqueuePersistence(() => saveSnapshot(context.uuid, snapshot).then(() => undefined))
}

let viewTick = 0
setInterval(() => {
  if (!ready || document.hidden) {
    return
  }
  refreshView()
  if (++viewTick >= FLUSH_EVERY_TICKS) {
    viewTick = 0
    flushCurrentSession()
  }
}, VIEW_REFRESH_MS)

document.addEventListener('visibilitychange', () => {
  if (document.hidden && ready) {
    flushCurrentSession()
  }
})
window.addEventListener('pagehide', () => {
  if (ready) {
    flushCurrentSession()
  }
})

export const initAggregatedDataMap = async () => {
  flushCurrentSession()

  const context: InitContext = {
    epoch: ++initEpoch,
    uuid: uuid(),
    pending: [],
  }

  currentContext = context
  resetCurrentSession(context.uuid)

  const loadedMaps = await enqueuePersistence(() => loadHistoryMaps(context.uuid))

  if (context.epoch !== initEpoch) {
    await settleStaleContext(context, loadedMaps)
    return
  }

  aggMaps = loadedMaps
  ready = true
  if (context.pending.length) {
    accumulateCurrent(context.pending.splice(0))
  }
  if (currentContext === context) {
    currentContext = undefined
  }
  markAllTypesDirty()
  refreshView()
}

export const clearConnectionHistory = async () => {
  const context: InitContext = {
    epoch: ++initEpoch,
    uuid: uuid(),
    pending: [],
  }

  lastClearEpoch = context.epoch
  currentContext = context
  resetCurrentSession(context.uuid)

  // 清理与所有已排队的落盘/加载串行:先前的写入最多先完成,随后会被这次 clear
  // 统一删除,不会在 clear 之后又把旧快照写回。
  await enqueuePersistence(() => clearConnectionHistoryFromIndexedDB())

  if (context.epoch !== initEpoch) {
    await settleStaleContext(context, createAggregationMaps())
    return
  }

  ready = true
  if (context.pending.length) {
    accumulateCurrent(context.pending.splice(0))
  }
  if (currentContext === context) {
    currentContext = undefined
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

  const targetUuid = uuid()

  if (!ready || targetUuid !== sessionUuid) {
    // init 加载期间到达的关闭连接先缓冲,加载完成后统一并入,不丢数据
    if (currentContext?.uuid === targetUuid) {
      currentContext.pending.push(...newClosedConnections)
    }
    return
  }

  accumulateCurrent(newClosedConnections)
}
