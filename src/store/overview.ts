import { fetchMemoryAPI, fetchTrafficAPI } from '@/api'
import { ref, shallowRef, watch } from 'vue'
import { activeConnections } from './connections'
import { activeBackend } from './setup'

export const timeSaved = 60
const initValue = new Array(timeSaved).fill(0).map((v, i) => ({ name: i, value: v }))

export const memory = ref<number>(0)
// shallowRef: every WS tick we push then immediately reassign via slice(),
// so per-item Proxy wrapping would cost 60×4 = 240 reactive wrappers per second
// for sparkline data we only ever read in bulk. The reassignment alone is
// enough to trigger downstream computeds/charts.
export const memoryHistory = shallowRef([...initValue])
export const connectionsHistory = shallowRef([...initValue])

export const downloadSpeed = ref<number>(0)
export const uploadSpeed = ref<number>(0)
export const downloadSpeedHistory = shallowRef([...initValue])
export const uploadSpeedHistory = shallowRef([...initValue])

let cancel: (() => void) | undefined

const connectOverviewStreams = () => {
  if (!activeBackend.value) return

  cancel?.()

  const { data: memoryWsData, close: memoryWsClose } = fetchMemoryAPI<{
    inuse: number
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
      memoryHistory.value.push({
        value: data.inuse,
        name: timestamp,
      })
      connectionsHistory.value.push({
        value: activeConnections.value.length,
        name: timestamp,
      })

      memoryHistory.value = memoryHistory.value.slice(-1 * timeSaved)
      connectionsHistory.value = connectionsHistory.value.slice(-1 * timeSaved)
    },
  )

  const { data: trafficWsData, close: trafficWsClose } = fetchTrafficAPI<{
    down: number
    up: number
  }>()
  const unwatchTraffic = watch(
    () => trafficWsData.value,
    (data) => {
      if (!data) return

      const timestamp = Date.now().valueOf()

      downloadSpeed.value = data.down
      uploadSpeed.value = data.up

      downloadSpeedHistory.value.push({
        value: data.down,
        name: timestamp,
      })
      uploadSpeedHistory.value.push({
        value: data.up,
        name: timestamp,
      })

      downloadSpeedHistory.value = downloadSpeedHistory.value.slice(-1 * timeSaved)
      uploadSpeedHistory.value = uploadSpeedHistory.value.slice(-1 * timeSaved)
    },
  )

  cancel = () => {
    memoryWsClose()
    trafficWsClose()
    unwatchMemory()
    unwatchTraffic()
    cancel = undefined
  }
}

export const pauseSatistic = () => {
  cancel?.()
}

export const resumeSatistic = () => {
  if (cancel) return
  connectOverviewStreams()
}

export const initSatistic = () => {
  pauseSatistic()

  downloadSpeedHistory.value = [...initValue]
  uploadSpeedHistory.value = [...initValue]
  memoryHistory.value = [...initValue]
  connectionsHistory.value = [...initValue]

  connectOverviewStreams()
}
