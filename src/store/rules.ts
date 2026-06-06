import { fetchRuleProvidersAPI, fetchRulesAPI, isRequestCanceled } from '@/api'
import { RULE_TAB_TYPE } from '@/constant'
import { toSearchRegex } from '@/helper/search'
import type { Rule, RuleProvider } from '@/types'
import { computed, ref } from 'vue'
import { activeUuid } from './setup'

export const rulesFilter = ref('')
export const rulesTabShow = ref(RULE_TAB_TYPE.RULES)

export const rules = ref<Rule[]>([])
export const ruleProviderList = ref<RuleProvider[]>([])
let fetchRulesSequence = 0
let fetchRulesAbortController: AbortController | undefined

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

export const fetchRules = async () => {
  const sequence = ++fetchRulesSequence
  const backendUuid = activeUuid.value

  if (!backendUuid) {
    return
  }

  const controller = new AbortController()
  fetchRulesAbortController?.abort()
  fetchRulesAbortController = controller

  let ruleRes: Awaited<ReturnType<typeof fetchRulesAPI>>
  let providerRes: Awaited<ReturnType<typeof fetchRuleProvidersAPI>>

  try {
    ;[ruleRes, providerRes] = await Promise.all([
      fetchRulesAPI(controller.signal),
      fetchRuleProvidersAPI(controller.signal),
    ])
  } catch (error) {
    if (isRequestCanceled(error)) return
    throw error
  } finally {
    if (fetchRulesAbortController === controller) {
      fetchRulesAbortController = undefined
    }
  }

  const ruleData = ruleRes.data
  const providerData = providerRes.data

  if (fetchRulesSequence !== sequence || activeUuid.value !== backendUuid) {
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
