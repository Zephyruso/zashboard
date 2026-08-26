// dae REST 后端的代理「组装逻辑」:从 /api/groups 拉取并组装视图状态。
// 写入门面 index.ts 的共享状态。
//
// dae 的组策略写在配置文件里,API 只读:没有选择节点的端点,也没有按目标测速的
// 端点,只有一个全量的 POST /api/nodes/check。因此这里只实现拉取与全量测速,
// 其余动作是抛错的桩 —— 调用点由 can('proxySelect') / can('proxyLatencyTest')
// 先挡住,桩只是最后一道防线。
import { checkDaeNodesAPI, fetchDaeGroupsAPI } from '@/api/dae'
import { NOT_CONNECTED } from '@/constant'
import { iconReflectList } from '@/store/settings'
import type { Proxy } from '@/types'
import { proxyGroupList, proxyMap, proxyProviederList } from './index'

// 节点在 dae 里没有类型信息(那是订阅里的事),给一个中性值 —— 关键是不能与任何
// PROXY_TYPE 成员相撞,否则会误触发 reject/block 排除、smart 检测等 Clash 专属分支。
const DAE_NODE_TYPE = 'Node'

let fetchTime = 0

export const fetchProxies = async () => {
  const nowTime = Date.now()

  fetchTime = nowTime

  const { data: groups } = await fetchDaeGroupsAPI()

  if (fetchTime !== nowTime) {
    return
  }

  const nextMap: Record<string, Proxy> = {}

  for (const group of groups ?? []) {
    for (const node of group.nodes ?? []) {
      // proxyMap 是扁平的 name → Proxy,而同一个节点可以出现在多个组里并各带一份
      // 延迟。这里后写的覆盖先写的:面板的延迟展示本来就是按节点名而非按组来的。
      nextMap[node.name] = {
        name: node.name,
        type: DAE_NODE_TYPE,
        history: [
          {
            time: new Date().toISOString(),
            delay: node.alive ? node.latency_ms : NOT_CONNECTED,
          },
        ],
        extra: {},
        udp: false,
        xudp: false,
        now: '',
        icon: '',
      }
    }
  }

  for (const group of groups ?? []) {
    // 组不可点选:dae 没有对应的写端点。now 留空 —— dae 不报告组当前选中的节点,
    // 编一个出来只会让链路展示说谎(getNowProxyNodeName 在 now 为空时原样返回组名)。
    nextMap[group.name] = {
      name: group.name,
      type: group.policy,
      history: [],
      extra: {},
      udp: false,
      xudp: false,
      now: '',
      icon: '',
      all: (group.nodes ?? []).map((node) => node.name),
      selectable: false,
    }
  }

  proxyMap.value = nextMap
  proxyGroupList.value = (groups ?? []).map((group) => group.name)
  // dae 没有代理集的概念,恒为空 —— provider tab 另由 can('proxyProviders') 挡住。
  proxyProviederList.value = []

  Object.keys(proxyMap.value).forEach((name) => {
    const iconReflect = iconReflectList.value.find((icon) => icon.name === name)

    if (iconReflect) {
      proxyMap.value[name].icon = iconReflect.icon
    }
  })
}

// 桩的签名与 Clash 侧保持一致,门面才能对着两者的联合调用。
const unsupported = (action: string): never => {
  throw new Error(`dae backend does not support ${action}`)
}

export const handlerProxySelect = async (proxyGroupName: string, proxyName: string) =>
  unsupported(`proxy selection (${proxyGroupName} -> ${proxyName})`)

export const proxyLatencyTest = async (proxyName: string, url?: string, timeout?: number) =>
  unsupported(`per-node latency test (${proxyName}, ${url ?? ''}, ${timeout ?? ''})`)

export const proxyGroupLatencyTest = async (proxyGroupName: string) =>
  unsupported(`per-group latency test (${proxyGroupName})`)

// dae 唯一的测速入口:全量触发,然后重新拉一遍组拿新的 alive / latency_ms。
// 检测是异步的,check 返回时结果多半还没出来 —— 这里不做轮询等待,
// 用户可以再点一次刷新,与 dae CLI 的行为一致。
export const allProxiesLatencyTest = async () => {
  await checkDaeNodesAPI()
  await fetchProxies()
}
