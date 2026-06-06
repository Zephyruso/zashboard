import { fetchLogsAPI } from '@/api'
import { LOG_LEVEL } from '@/constant'
import type { Log, LogWithSeq } from '@/types'
import { useStorage } from '@vueuse/core'
import { escapeRegExp, throttle } from 'lodash-es'
import { ref, shallowRef, watch } from 'vue'
import { logRetentionLimit, sourceIPLabelList } from './settings'
import { activeBackend } from './setup'

export const logs = shallowRef<LogWithSeq[]>([])
export const logFilter = ref('')
export const logTypeFilter = ref('')
export const isPaused = ref(false)
export const logLevel = useStorage<string>('config/log-level', LOG_LEVEL.Info)
export const logFilterRegex = useStorage<string>('config/log-filter-regex', '')
export const logFilterEnabled = useStorage<boolean>('config/log-filter-enabled', false)

let cancel: (() => void) | undefined
let logsTemp: LogWithSeq[] = []
let logSeq = 1
let cachedLogTimeSecond = -1
let cachedLogTime = ''

const padClockPart = (value: number) => (value < 10 ? `0${value}` : String(value))

const formatLogTime = () => {
  const nowMs = Date.now()
  const currentSecond = Math.floor(nowMs / 1000)

  if (currentSecond === cachedLogTimeSecond) {
    return cachedLogTime
  }

  const now = new Date(nowMs)

  cachedLogTimeSecond = currentSecond
  cachedLogTime = `${padClockPart(now.getHours())}:${padClockPart(now.getMinutes())}:${padClockPart(
    now.getSeconds(),
  )}`

  return cachedLogTime
}

const sliceLogs = throttle(() => {
  logs.value = logsTemp.concat(logs.value).slice(0, logRetentionLimit.value)
  logsTemp = []
}, 500)

const ipSourceMatchs: [RegExp, string][] = []
const restructMatchs = () => {
  ipSourceMatchs.length = 0
  for (const { key, label, scope } of sourceIPLabelList.value) {
    if (scope && !scope.includes(activeBackend.value?.uuid as string)) continue
    if (key.startsWith('/')) continue

    const escapedKey = escapeRegExp(key)

    if (key.includes(':')) {
      const regex = new RegExp(`${escapedKey}]:`, 'ig')
      ipSourceMatchs.push([regex, `${key}] (${label}) :`])
    } else {
      const regex = new RegExp(`${escapedKey}:`, 'ig')
      ipSourceMatchs.push([regex, `${key} (${label}) :`])
    }
  }
}

watch(
  () => [sourceIPLabelList.value, activeBackend.value],
  () => {
    restructMatchs()
  },
  {
    immediate: true,
    deep: true,
  },
)

const connectLogsStream = () => {
  if (!activeBackend.value) return

  cancel?.()

  const ws = fetchLogsAPI<Log>({
    level: logLevel.value,
  })

  const unwatch = watch(ws.data, (data) => {
    if (!data) return

    if (isPaused.value) {
      return
    }

    for (const [regex, label] of ipSourceMatchs) {
      data.payload = data.payload.replace(regex, () => label)
    }

    logsTemp.unshift({
      ...data,
      time: formatLogTime(),
      seq: logSeq++,
    })

    sliceLogs()
  })

  cancel = () => {
    sliceLogs.flush()
    unwatch()
    ws.close()
    cancel = undefined
  }
}

export const pauseLogs = () => {
  cancel?.()
}

export const resumeLogs = () => {
  if (cancel) return
  connectLogsStream()
}

export const initLogs = () => {
  pauseLogs()
  sliceLogs.cancel()
  logs.value = []
  logsTemp = []
  logSeq = 1
  connectLogsStream()
}

export const clearLogs = () => {
  sliceLogs.cancel()
  logs.value = []
  logsTemp = []
  logSeq = 1
}
