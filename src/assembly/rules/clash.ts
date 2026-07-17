// Clash REST 后端的 rules 组装:拉取 /rules 与 /providers/rules,写入门面状态。
import { fetchRuleProvidersAPI, fetchRulesAPI } from '@/api/clash'
import { activeUuid } from '@/store/setup'
import { ruleProviderList, rules } from './index'

let inflight: Promise<void> | null = null

const doFetchRules = async () => {
  const backendUuid = activeUuid.value
  // 并行(原实现串行两请求白付一个 RTT)
  const [{ data: ruleData }, { data: providerData }] = await Promise.all([
    fetchRulesAPI(),
    fetchRuleProvidersAPI(),
  ])

  // 代际守卫:快速切换后端时,旧后端"慢但成功"的响应不得回填新后端的规则
  if (backendUuid !== activeUuid.value) {
    return
  }

  rules.value = ruleData.rules.map((rule) => {
    const proxy = rule.proxy
    const proxyName = proxy.startsWith('route(') ? proxy.substring(6, proxy.length - 1) : proxy

    return {
      ...rule,
      proxy: proxyName,
    }
  })
  ruleProviderList.value = Object.values(providerData.providers)
}

export const fetchRules = async () => {
  if (inflight) {
    return inflight
  }
  inflight = doFetchRules().finally(() => {
    inflight = null
  })
  return inflight
}
