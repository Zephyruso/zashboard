// sing-box native 后端的连接组装:订阅 gRPC SubscribeConnections,把 protobuf 事件
// 维护成活跃连接表,并直接产出统一的 ConnectionsSnapshot(active 带瞬时速率、closed 为本拍增量)。
// 速率由事件自带的 uplinkDelta/downlinkDelta 累计得到,CLOSED 事件直接产出已关闭连接 —— 无需快照 diff。
import { getSingboxClient } from '@/api/singbox/client'
import { subscribeStream } from '@/api/singbox/subscriptions'
import {
  ConnectionEventType,
  type ConnectionEvents,
  type Connection as PbConnection,
} from '@/gen/daemon/started_service_pb'
import type { Connection } from '@/types'
import { shallowRef, type Ref } from 'vue'
import {
  createGetConnectionDisplayValue,
  createGetConnectionVisibleSearchValues,
  type ConnectionAccessor,
  type ConnectionsSnapshot,
} from './accessor'

const fetchSingboxConnections = (): {
  data: Ref<ConnectionsSnapshot | undefined>
  close: () => void
} => {
  const data = shallowRef<ConnectionsSnapshot>()

  // 活跃连接表,条目已带瞬时速率。每次变更都整体替换条目(immutable),不就地改写,
  // 因此 emit 直接产出表内引用即可,无需再拷贝。
  const conns = new Map<string, Connection>()
  // 本窗口新关闭的连接,emit 时随快照一并产出。
  let newlyClosed: Connection[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  // UPDATE 事件不携带 connection,只有 id + delta;速率即取本秒 delta(与官方 dashboard 一致)。
  const enrich = (c: PbConnection | Connection, down: number, up: number): Connection =>
    Object.assign({}, c, { downloadSpeed: down, uploadSpeed: up }) as Connection

  // 把一个连接归入「本拍新关闭」并从活跃表移除。NEW/UPDATE/CLOSED 任意事件携带的连接,只要
  // closedAt > 0(初始快照里夹带的历史已关闭连接、或最终关闭快照)都走这里,避免遗留在活跃表。
  const close = (id: string, base?: PbConnection | Connection) => {
    const c = base ?? conns.get(id)
    conns.delete(id)
    if (c) newlyClosed.push(enrich(c, 0, 0))
  }

  const emit = () => {
    timer = null
    data.value = {
      active: Array.from(conns.values()),
      closed: newlyClosed,
    }
    newlyClosed = []
  }
  const scheduleEmit = () => {
    if (timer) return
    timer = setTimeout(emit, 100)
  }

  const handle = subscribeStream<ConnectionEvents>('connections', (msg) => {
    if (msg.reset) {
      conns.clear()
    }
    for (const event of msg.events) {
      const downDelta = Number(event.downlinkDelta)
      const upDelta = Number(event.uplinkDelta)

      switch (event.type) {
        case ConnectionEventType.CONNECTION_EVENT_NEW:
          // 新建连接当拍速率记 0(NEW 事件不带 delta)。
          // 初始快照可能把已关闭连接也当 NEW 下发(closedAt > 0),这类不进活跃表,直接归 closed。
          if (event.connection) {
            if (event.connection.closedAt > 0n) close(event.id, event.connection)
            else conns.set(event.id, enrich(event.connection, 0, 0))
          }
          break
        case ConnectionEventType.CONNECTION_EVENT_UPDATE: {
          if (event.connection) {
            if (event.connection.closedAt > 0n) close(event.id, event.connection)
            else conns.set(event.id, enrich(event.connection, downDelta, upDelta))
          } else {
            // 仅 delta:沿用上次的连接,累加总量,速率取本拍 delta。
            const prev = conns.get(event.id)
            if (prev) {
              const s = asSingbox(prev)
              conns.set(
                event.id,
                enrich(
                  {
                    ...s,
                    uplinkTotal: s.uplinkTotal + event.uplinkDelta,
                    downlinkTotal: s.downlinkTotal + event.downlinkDelta,
                  },
                  downDelta,
                  upDelta,
                ),
              )
            }
          }
          break
        }
        case ConnectionEventType.CONNECTION_EVENT_CLOSED: {
          // CLOSED 可能带最终连接快照(最终流量、closedAt);否则回退到活跃表内现有数据。
          // 同窗口内 NEW+CLOSED 的短连接也能在此被收入 closed,不丢失。
          close(event.id, event.connection)
          break
        }
      }
    }
    scheduleEmit()
  })

  return {
    data,
    close: () => {
      if (timer) clearTimeout(timer)
      handle.close()
    },
  }
}

const closeSingboxConnection = async (id: string) => {
  const client = getSingboxClient()?.client
  if (!client) return
  await client.closeConnection({ id })
}

const closeAllSingboxConnections = async () => {
  const client = getSingboxClient()?.client
  if (!client) return
  await client.closeAllConnections({})
}

export const disconnectByIdAPI = closeSingboxConnection

export const disconnectAllAPI = closeAllSingboxConnections

export const fetchConnectionsAPI = fetchSingboxConnections

// 拆分 "ip:port" / "[ipv6]:port"
const splitHostPort = (value: string): [string, string] => {
  if (!value) return ['', '']
  const idx = value.lastIndexOf(':')
  if (idx === -1) return [value, '']

  let host = value.slice(0, idx)
  const port = value.slice(idx + 1)

  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1)
  }

  return [host, port]
}

const asSingbox = (connection: Connection) => connection as PbConnection

const getNetwork = (c: PbConnection) => {
  const [, destinationPort] = splitHostPort(c.destination)

  if ((destinationPort === '443' || c.domain) && c.network === 'udp') {
    return 'quic'
  }

  return c.network
}

const getHostname = (c: PbConnection) => c.domain || splitHostPort(c.destination)[0]

export const connectionAccessor: ConnectionAccessor = {
  chains: (connection) => {
    const c = asSingbox(connection)

    return c.chainList.length ? c.chainList : [c.outbound].filter(Boolean)
  },
  download: (connection) => Number(asSingbox(connection).downlinkTotal),
  upload: (connection) => Number(asSingbox(connection).uplinkTotal),
  start: (connection) => Number(asSingbox(connection).createdAt),
  rule: (connection) => asSingbox(connection).rule,
  rulePayload: () => '',
  sourceIP: (connection) => splitHostPort(asSingbox(connection).source)[0],
  sourcePort: (connection) => splitHostPort(asSingbox(connection).source)[1],
  network: (connection) => getNetwork(asSingbox(connection)),
  networkType: (connection) => {
    const c = asSingbox(connection)

    return `${c.inboundType} | ${getNetwork(c)}`
  },
  hostname: (connection) => getHostname(asSingbox(connection)),
  host: (connection) => {
    const c = asSingbox(connection)
    const [, destinationPort] = splitHostPort(c.destination)
    const host = getHostname(c)

    if (host.includes(':')) {
      return `[${host}]:${destinationPort}`
    }
    return `${host}:${destinationPort}`
  },
  process: (connection) => {
    const processPath = asSingbox(connection).processInfo?.processPath ?? ''

    return processPath.replace(/^.*[/\\](.*)$/, '$1') || '-'
  },
  destination: (connection) => {
    const c = asSingbox(connection)

    return splitHostPort(c.destination)[0] || c.domain
  },
  inboundUser: (connection) => {
    const c = asSingbox(connection)

    return c.user || c.inbound || '-'
  },
  sniffHost: (connection) => asSingbox(connection).domain,
  remoteAddress: (connection) => asSingbox(connection).destination,
  protocol: (connection) => asSingbox(connection).protocol,
  outboundType: (connection) => asSingbox(connection).outboundType,
  fromOutbound: (connection) => asSingbox(connection).fromOutbound,
  smartBlock: () => undefined,
}

export const getConnectionDisplayValue = createGetConnectionDisplayValue(connectionAccessor)

export const getConnectionVisibleSearchValues =
  createGetConnectionVisibleSearchValues(connectionAccessor)
