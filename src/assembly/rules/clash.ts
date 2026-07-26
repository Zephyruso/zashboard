// Clash REST 后端的 rules 组装:拉取 /rules 与 /providers/rules,写入门面状态。
import { fetchRuleProvidersAPI, fetchRulesAPI } from '@/api/clash'
import { ruleProviderList, rules } from './index'

export const fetchRules = async () => {
  const { data: ruleData } = await fetchRulesAPI()
  const { data: providerData } = await fetchRuleProvidersAPI()

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
