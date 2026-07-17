// 组装层 · connections 门面。连接流、断连/封锁动作,以及「原始连接数据 → view 字段」的
// 访问器与 getConnectionDisplayValue,都按后端类型动态路由到对应实现。
import { isSingboxBackend } from '@/assembly/backend'
import { CONNECTIONS_TABLE_ACCESSOR_KEY } from '@/constant'
import type { Connection } from '@/types'
import pLimit from 'p-limit'
import type { ConnectionDisplayOptions, ConnectionsSnapshot } from './accessor'
import * as clash from './clash'

export type { ConnectionsSnapshot }

// sing-box 实现(连同 gRPC 栈 ~130KB)按需加载,clash 用户不再买单。
// 访问器是同步热路径,故用「init 前预载 + 同步委派」而非逐调用动态 import。
let singboxModule: typeof import('./singbox') | null = null

export const preloadConnectionsBackend = async () => {
  if (isSingboxBackend.value && !singboxModule) {
    singboxModule = await import('./singbox')
  }
}

const backend = () => {
  if (!isSingboxBackend.value) {
    return clash
  }
  if (!singboxModule) {
    throw new Error('sing-box connections backend not preloaded')
  }
  return singboxModule
}

export const disconnectByIdAPI = (id: string) => backend().disconnectByIdAPI(id)

export const disconnectAllAPI = () => backend().disconnectAllAPI()

const disconnectLimiter = pLimit(12)

// 批量断开的统一入口:匹配集即全量时直接走批量端点;否则并发池限流 ——
// 逐条无限流的断开(自动断开/禁用规则/关闭全部)一次可瞬发上千请求,
// 把同源 HTTP/1.1 六并发队列塞死数秒。
export const disconnectConnections = async (conns: Connection[], totalActive?: number) => {
  if (!conns.length) {
    return
  }

  if (totalActive !== undefined && totalActive > 0 && conns.length === totalActive) {
    await disconnectAllAPI()
    return
  }

  await Promise.allSettled(
    conns.map((conn) =>
      disconnectLimiter(async () => {
        await disconnectByIdAPI(conn.id)
      }),
    ),
  )
}

export const fetchConnectionsAPI = () => backend().fetchConnectionsAPI()

// 当前后端的连接字段访问器(直接读取原始数据,不做 clash 形状化)。
export const connectionAccessor = () => backend().connectionAccessor

// 动态选用当前后端的 getConnectionDisplayValue。
export const getConnectionDisplayValue = (
  connection: Connection,
  key: CONNECTIONS_TABLE_ACCESSOR_KEY,
  options: ConnectionDisplayOptions,
) => backend().getConnectionDisplayValue(connection, key, options)

export const getConnectionVisibleSearchValues = (
  connection: Connection,
  keys: CONNECTIONS_TABLE_ACCESSOR_KEY[],
  options: ConnectionDisplayOptions,
) => backend().getConnectionVisibleSearchValues(connection, keys, options)

// 连接封锁动作(Clash 专属),经 connections 域门面暴露给 view。
export { blockConnectionByIdAPI } from '@/api/clash'
