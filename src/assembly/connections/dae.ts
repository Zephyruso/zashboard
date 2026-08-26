// dae REST 后端的连接流,以及「原始 dae 连接数据 → view 字段」的访问器。
//
// dae 没有 WebSocket,只能轮询 GET /api/connections。对外仍返回与 Clash 通道
// 一样的 { data, close } 与 ConnectionsSnapshot —— 轮询是这条通道的内部细节,
// store 不该知道。
//
// 与 Clash 的一个实质差别:瞬时速率不用与上一拍 diff,dae 直接给
// upload_rate / download_rate。要 diff 的只剩「哪些连接这一拍消失了」。
import { fetchDaeConnectionsAPI } from '@/api/dae'
import type { Connection, DaeConnectionRawMessage } from '@/types'
import { shallowRef } from 'vue'
import {
  createGetConnectionDisplayValue,
  createGetConnectionVisibleSearchValues,
  type ConnectionAccessor,
  type ConnectionsSnapshot,
} from './accessor'

const POLL_INTERVAL = 1000

// dae 侧 limit 缺省 100,对连接页来说太少。给大一点,截断由 dae 自己做。
const CONNECTION_LIMIT = 2000

// 桩的签名与 Clash 侧保持一致,门面才能对着两者的联合调用。
const unsupported = (action: string): never => {
  throw new Error(`dae backend does not support ${action}`)
}

export const disconnectByIdAPI = async (id: string) => unsupported(`disconnecting ${id}`)

export const disconnectAllAPI = async () => unsupported('disconnecting all connections')

export const fetchConnectionsAPI = () => {
  const data = shallowRef<ConnectionsSnapshot>()
  let previousMap = new Map<string, Connection>()
  let stopped = false
  // 一拍没跑完就别起下一拍:两次响应交错回来会把 previousMap 搅乱,
  // 算出来的「本拍新关闭」就成了假的。
  let inFlight = false

  const poll = async () => {
    if (inFlight) return

    inFlight = true

    let raw

    try {
      ;({ data: raw } = await fetchDaeConnectionsAPI(CONNECTION_LIMIT))
    } finally {
      inFlight = false
    }

    if (stopped) return

    const currentMap = new Map<string, Connection>()
    const active: Connection[] = []

    // tcp / udp 分列在两个数组里,network 是这里打上的,不是响应字段。
    for (const [network, list] of [
      ['tcp', raw.tcp ?? []],
      ['udp', raw.udp ?? []],
    ] as const) {
      for (const item of list) {
        const connection: Connection = {
          ...item,
          id: String(item.id),
          network,
          downloadSpeed: item.download_rate,
          uploadSpeed: item.upload_rate,
        }

        previousMap.delete(connection.id)
        currentMap.set(connection.id, connection)
        active.push(connection)
      }
    }

    // 上一拍存在、这一拍消失的连接即新关闭。
    const closed = Array.from(previousMap.values())

    previousMap = currentMap

    // downloadTotal / uploadTotal 不在这条流里 —— dae 的累计流量挂在
    // GET /api/runtime/status,由 assembly/overview 那条流填进 store。
    data.value = { active, closed }
  }

  // 拉不到就静默跳过这一拍:这不是用户触发的动作,而且下一拍还会再试。
  const tick = () => poll().catch(() => {})

  tick()

  const timer = setInterval(tick, POLL_INTERVAL)

  return {
    data,
    close: () => {
      stopped = true
      clearInterval(timer)
    },
  }
}

const asDae = (connection: Connection) => connection as DaeConnectionRawMessage

// "1.2.3.4:443" / "[::1]:443" → ['1.2.3.4', '443']
const splitAddress = (address: string): [string, string] => {
  const index = address.lastIndexOf(':')

  if (index === -1) return [address, '']

  return [address.slice(0, index), address.slice(index + 1)]
}

const stripBrackets = (host: string) =>
  host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host

// dae 没有的字段一律返回空串,展示层会渲染成 '-'。不编造数值 ——
// 连接表的列是用户自己挑的,空着比填一个看起来像真的值要诚实。
export const connectionAccessor: ConnectionAccessor = {
  // dae 只报告出站组名,没有多级链路。
  chains: (connection) => [asDae(connection).outbound],
  download: (connection) => asDae(connection).download_bytes,
  upload: (connection) => asDae(connection).upload_bytes,
  start: (connection) => asDae(connection).started,
  rule: () => '',
  ruleType: () => '',
  rulePayload: () => '',
  sourceIP: (connection) => stripBrackets(splitAddress(asDae(connection).src)[0]),
  sourcePort: (connection) => splitAddress(asDae(connection).src)[1],
  network: (connection) => asDae(connection).network,
  networkType: (connection) => asDae(connection).network,
  hostname: (connection) => {
    const dae = asDae(connection)

    return dae.domain || stripBrackets(splitAddress(dae.dst)[0])
  },
  // dst 本来就是 host:port(IPv6 已带方括号),原样透出。
  host: (connection) => asDae(connection).dst,
  process: () => '-',
  destination: (connection) => stripBrackets(splitAddress(asDae(connection).dst)[0]),
  inboundUser: () => '-',
  sniffHost: (connection) => asDae(connection).domain,
  remoteAddress: () => '',
  smartBlock: () => undefined,
}

export const getConnectionDisplayValue = createGetConnectionDisplayValue(connectionAccessor)

export const getConnectionVisibleSearchValues =
  createGetConnectionVisibleSearchValues(connectionAccessor)
