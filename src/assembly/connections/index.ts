// 组装层 · connections 门面。连接流、断连/封锁动作,以及「原始连接数据 → view 字段」的
// 访问器与 getConnectionDisplayValue,按通道转交对应实现。
import { Channel, channel } from '@/assembly/backend'
import { CONNECTIONS_TABLE_ACCESSOR_KEY } from '@/constant'
import type { Connection } from '@/types'
import type { ConnectionDisplayOptions, ConnectionsSnapshot } from './accessor'
import * as clash from './clash'
import * as dae from './dae'

export type { ConnectionsSnapshot }

const backend = () => (channel.value === Channel.Dae ? dae : clash)

export const disconnectByIdAPI = (id: string) => backend().disconnectByIdAPI(id)

export const disconnectAllAPI = () => backend().disconnectAllAPI()

export const fetchConnectionsAPI = () => backend().fetchConnectionsAPI()

// 连接字段访问器(直接读取原始数据)。
export const connectionAccessor = () => backend().connectionAccessor

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
