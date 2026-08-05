// 组装层 · rules 门面。持有 rules / ruleProviderList 统一状态与渲染派生,
// 按后端类型路由到 clash / singbox 实现(sing-box 不支持 rules)。
import { toggleRuleDisabledAPI, toggleRuleDisabledSingBoxAPI } from '@/api/clash'
import { Channel, channel } from '@/assembly/backend'
import { RULE_TAB_TYPE } from '@/constant'
import { toSearchRegex } from '@/helper/search'
import type { Rule, RuleProvider } from '@/types'
import { computed, ref } from 'vue'

export const rulesFilter = ref('')
export const rulesTabShow = ref(RULE_TAB_TYPE.RULES)

export const rules = ref<Rule[]>([])
export const ruleProviderList = ref<RuleProvider[]>([])

export const renderRules = computed(() => {
  const searchRegex = toSearchRegex(rulesFilter.value)

  if (!searchRegex) {
    return rules.value
  }

  return rules.value.filter((rule) => {
    return searchRegex.testAny([rule.type, rule.payload, rule.proxy])
  })
})

export const renderRulesProvider = computed(() => {
  const searchRegex = toSearchRegex(rulesFilter.value)

  if (!searchRegex) {
    return ruleProviderList.value
  }

  return ruleProviderList.value.filter((ruleProvider) => {
    return searchRegex.testAny([ruleProvider.name, ruleProvider.behavior, ruleProvider.vehicleType])
  })
})

const load = () => (channel.value === Channel.Singbox ? import('./singbox') : import('./clash'))

export const fetchRules = async () => (await load()).fetchRules()

// 规则启用切换在 Clash 通道上有两套端点:sing-box 的规则带稳定 uuid(PUT /rules/{uuid}),
// mihomo 按索引批量切换(PATCH /rules/disable)。用哪套由响应数据自己决定 ——
// rule.uuid 是确定信息,比 core 轴的版本字符串嗅探可靠,故不走能力表。
export const toggleRuleDisabled = (rule: Rule, disabled: boolean) =>
  rule.uuid
    ? toggleRuleDisabledSingBoxAPI(rule.uuid)
    : toggleRuleDisabledAPI({ [rule.index]: disabled })

// 规则集更新动作(Clash 专属),经 rules 域门面暴露给 view。
export { updateRuleProviderAPI } from '@/api/clash'
