// sing-box native(gRPC daemon.StartedService)后端的代理「组装逻辑」。
// 与 clash 的「拉取式」不同,这里是「流驱动」:订阅 SubscribeGroups / SubscribeOutbounds,
// 每次推送直接重建门面 index.ts 的共享状态,因此选择/测速后无需手动刷新,
// 结果会随流自动回填到 UI。
import { getSingboxClient } from '@/api/singbox/client'
import type { StreamHandle } from '@/api/singbox/streams'
import { subscribeStream } from '@/api/singbox/subscriptions'
import { disconnectConnections } from '@/assembly/connections'
import type { Group, GroupItem, Groups, OutboundList } from '@/gen/daemon/started_service_pb'
import { getConnectionChains } from '@/helper'
import { activeConnections } from '@/store/connections'
import { automaticDisconnection, iconReflectList } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import type { Proxy } from '@/types'
import { mergeProxyMap, proxyGroupList, proxyProviederList } from './index'

// 延迟条目的时间戳按 tag+delay 记忆:同一延迟不换时间戳,节点 JSON 保持稳定,
// mergeProxyMap 才能复用对象引用(否则每次 rebuild 全部节点都"变了")。
const historyTimestamps = new Map<string, { delay: number; time: string }>()
const historyFor = (tag: string, delay: number, fallbackTime: string): Proxy['history'] => {
  if (delay <= 0) return []
  const prev = historyTimestamps.get(tag)

  if (prev && prev.delay === delay) {
    return [{ time: prev.time, delay }]
  }
  historyTimestamps.set(tag, { delay, time: fallbackTime })
  return [{ time: fallbackTime, delay }]
}

const nodeToProxy = (item: GroupItem, time: string): Proxy => ({
  name: item.tag,
  type: item.type,
  now: '',
  history: historyFor(item.tag, item.urlTestDelay, time),
  extra: {},
  udp: true,
  icon: '',
})

let groups = new Map<string, Group>()
let outbounds = new Map<string, GroupItem>()
let handles: StreamHandle[] = []
let sessionKey = ''
let ready: Promise<void> | null = null

// 由流数据原生组装共享状态(无 clash 的 provider / GLOBAL / 排序等概念)。
let rebuildTimer: ReturnType<typeof setTimeout> | null = null

const rebuild = () => {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer)
    rebuildTimer = null
  }

  const proxies: Record<string, Proxy> = {}
  // 时间戳整轮 rebuild 只取一次
  const time = new Date().toISOString()

  // 1) 出站叶子节点(含延迟)
  for (const item of outbounds.values()) {
    proxies[item.tag] = nodeToProxy(item, time)
  }
  // 2) 用组内 items 补建缺失的叶子节点(outbounds 流可能晚到或不含某些成员)
  for (const group of groups.values()) {
    for (const item of group.items) {
      if (!proxies[item.tag]) proxies[item.tag] = nodeToProxy(item, time)
    }
  }
  // 3) 分组条目(携带 all / now),始终覆盖同名节点
  for (const group of groups.values()) {
    proxies[group.tag] = {
      name: group.tag,
      type: group.type,
      now: group.selected,
      all: group.items.map((i) => i.tag),
      history: [],
      extra: {},
      udp: true,
      icon: '',
    }
  }
  // 4) 把组内 items 的延迟回填到叶子节点(绝不动带 all 的组条目)
  for (const group of groups.values()) {
    for (const item of group.items) {
      const node = proxies[item.tag]
      if (node && !node.all?.length && item.urlTestDelay > 0) {
        node.history = historyFor(item.tag, item.urlTestDelay, time)
      }
    }
  }
  // 5) 应用用户配置的「名称→图标」映射(与 clash 一致,sing-box 流不含图标)
  for (const iconReflect of iconReflectList.value) {
    const node = proxies[iconReflect.name]
    if (node) node.icon = iconReflect.icon
  }

  // diff 合并:URLTest 期间内核连续推送不再等于连续全页重渲染
  mergeProxyMap(proxies)
  proxyGroupList.value = Array.from(groups.values())
    .filter((g) => g.items.length)
    .map((g) => g.tag)
  proxyProviederList.value = []
}

// 流推送走 150ms 合并节流(groups/outbounds 两条流常背靠背到达);
// fetchProxies / handlerProxySelect 保留立即 rebuild 路径。
const scheduleRebuild = () => {
  if (rebuildTimer) return
  rebuildTimer = setTimeout(rebuild, 150)
}

const closeStreams = () => {
  handles.forEach((h) => h.close())
  handles = []
  sessionKey = ''
  ready = null
}

const stop = () => {
  closeStreams()
  groups = new Map()
  outbounds = new Map()
  historyTimestamps.clear()
  if (rebuildTimer) {
    clearTimeout(rebuildTimer)
    rebuildTimer = null
  }
}

const ensureSession = () => {
  const backend = activeBackend.value
  const client = getSingboxClient()?.client
  if (!backend || backend.type !== 'singbox' || !client) {
    stop()
    return
  }
  if (sessionKey === backend.uuid && handles.length) return

  stop()
  sessionKey = backend.uuid

  let resolveReady!: () => void
  let resolved = false
  ready = new Promise<void>((r) => (resolveReady = r))

  handles = [
    subscribeStream<Groups>('groups', (msg) => {
      groups = new Map()
      for (const g of msg.group) groups.set(g.tag, g)
      if (!resolved) {
        resolved = true
        rebuild()
        resolveReady()
      } else {
        scheduleRebuild()
      }
    }),
    subscribeStream<OutboundList>('outbounds', (msg) => {
      outbounds = new Map()
      for (const o of msg.outbounds) outbounds.set(o.tag, o)
      scheduleRebuild()
    }),
  ]
}

// 在后端切换 / 登出时丢弃订阅。
export const resetProxies = () => stop()

export const fetchProxies = async () => {
  ensureSession()
  if (ready) await ready
  rebuild()
}

export const handlerProxySelect = async (proxyGroupName: string, proxyName: string) => {
  const client = getSingboxClient()?.client
  if (!client) return

  await client.selectOutbound({ groupTag: proxyGroupName, outboundTag: proxyName })

  // 乐观更新,流随后会确认
  const group = groups.get(proxyGroupName)
  if (group) {
    group.selected = proxyName
    rebuild()
  }

  if (automaticDisconnection.value) {
    const matching = activeConnections.value.filter((c) =>
      getConnectionChains(c).includes(proxyGroupName),
    )

    disconnectConnections(matching, activeConnections.value.length)
  }
}

// sing-box native API 的 URLTest 是组级别;节点卡片触发测速时转为所在组测速。
export const proxyLatencyTest = async (
  proxyName: string,
  _url?: string,
  _timeout?: number,
  groupName?: string,
) => {
  const client = getSingboxClient()?.client
  if (!client) return
  await client.uRLTest({ outboundTag: groupName || proxyName })
}

export const proxyGroupLatencyTest = async (proxyGroupName: string) => {
  const client = getSingboxClient()?.client
  if (!client) return
  await client.uRLTest({ outboundTag: proxyGroupName })
}

export const allProxiesLatencyTest = async () => {
  const client = getSingboxClient()?.client
  if (!client) return
  await Promise.allSettled(
    Array.from(groups.keys()).map((tag) => client.uRLTest({ outboundTag: tag })),
  )
}
