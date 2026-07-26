// 组装层 · connection 字段访问器。
// 每种后端(clash / sing-box native)各实现一份 ConnectionAccessor,直接从「原始数据」
// 读取/派生 view 需要的字段 —— 不再把 sing-box 塑造成 clash 形状。
// createGetConnectionDisplayValue 基于某一份 accessor 生成对应后端的 getConnectionDisplayValue,
// 由 index.ts 门面按当前后端动态选用。
import { getGeoIPInfoSync } from '@/api/geoip'
import { CONNECTIONS_TABLE_ACCESSOR_KEY, PROXY_CHAIN_DIRECTION } from '@/constant'
import { getIPLabelFromMap } from '@/helper/sourceip'
import { fromNow, prettyBytesHelper } from '@/helper/utils'
import type { Connection } from '@/types'
import * as ipaddr from 'ipaddr.js'

export type ConnectionDisplayOptions = {
  mode: 'card' | 'table'
  proxyChainDirection: PROXY_CHAIN_DIRECTION | string
  showFullProxyChain: boolean
}

// 各后端连接流统一产出的快照。active/closed 的归类与瞬时速率均由各后端 assembly 内部算好,
// store 直接消费,无需再做快照 diff(那只是 clash 全量快照的内部细节)。
export interface ConnectionsSnapshot {
  // 当前活跃连接,已带瞬时速率(downloadSpeed/uploadSpeed)。
  active: Connection[]
  // 本拍新关闭的连接(增量),供 store 追加进已关闭列表并落历史。
  closed: Connection[]
  // 内核自启动的上/下行累计。clash 的连接 WS 消息原生携带,在此透传;
  // sing-box 的连接流不带总量,由 status 统计流另行提供(见 store/overview)。
  downloadTotal?: number
  uploadTotal?: number
}

// 各后端原始数据 → view 字段的读取契约。实现内部按各自后端的原始类型取值。
export interface ConnectionAccessor {
  chains(connection: Connection): string[]
  download(connection: Connection): number
  upload(connection: Connection): number
  start(connection: Connection): string | number
  rule(connection: Connection): string
  rulePayload(connection: Connection): string
  sourceIP(connection: Connection): string
  sourcePort(connection: Connection): string
  network(connection: Connection): string
  networkType(connection: Connection): string
  // 目的地主机名,裸值(无端口、无 IPv6 方括号),供聚合/分组按主机归类。
  hostname(connection: Connection): string
  // 目的地 `host:port`(IPv6 加方括号),供展示。
  host(connection: Connection): string
  process(connection: Connection): string
  destination(connection: Connection): string
  inboundUser(connection: Connection): string
  sniffHost(connection: Connection): string
  remoteAddress(connection: Connection): string
  // 以下三项为 sing-box 原生字段;clash 无对应数据,返回空串(展示为 '-')。
  protocol(connection: Connection): string
  outboundType(connection: Connection): string
  fromOutbound(connection: Connection): string
  // 仅 clash 支持的 smart 降级标记;sing-box 返回 undefined。
  smartBlock(connection: Connection): string | undefined
}

const getDestinationType = (destination: string) => {
  if (ipaddr.IPv4.isIPv4(destination)) {
    return 'IPv4'
  } else if (ipaddr.IPv6.isIPv6(destination)) {
    return 'IPv6'
  } else {
    return 'FQDN'
  }
}

const getVisibleChains = (
  accessor: ConnectionAccessor,
  connection: Connection,
  options: ConnectionDisplayOptions,
) => {
  let chains = accessor.chains(connection)

  if ((options.mode === 'card' || !options.showFullProxyChain) && chains.length > 2) {
    chains = [chains[0], chains[chains.length - 1]]
  }

  return options.proxyChainDirection === PROXY_CHAIN_DIRECTION.REVERSE
    ? chains
    : [...chains].reverse()
}

export const createGetConnectionDisplayValue =
  (accessor: ConnectionAccessor) =>
  (
    connection: Connection,
    key: CONNECTIONS_TABLE_ACCESSOR_KEY,
    options: ConnectionDisplayOptions,
  ) => {
    switch (key) {
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Type:
        return accessor.networkType(connection)
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Process:
        return accessor.process(connection)
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Host:
        return accessor.host(connection)
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Rule:
        return accessor.rule(connection)
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Chains:
        return getVisibleChains(accessor, connection, options).join(' → ')
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound:
        return accessor.chains(connection)[0] || ''
      case CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed:
        return `${prettyBytesHelper(connection.downloadSpeed)}/s`
      case CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed:
        return `${prettyBytesHelper(connection.uploadSpeed)}/s`
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Download:
        return prettyBytesHelper(accessor.download(connection))
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Upload:
        return prettyBytesHelper(accessor.upload(connection))
      case CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime:
        return fromNow(accessor.start(connection))
      case CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP:
        return getIPLabelFromMap(accessor.sourceIP(connection))
      case CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort:
        return accessor.sourcePort(connection)
      case CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost:
        return accessor.sniffHost(connection) || '-'
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Destination:
        return accessor.destination(connection)
      case CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType:
        return getDestinationType(accessor.destination(connection))
      case CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP: {
        const { country, organization } = getGeoIPInfoSync(accessor.destination(connection))

        return [country, organization].filter(Boolean).join(' / ')
      }
      case CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress:
        return accessor.remoteAddress(connection) || '-'
      case CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser:
        return accessor.inboundUser(connection)
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Protocol:
        return accessor.protocol(connection) || '-'
      case CONNECTIONS_TABLE_ACCESSOR_KEY.OutboundType:
        return accessor.outboundType(connection) || '-'
      case CONNECTIONS_TABLE_ACCESSOR_KEY.FromOutbound:
        return accessor.fromOutbound(connection) || '-'
      case CONNECTIONS_TABLE_ACCESSOR_KEY.Close:
        return ''
    }
  }

export const createGetConnectionVisibleSearchValues = (accessor: ConnectionAccessor) => {
  // getDisplayValue 在工厂层建一次、keys 过滤结果按引用缓存 —— 二者原先都在
  // 每条连接的每次调用里重建,每拍数千次纯浪费。
  const getDisplayValue = createGetConnectionDisplayValue(accessor)
  let lastKeys: CONNECTIONS_TABLE_ACCESSOR_KEY[] | null = null
  let visibleKeys: CONNECTIONS_TABLE_ACCESSOR_KEY[] = []

  return (
    connection: Connection,
    keys: CONNECTIONS_TABLE_ACCESSOR_KEY[],
    options: ConnectionDisplayOptions,
  ) => {
    if (keys !== lastKeys) {
      lastKeys = keys
      visibleKeys = keys.filter((key) => key !== CONNECTIONS_TABLE_ACCESSOR_KEY.Close)
    }

    return visibleKeys.map((key) => getDisplayValue(connection, key, options))
  }
}
