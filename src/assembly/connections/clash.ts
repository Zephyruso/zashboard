// Clash WS 后端的连接流、断连动作,以及「原始 Clash 连接数据 → view 字段」的访问器。
import { createClashWebSocket, disconnectAllClashAPI, disconnectClashByIdAPI } from '@/api/clash'
import { proxyMap } from '@/assembly/proxies'
import { PROXY_TYPE } from '@/constant'
import type { ClashConnectionRawMessage, Connection } from '@/types'
import { head } from 'lodash'
import { shallowRef, watch } from 'vue'
import {
  createGetConnectionDisplayValue,
  createGetConnectionVisibleSearchValues,
  type ConnectionAccessor,
  type ConnectionsSnapshot,
} from './accessor'

export const disconnectByIdAPI = disconnectClashByIdAPI

export const disconnectAllAPI = disconnectAllClashAPI

// Clash WS 每拍推送活跃连接全量快照。瞬时速率与已关闭连接需与上一拍 diff 求得 —— 这是 clash
// 协议固有的内部细节,在此完成,对外只暴露统一的 ConnectionsSnapshot。
export const fetchConnectionsAPI = () => {
  const ws = createClashWebSocket<{
    connections: ClashConnectionRawMessage[]
    downloadTotal: number
    uploadTotal: number
    memory: number
  }>('connections')

  const data = shallowRef<ConnectionsSnapshot>()
  let previousMap = new Map<string, Connection>()

  const unwatch = watch(ws.data, (raw) => {
    if (!raw) return

    const currentMap = new Map<string, Connection>()
    const active = (raw.connections ?? []).map((conn) => {
      const connection = conn as Connection
      const pre = previousMap.get(connection.id)

      if (!pre) {
        connection.downloadSpeed = 0
        connection.uploadSpeed = 0
      } else {
        connection.downloadSpeed = asClash(connection).download - asClash(pre).download
        connection.uploadSpeed = asClash(connection).upload - asClash(pre).upload
      }

      previousMap.delete(connection.id)
      currentMap.set(connection.id, connection)
      return connection
    })

    // 上一拍存在、这一拍消失的连接即新关闭。
    const closed = Array.from(previousMap.values())
    previousMap = currentMap

    data.value = {
      active,
      closed,
      downloadTotal: raw.downloadTotal,
      uploadTotal: raw.uploadTotal,
    }
  })

  return {
    data,
    close: () => {
      unwatch()
      ws.close()
    },
  }
}

const asClash = (connection: Connection) => connection as ClashConnectionRawMessage

const getNetwork = (c: ClashConnectionRawMessage) => {
  const { destinationPort, sniffHost, network } = c.metadata

  if ((destinationPort === '443' || sniffHost) && network === 'udp') {
    return 'quic'
  }

  return network
}

const getHostname = (c: ClashConnectionRawMessage) =>
  c.metadata.host || c.metadata.sniffHost || c.metadata.destinationIP

export const connectionAccessor: ConnectionAccessor = {
  chains: (connection) => asClash(connection).chains,
  download: (connection) => asClash(connection).download,
  upload: (connection) => asClash(connection).upload,
  start: (connection) => asClash(connection).start,
  rule: (connection) => {
    const clash = asClash(connection)

    return clash.rulePayload ? `${clash.rule}: ${clash.rulePayload}` : clash.rule
  },
  rulePayload: (connection) => asClash(connection).rulePayload,
  sourceIP: (connection) => asClash(connection).metadata.sourceIP,
  sourcePort: (connection) => asClash(connection).metadata.sourcePort,
  network: (connection) => getNetwork(asClash(connection)),
  networkType: (connection) => {
    const clash = asClash(connection)

    return `${clash.metadata.type} | ${getNetwork(clash)}`
  },
  hostname: (connection) => getHostname(asClash(connection)),
  host: (connection) => {
    const clash = asClash(connection)
    const host = getHostname(clash)

    if (host.includes(':')) {
      return `[${host}]:${clash.metadata.destinationPort}`
    }
    return `${host}:${clash.metadata.destinationPort}`
  },
  process: (connection) => {
    const { metadata } = asClash(connection)

    return metadata.process || metadata.processPath.replace(/^.*[/\\](.*)$/, '$1') || '-'
  },
  destination: (connection) => {
    const clash = asClash(connection)
    const finalProxyType = proxyMap.value[head(clash.chains) || '']?.type.toLowerCase()

    if (finalProxyType === PROXY_TYPE.Direct && clash.metadata.remoteDestination) {
      return clash.metadata.remoteDestination
    }

    return clash.metadata.destinationIP || clash.metadata.host
  },
  inboundUser: (connection) => {
    const { metadata } = asClash(connection)

    return metadata.inboundUser || metadata.inboundName || metadata.inboundPort || '-'
  },
  sniffHost: (connection) => asClash(connection).metadata.sniffHost,
  remoteAddress: (connection) => asClash(connection).metadata.remoteDestination,
  // clash 不提供这些字段。
  protocol: () => '',
  outboundType: () => '',
  fromOutbound: () => '',
  smartBlock: (connection) => asClash(connection).metadata.smartBlock,
}

export const getConnectionDisplayValue = createGetConnectionDisplayValue(connectionAccessor)

export const getConnectionVisibleSearchValues =
  createGetConnectionVisibleSearchValues(connectionAccessor)
