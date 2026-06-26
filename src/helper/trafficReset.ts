import {
  clearConnectionHistoryFromIndexedDB,
  clearTrafficMatrixFromIndexedDB,
} from '@/helper/indexeddb'
import { initAggregatedDataMap } from '@/store/connHistory'
import { trafficMonthlyResetDay, trafficMonthlyResetEnabled } from '@/store/settings'
import { useStorage } from '@vueuse/core'
import dayjs from 'dayjs'

export const trafficStatsPeriodStart = useStorage<number>(
  'cache/traffic-stats-period-start',
  Date.now(),
)

export const getLastMonthlyResetDate = (dayOfMonth: number, now = dayjs()) => {
  const clampedDay = Math.min(Math.max(dayOfMonth, 1), 28)
  let candidate = now.date(clampedDay).startOf('day')

  if (now.isBefore(candidate)) {
    candidate = candidate.subtract(1, 'month')
  }

  return candidate
}

export const getNextMonthlyResetDate = (dayOfMonth: number, now = dayjs()) => {
  const lastReset = getLastMonthlyResetDate(dayOfMonth, now)
  return lastReset.add(1, 'month')
}

export const shouldPerformMonthlyReset = () => {
  if (!trafficMonthlyResetEnabled.value) {
    return false
  }

  const lastReset = getLastMonthlyResetDate(trafficMonthlyResetDay.value)
  return lastReset.valueOf() > trafficStatsPeriodStart.value
}

export const resetAllTrafficStats = async () => {
  await clearConnectionHistoryFromIndexedDB()
  await clearTrafficMatrixFromIndexedDB()
  await initAggregatedDataMap()
  trafficStatsPeriodStart.value = getLastMonthlyResetDate(trafficMonthlyResetDay.value).valueOf()
}

export const clearAllTrafficStats = async () => {
  await clearConnectionHistoryFromIndexedDB()
  await clearTrafficMatrixFromIndexedDB()
  await initAggregatedDataMap()
  trafficStatsPeriodStart.value = Date.now()
}

export const checkAndPerformTrafficReset = async () => {
  if (!shouldPerformMonthlyReset()) {
    return false
  }

  try {
    await resetAllTrafficStats()
    return true
  } catch (error) {
    console.error('Failed to perform monthly traffic reset:', error)
    return false
  }
}
