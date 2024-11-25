import { fetchConnectionsAPI } from '@/api'
import type { Connection, ConnectionRawMessage } from '@/types'
import { useStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import { differenceWith } from 'lodash'
import { computed, ref, watch } from 'vue'

export const activeConnections = ref<Connection[]>([])
export const closedConnections = ref<Connection[]>([])

export const downloadTotal = ref(0)
export const uploadTotal = ref(0)
export const downloadHistory = ref<number[]>([])
export const uploadHistory = ref<number[]>([])

export const downloadSpeedTotal = ref(0)
export const uploadSpeedTotal = ref(0)

export const memory = ref(0)
export const memoryHistory = ref<number[]>([])

export const quickFilterRegex = useStorage<string>('config/quick-filter-regex', 'dns|direct')
export const quickFilterEnabled = useStorage<boolean>('config/quick-filter-enabled', false)
export const showActiveConnections = ref(true)

export enum SORT_TYPE {
  HOST = 'host',
  CHAINS = 'chains',
  RULE = 'rule',
  TYPE = 'type',
  CONNECT_TIME = 'connectTime',
  DOWNLOAD = 'download',
  DOWNLOAD_SPEED = 'downloadSpeed',
  UPLOAD = 'upload',
  UPLOAD_SPEED = 'uploadSpeed',
  SOURCE_IP = 'sourceIP',
}

const sortFunctionMap: Record<SORT_TYPE, (a: Connection, b: Connection) => number> = {
  [SORT_TYPE.HOST]: (a: Connection, b: Connection) => {
    return (a.metadata.host || a.metadata.destinationIP).localeCompare(
      b.metadata.host || b.metadata.destinationIP,
    )
  },
  [SORT_TYPE.RULE]: (a: Connection, b: Connection) => {
    return a.rule.localeCompare(b.rule)
  },
  [SORT_TYPE.CHAINS]: (a: Connection, b: Connection) => {
    return a.chains.join('').localeCompare(b.chains.join(''))
  },
  [SORT_TYPE.DOWNLOAD]: (a: Connection, b: Connection) => {
    return b.download - a.download
  },
  [SORT_TYPE.DOWNLOAD_SPEED]: (a: Connection, b: Connection) => {
    return b.downloadSpeed - a.downloadSpeed
  },
  [SORT_TYPE.UPLOAD]: (a: Connection, b: Connection) => {
    return b.upload - a.upload
  },
  [SORT_TYPE.UPLOAD_SPEED]: (a: Connection, b: Connection) => {
    return b.uploadSpeed - a.uploadSpeed
  },
  [SORT_TYPE.SOURCE_IP]: (a: Connection, b: Connection) => {
    return a.metadata.sourceIP.localeCompare(b.metadata.sourceIP)
  },
  [SORT_TYPE.TYPE]: (a: Connection, b: Connection) => {
    return (a.metadata.type + a.metadata.network).localeCompare(
      b.metadata.type + b.metadata.network,
    )
  },
  [SORT_TYPE.CONNECT_TIME]: (a: Connection, b: Connection) => {
    return dayjs(b.start).valueOf() - dayjs(a.start).valueOf()
  },
}

export const connectionSortType = useStorage<SORT_TYPE>(
  'config/connection-sort-type',
  SORT_TYPE.HOST,
)
export const connectionFilter = ref('')
export const isPaused = ref(false)

export const renderConnections = computed(() => {
  return (showActiveConnections.value ? activeConnections.value : closedConnections.value)
    .filter((conn) => {
      if (quickFilterEnabled.value && quickFilterRegex.value) {
        const regex = new RegExp(quickFilterRegex.value)

        return !(
          regex.test(conn.chains.join('')) ||
          regex.test(conn.metadata.host) ||
          regex.test(conn.metadata.destinationIP)
        )
      }

      return true
    })
    .filter((conn) => {
      if (connectionFilter.value) {
        return [
          conn.metadata.host,
          conn.metadata.destinationIP,
          conn.metadata.destinationPort,
          conn.metadata.sourceIP,
          conn.metadata.sourcePort,
          conn.metadata.processPath,
          conn.metadata.type,
          conn.metadata.network,
          conn.chains,
          conn.rule,
        ].some((i) => i?.includes(connectionFilter.value))
      }

      return true
    })
    .sort((a, b) => {
      return a.id.localeCompare(b.id)
    })
    .sort(sortFunctionMap[connectionSortType.value])
})

let cancel: () => void

export const initConnections = () => {
  cancel?.()
  activeConnections.value = []
  closedConnections.value = []
  downloadHistory.value = []
  uploadHistory.value = []
  memoryHistory.value = []
  downloadTotal.value = 0
  uploadTotal.value = 0
  downloadSpeedTotal.value = 0
  uploadSpeedTotal.value = 0
  memory.value = 0

  const ws = fetchConnectionsAPI<string>()
  const unwatch = watch(ws.data, (data) => {
    if (!data) return

    const parsedData = JSON.parse(data) as {
      connections: ConnectionRawMessage[]
      downloadTotal: number
      uploadTotal: number
      memory: number
    }

    downloadSpeedTotal.value =
      downloadTotal.value === 0 ? 0 : parsedData.downloadTotal - downloadTotal.value
    uploadSpeedTotal.value =
      uploadTotal.value === 0 ? 0 : parsedData.uploadTotal - uploadTotal.value

    downloadTotal.value = parsedData.downloadTotal
    uploadTotal.value = parsedData.uploadTotal

    memory.value = parsedData.memory

    downloadHistory.value.push(downloadSpeedTotal.value)
    uploadHistory.value.push(uploadSpeedTotal.value)
    memoryHistory.value.push(parsedData.memory)

    downloadHistory.value = downloadHistory.value.slice(-60)
    uploadHistory.value = uploadHistory.value.slice(-60)
    memoryHistory.value = memoryHistory.value.slice(-60)

    if (isPaused.value) {
      return
    }

    closedConnections.value = [
      ...closedConnections.value,
      ...differenceWith(activeConnections.value, parsedData.connections, (a, b) => a.id === b.id),
    ]
    activeConnections.value =
      parsedData.connections?.map((connection) => {
        const preConnection = activeConnections.value.find((c) => c.id === connection.id) ?? {
          download: 0,
          upload: 0,
        }

        return {
          ...connection,
          downloadSpeed: connection.download - preConnection.download,
          uploadSpeed: connection.upload - preConnection.upload,
        }
      }) ?? []
  })

  cancel = () => {
    unwatch()
    ws.close()
  }
}
