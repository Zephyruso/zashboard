// 组装层 · logs 门面。持有完整的 logs ref 与流控状态(暂停 / 级别),
// 按后端类型路由订阅,并经累加器把各后端原生日志批次组装进 logs ref。
// store 直接引用这里导出的 logs / initLogs,不再参与组装。
import { isSingboxBackend } from '@/assembly/backend'
import { LOG_LEVEL } from '@/constant'
import type { LogWithSeq } from '@/types'
import { useStorage } from '@vueuse/core'
import { ref, shallowRef } from 'vue'
import { createLogsAccumulator } from './accumulator'
import * as clash from './clash'
import * as singbox from './singbox'

export const logs = shallowRef<LogWithSeq[]>([])
export const isPaused = ref(false)
export const logLevel = useStorage<string>('config/log-level', LOG_LEVEL.Info)

const backend = () => (isSingboxBackend.value ? singbox : clash)

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
