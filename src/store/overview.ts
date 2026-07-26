import { fetchMemoryAPI, fetchTrafficAPI } from '@/assembly/overview'
import { ref, watch } from 'vue'
import { activeConnections, downloadTotal, uploadTotal } from './connections'

export interface HistoryPoint {
  name: number
  value: [number, number]
  init?: boolean
}

export const timeSaved = 60
// 额外保留屏幕外缓冲点：最老的点在 grid 左缘外被删除,左缘滑出时才不会出现可见断线
const bufferPoints = 2
const savedPoints = timeSaved + bufferPoints

const makeInitValue = (): HistoryPoint[] => {
  const now = Date.now()

  return new Array(savedPoints).fill(0).map((_, i) => {
    const timestamp = now - (savedPoints - 1 - i) * 1000

    return { name: timestamp, value: [timestamp, 0] as [number, number], init: true }
  })
}

export const memory = ref<number>(0)
export const goroutines = ref<number>(0)
export const memoryHistory = ref(makeInitValue())
export const connectionsHistory = ref(makeInitValue())

export const downloadSpeed = ref<number>(0)
export const uploadSpeed = ref<number>(0)
export const downloadSpeedHistory = ref(makeInitValue())
export const uploadSpeedHistory = ref(makeInitValue())

let cancel: (() => void) | undefined

export const initSatistic = () => {
  cancel?.()

  downloadSpeedHistory.value = makeInitValue()
  uploadSpeedHistory.value = makeInitValue()
  memoryHistory.value = makeInitValue()
  connectionsHistory.value = makeInitValue()

  const { data: memoryWsData, close: memoryWsClose } = fetchMemoryAPI<{
    inuse: number
    goroutines?: number
  }>()
  const unwatchMemory = watch(
    () => memoryWsData.value,
    (data) => {
      if (!data) return
      const timestamp = Date.now().valueOf()

      if (data.inuse === 0) {
        return
      }

      memory.value = data.inuse
      goroutines.value = data.goroutines ?? 0
      memoryHistory.value.push({
        value: [timestamp, data.inuse],
        name: timestamp,
      })
      connectionsHistory.value.push({
        value: [timestamp, activeConnections.value.length],
        name: timestamp,
      })

      memoryHistory.value = memoryHistory.value.slice(-1 * savedPoints)
      connectionsHistory.value = connectionsHistory.value.slice(-1 * savedPoints)
    },
  )

  const { data: trafficWsData, close: trafficWsClose } = fetchTrafficAPI<{
    down: number
    up: number
    downTotal?: number
    upTotal?: number
  }>()
  const unwatchTraffic = watch(
    () => trafficWsData.value,
    (data) => {
      if (!data) return

      const timestamp = Date.now().valueOf()

      downloadSpeed.value = data.down
      uploadSpeed.value = data.up
      // sing-box 的总量随统计流下发;clash 的总量由连接 WS 消息携带,
      // 在 store/connections 写入,此处字段缺失时不覆盖。
      if (data.downTotal != null && data.upTotal != null) {
        downloadTotal.value = data.downTotal
        uploadTotal.value = data.upTotal
      }

      downloadSpeedHistory.value.push({
        value: [timestamp, data.down],
        name: timestamp,
      })
      uploadSpeedHistory.value.push({
        value: [timestamp, data.up],
        name: timestamp,
      })

      downloadSpeedHistory.value = downloadSpeedHistory.value.slice(-1 * savedPoints)
      uploadSpeedHistory.value = uploadSpeedHistory.value.slice(-1 * savedPoints)
    },
  )

  cancel = () => {
    memoryWsClose()
    trafficWsClose()
    unwatchMemory()
    unwatchTraffic()
  }
}

export const stopSatistic = () => {
  cancel?.()
  cancel = undefined
}
