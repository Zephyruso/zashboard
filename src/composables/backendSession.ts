// 后端会话生命周期的统一开关。
// 流(连接/日志/traffic/memory)的 URL 与 token 在建连时固化,任何"活跃后端变化"
// 都必须整套 stop→init,否则旧流以无主状态永久重连(登出/401/编辑/删除后端同理)。
import { fetchConfigs } from '@/assembly/config'
import { fetchProxies, proxiesTabShow, resetProxies } from '@/assembly/proxies'
import { fetchRules, rulesTabShow } from '@/assembly/rules'
import { PROXY_TAB_TYPE, RULE_TAB_TYPE } from '@/constant'
import { initConnections, stopConnections } from '@/store/connections'
import { initLogs, stopLogs } from '@/store/logs'
import { initSatistic, stopSatistic } from '@/store/overview'
import { activeUuid } from '@/store/setup'
import { watch } from 'vue'

export const stopBackendSession = () => {
  stopConnections()
  stopLogs()
  stopSatistic()
}

// 与 HomePage 激活分支同序的完整重建:编辑当前活跃后端(host/token 变更)后调用,
// 否则 REST 走新地址而 4 条流仍对旧地址无限重连、实时数据静默冻结。
export const restartBackendSession = async () => {
  stopBackendSession()
  await resetProxies()
  rulesTabShow.value = RULE_TAB_TYPE.RULES
  proxiesTabShow.value = PROXY_TAB_TYPE.PROXIES
  fetchConfigs()
  fetchProxies()
  fetchRules()
  initConnections()
  initLogs()
  initSatistic()
}

// 模块级兜底:stop 不再寄生 HomePage 组件 watcher —— 滞留 /setup 期间
// (HomePage 已卸载)删除/清空活跃后端时也能关流。
watch(activeUuid, (value) => {
  if (!value) {
    stopBackendSession()
  }
})
