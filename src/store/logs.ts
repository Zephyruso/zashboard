import { stripAnsi } from '@/helper/ansi'
import { useStorage } from '@vueuse/core'
import { ref } from 'vue'

// 完整的 logs ref 与流控状态(暂停 / 级别)由组装层维护并组装,store 仅直接引用,不再参与组装。
export { initLogs, isPaused, logLevel, logs, stopLogs } from '@/assembly/logs'

// 纯视图侧的筛选状态(在 LogsPage 中过滤渲染,不参与日志组装)。
export const logFilter = ref('')
export const logTypeFilter = ref('')
export const logFilterRegex = useStorage<string>('config/log-filter-regex', '')
export const logFilterEnabled = useStorage<boolean>('config/log-filter-enabled', false)

// sing-box 日志以连接 id 开头,如 [3829292130 5ms] router: match[0]
export const getLogConnectionID = (payload: string) => {
  return stripAnsi(payload).match(/^\[(\d+)\s[^\]]*\]/)?.[1] ?? null
}
