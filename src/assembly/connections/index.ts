// 组装层 · connections 门面。连接流、断连/封锁动作,以及「原始连接数据 → view 字段」的
// 访问器与 getConnectionDisplayValue,都按后端类型动态路由到对应实现。
import { isSingboxBackend } from '@/assembly/backend'
import { CONNECTIONS_TABLE_ACCESSOR_KEY } from '@/constant'
import type { Connection } from '@/types'
import type { ConnectionDisplayOptions, ConnectionsSnapshot } from './accessor'
import * as clash from './clash'
import * as singbox from './singbox'

export type { ConnectionsSnapshot }

const backend = () => (isSingboxBackend.value ? singbox : clash)

export const disconnectByIdAPI = (id: string) => backend().disconnectByIdAPI(id)

export const disconnectAllAPI = () => backend().disconnectAllAPI()

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
