import { fetchLogsAPI } from '@/api'
import type { Log, LogWithSeq } from '@/types'
import { useStorage } from '@vueuse/core'
import { ref, watch } from 'vue'

export enum LOG_LEVEL {
  Info = 'info',
  Error = 'error',
  Warning = 'warning',
  Debug = 'debug',
  Silent = 'silent',
}

export const logs = ref<LogWithSeq[]>([])
export const logFilter = ref('')
export const isPaused = ref(false)
export const logLevel = useStorage<string>('config/log-level', LOG_LEVEL.Info)

let cancel: () => void

export const initLogs = () => {
  cancel?.()
  logs.value = []

  let idx = 1
  const ws = fetchLogsAPI<string>({
    level: logLevel.value,
  })
  const unwatch = watch(ws.data, (data) => {
    if (!data) return

    const parsedData = JSON.parse(data) as Log

    if (isPaused.value) {
      idx++
      return
    }

    logs.value.unshift({
      ...parsedData,
      seq: idx++,
    })

    logs.value = logs.value.slice(0, 1000)
  })

  cancel = () => {
    unwatch()
    ws.close()
  }
}
