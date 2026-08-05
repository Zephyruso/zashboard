// 组装层 · logs 门面。持有完整的 logs ref 与流控状态(暂停 / 级别),
// 按后端类型路由订阅,并经累加器把各后端原生日志批次组装进 logs ref。
// store 直接引用这里导出的 logs / initLogs,不再参与组装。
import { can, Channel, channel, core, Core } from '@/assembly/backend'
import { LOG_LEVEL } from '@/constant'
import { activeBackend } from '@/store/setup'
import type { LogWithSeq } from '@/types'
import { useStorage } from '@vueuse/core'
import { computed, ref, shallowRef, watch } from 'vue'
import { createLogsAccumulator } from './accumulator'
import * as clash from './clash'
import * as singbox from './singbox'

export const logs = shallowRef<LogWithSeq[]>([])
export const isPaused = ref(false)
export const logLevel = useStorage<string>('config/log-level', LOG_LEVEL.Info)

// 各内核认的 /logs?level= 取值不同(mihomo 无 trace,honk 无 fatal/panic),
// 传了不认的级别会被直接 400,WS 随后陷入无限重连,所以逐档按能力表拼。
export const supportedLogLevels = computed(() => {
  const levels = [LOG_LEVEL.Debug, LOG_LEVEL.Info, LOG_LEVEL.Warning, LOG_LEVEL.Error]

  if (can('traceLogLevel')) levels.unshift(LOG_LEVEL.Trace)
  if (can('extraLogLevels')) levels.push(LOG_LEVEL.Fatal, LOG_LEVEL.Panic)

  return levels
})

// logLevel 是跨后端持久化的,切到不认该级别的内核后必须退档,否则流永远起不来。
// 后端为空或内核未探测出结论(Core.Unknown)时不动它 —— 那时候的能力表还不是最终答案。
watch(supportedLogLevels, (levels) => {
  if (!activeBackend.value || core.value === Core.Unknown) return
  if (levels.includes(logLevel.value as LOG_LEVEL)) return

  logLevel.value = LOG_LEVEL.Info
  if (cancel) initLogs()
})

const backend = () => (channel.value === Channel.Singbox ? singbox : clash)

let cancel: (() => void) | undefined

export const initLogs = () => {
  cancel?.()
  logs.value = []

  const accumulator = createLogsAccumulator(logs, () => isPaused.value)
  const subscription = backend().subscribeLogs({ level: logLevel.value }, accumulator.push)

  cancel = () => {
    accumulator.dispose()
    subscription.close()
  }
}

export const stopLogs = () => {
  cancel?.()
  cancel = undefined
}
