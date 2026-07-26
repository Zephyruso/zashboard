// sing-box native 后端不支持 rules 列表,清空门面状态。
import { ruleProviderList, rules } from './index'

export const fetchRules = async () => {
  rules.value = []
  ruleProviderList.value = []
}
