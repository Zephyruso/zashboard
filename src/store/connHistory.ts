import { getProcessFromConnection } from '@/helper'
import {
  ConnectionHistoryType,
  getConnectionHistoryFromIndexedDB,
  saveConnectionHistoryToIndexedDB,
  type ConnectionHistoryData,
} from '@/helper/indexeddb'
import type { Connection } from '@/types'
import ipaddr from 'ipaddr.js'
import { ref } from 'vue'
import { activeBackend } from './setup'

const isInitializedPromise = ref<Promise<boolean>>(Promise.resolve(false))
const uuid = () => activeBackend.value?.uuid || ''
const HISTORY_COMPACT_THRESHOLD = 2000
const HISTORY_COMPACT_LIMIT = 1500
let initAggregatedDataMapSeq = 0
const allHistoryTypes = [
  ConnectionHistoryType.SourceIP,
  ConnectionHistoryType.Destination,
  ConnectionHistoryType.Process,
  ConnectionHistoryType.Outbound,
]

export const aggregatedDataMap = ref<Record<ConnectionHistoryType, ConnectionHistoryData[]>>({
  [ConnectionHistoryType.SourceIP]: [],
  [ConnectionHistoryType.Destination]: [],
  [ConnectionHistoryType.Process]: [],
  [ConnectionHistoryType.Outbound]: [],
})

const createEmptyAggregatedDataMap = (): Record<
  ConnectionHistoryType,
  ConnectionHistoryData[]
> => ({
  [ConnectionHistoryType.SourceIP]: [],
  [ConnectionHistoryType.Destination]: [],
  [ConnectionHistoryType.Process]: [],
  [ConnectionHistoryType.Outbound]: [],
})

const compactConnectionHistoryData = (data: ConnectionHistoryData[]) => {
  if (data.length <= HISTORY_COMPACT_THRESHOLD) {
    return data
  }

  return data.sort((a, b) => b.download - a.download).slice(0, HISTORY_COMPACT_LIMIT)
}

export const initAggregatedDataMap = () => {
  const backendUuid = uuid()
  const initSeq = ++initAggregatedDataMapSeq

  aggregatedDataMap.value = createEmptyAggregatedDataMap()
  isInitializedPromise.value = (async () => {
    const nextAggregatedDataMap = createEmptyAggregatedDataMap()

    for (const type of allHistoryTypes) {
      const historicalData = await getConnectionHistoryFromIndexedDB(backendUuid, type)

      if (initSeq !== initAggregatedDataMapSeq || backendUuid !== uuid()) {
        return false
      }

      const finalData = compactConnectionHistoryData(historicalData)
      if (finalData.length !== historicalData.length) {
        await saveConnectionHistoryToIndexedDB(backendUuid, type, finalData)
      }

      if (initSeq !== initAggregatedDataMapSeq || backendUuid !== uuid()) {
        return false
      }

      nextAggregatedDataMap[type] = finalData
    }

    aggregatedDataMap.value = nextAggregatedDataMap
    return true
  })()
}

export const aggregateConnections = (
  connections: Connection[],
  type: ConnectionHistoryType,
): ConnectionHistoryData[] => {
  const map = new Map<string, ConnectionHistoryData>()

  connections.forEach((connection) => {
    let key: string = ''

    if (type === ConnectionHistoryType.SourceIP) {
      key = connection.metadata.sourceIP
    } else if (type === ConnectionHistoryType.Destination) {
      const hostkey =
        connection.metadata.host ||
        connection.metadata.sniffHost ||
        connection.metadata.destinationIP
      if (ipaddr.IPv4.isValid(hostkey) || ipaddr.IPv6.isValid(hostkey)) {
        key = hostkey
      } else {
        key = hostkey.split('.').slice(-2).join('.')
      }
    } else if (type === ConnectionHistoryType.Process) {
      key = getProcessFromConnection(connection)
    } else if (type === ConnectionHistoryType.Outbound) {
      key = connection.chains[0] || '-'
    }

    if (map.has(key)) {
      const existing = map.get(key)!
      existing.download += connection.download
      existing.upload += connection.upload
      existing.count += 1
    } else {
      map.set(key, {
        key,
        download: connection.download,
        upload: connection.upload,
        count: 1,
      })
    }
  })

  return Array.from(map.values())
}

export const mergeAggregatedData = (
  historical: ConnectionHistoryData[],
  newData: ConnectionHistoryData[],
): ConnectionHistoryData[] => {
  const map = new Map<string, ConnectionHistoryData>()

  historical.forEach((item) => {
    map.set(item.key, { ...item })
  })

  newData.forEach((item) => {
    if (map.has(item.key)) {
      const existing = map.get(item.key)!
      existing.download += item.download
      existing.upload += item.upload
      existing.count += item.count
    } else {
      map.set(item.key, { ...item })
    }
  })

  return Array.from(map.values())
}

export const saveConnectionHistory = async (newClosedConnections: Connection[]) => {
  if (newClosedConnections.length === 0) {
    return
  }

  const backendUuid = uuid()
  if (!backendUuid) return

  const isInitialized = await isInitializedPromise.value
  if (!isInitialized || backendUuid !== uuid()) return

  for (const type of allHistoryTypes) {
    try {
      const newAggregatedData = aggregateConnections(newClosedConnections, type)
      const historicalData = aggregatedDataMap.value[type]
      const mergedData = mergeAggregatedData(historicalData, newAggregatedData)
      const finalData = compactConnectionHistoryData(mergedData)

      aggregatedDataMap.value[type] = finalData
      await saveConnectionHistoryToIndexedDB(backendUuid, type, finalData)
    } catch (error) {
      console.error(`Failed to save connection history for ${type}:`, error)
    }
  }
}
