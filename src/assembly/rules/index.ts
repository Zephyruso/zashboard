// 组装层 · rules 门面。持有 rules / ruleProviderList 统一状态与渲染派生,
// 按后端类型路由到 clash / singbox 实现(sing-box native 不支持 rules)。
import { isSingboxBackend } from '@/assembly/backend'
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

const load = () => (isSingboxBackend.value ? import('./singbox') : import('./clash'))

export const fetchRules = async () => (await load()).fetchRules()

// 规则启用 / 规则集更新动作(Clash 专属),经 rules 域门面暴露给 view。
export {
  toggleRuleDisabledAPI,
  toggleRuleDisabledSingBoxAPI,
  updateRuleProviderAPI,
} from '@/api/clash'
