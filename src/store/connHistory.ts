import {
  getConnectionChains,
  getConnectionDownload,
  getConnectionHostname,
  getConnectionOutboundNode,
  getConnectionSourceIP,
  getConnectionUpload,
  getProcessFromConnection,
} from '@/helper'
import {
  ConnectionHistoryType,
  getConnectionHistoryFromIndexedDB,
  getTrafficMatrixFromIndexedDB,
  saveConnectionHistoryToIndexedDB,
  saveTrafficMatrixToIndexedDB,
  type ConnectionHistoryData,
  type TrafficMatrixData,
} from '@/helper/indexeddb'
import type { Connection } from '@/types'
import ipaddr from 'ipaddr.js'
import { ref } from 'vue'
import { activeBackend } from './setup'

const isInitializedPromise = ref(
  new Promise((resolve) => {
    resolve(false)
  }),
)
const uuid = () => activeBackend.value?.uuid || ''
const allHistoryTypes = [
  ConnectionHistoryType.SourceIP,
  ConnectionHistoryType.Destination,
  ConnectionHistoryType.Process,
  ConnectionHistoryType.Outbound,
  ConnectionHistoryType.Node,
]

export const aggregatedDataMap = ref<Record<ConnectionHistoryType, ConnectionHistoryData[]>>({
  [ConnectionHistoryType.SourceIP]: [],
  [ConnectionHistoryType.Destination]: [],
  [ConnectionHistoryType.Process]: [],
  [ConnectionHistoryType.Outbound]: [],
  [ConnectionHistoryType.Node]: [],
})

export const trafficMatrixData = ref<TrafficMatrixData[]>([])

const emptyAggregatedDataMap = (): Record<ConnectionHistoryType, ConnectionHistoryData[]> => ({
  [ConnectionHistoryType.SourceIP]: [],
  [ConnectionHistoryType.Destination]: [],
  [ConnectionHistoryType.Process]: [],
  [ConnectionHistoryType.Outbound]: [],
  [ConnectionHistoryType.Node]: [],
})

export const initAggregatedDataMap = () => {
  aggregatedDataMap.value = emptyAggregatedDataMap()
  trafficMatrixData.value = []
  isInitializedPromise.value = new Promise(async (resolve) => {
    for (const type of allHistoryTypes) {
      const historicalData = await getConnectionHistoryFromIndexedDB(uuid(), type)

      let finalData = historicalData
      if (historicalData.length > 2000) {
        finalData = historicalData.sort((a, b) => b.download - a.download).slice(0, 1500)
        await saveConnectionHistoryToIndexedDB(uuid(), type, finalData)
      }

      aggregatedDataMap.value[type] = finalData
    }

    const matrixData = await getTrafficMatrixFromIndexedDB(uuid())
    if (matrixData.length > 5000) {
      const trimmed = matrixData
        .sort((a, b) => b.download + b.upload - (a.download + a.upload))
        .slice(0, 4000)
      trafficMatrixData.value = trimmed
      await saveTrafficMatrixToIndexedDB(uuid(), trimmed)
    } else {
      trafficMatrixData.value = matrixData
    }

    resolve(true)
  })
}

export const aggregateConnections = (
  connections: Connection[],
  type: ConnectionHistoryType,
): ConnectionHistoryData[] => {
  const map = new Map<string, ConnectionHistoryData>()

  connections.forEach((connection) => {
    let key: string = ''

    if (type === ConnectionHistoryType.SourceIP) {
      key = getConnectionSourceIP(connection)
    } else if (type === ConnectionHistoryType.Destination) {
      const hostkey = getConnectionHostname(connection)
      if (ipaddr.IPv4.isValid(hostkey) || ipaddr.IPv6.isValid(hostkey)) {
        key = hostkey
      } else {
        key = hostkey.split('.').slice(-2).join('.')
      }
    } else if (type === ConnectionHistoryType.Process) {
      key = getProcessFromConnection(connection)
    } else if (type === ConnectionHistoryType.Outbound) {
      key = getConnectionChains(connection)[0] || '-'
    } else if (type === ConnectionHistoryType.Node) {
      key = getConnectionOutboundNode(connection)
    }

    if (map.has(key)) {
      const existing = map.get(key)!
      existing.download += getConnectionDownload(connection)
      existing.upload += getConnectionUpload(connection)
      existing.count += 1
    } else {
      map.set(key, {
        key,
        download: getConnectionDownload(connection),
        upload: getConnectionUpload(connection),
        count: 1,
      })
    }
  })

  return Array.from(map.values())
}

const getMatrixKey = (sourceIP: string, outbound: string) => `${sourceIP}\0${outbound}`

export const aggregateTrafficMatrix = (connections: Connection[]): TrafficMatrixData[] => {
  const map = new Map<string, TrafficMatrixData>()

  connections.forEach((connection) => {
    const sourceIP = getConnectionSourceIP(connection)
    const outbound = getConnectionOutboundNode(connection)
    const key = getMatrixKey(sourceIP, outbound)

    if (map.has(key)) {
      const existing = map.get(key)!
      existing.download += getConnectionDownload(connection)
      existing.upload += getConnectionUpload(connection)
      existing.count += 1
    } else {
      map.set(key, {
        sourceIP,
        outbound,
        download: getConnectionDownload(connection),
        upload: getConnectionUpload(connection),
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

export const mergeTrafficMatrixData = (
  historical: TrafficMatrixData[],
  newData: TrafficMatrixData[],
): TrafficMatrixData[] => {
  const map = new Map<string, TrafficMatrixData>()

  historical.forEach((item) => {
    map.set(getMatrixKey(item.sourceIP, item.outbound), { ...item })
  })

  newData.forEach((item) => {
    const key = getMatrixKey(item.sourceIP, item.outbound)
    if (map.has(key)) {
      const existing = map.get(key)!
      existing.download += item.download
      existing.upload += item.upload
      existing.count += item.count
    } else {
      map.set(key, { ...item })
    }
  })

  return Array.from(map.values())
}

export const saveConnectionHistory = async (newClosedConnections: Connection[]) => {
  if (newClosedConnections.length === 0) {
    return
  }

  await isInitializedPromise.value

  for (const type of allHistoryTypes) {
    try {
      const newAggregatedData = aggregateConnections(newClosedConnections, type)
      const historicalData = aggregatedDataMap.value[type]
      const mergedData = mergeAggregatedData(historicalData, newAggregatedData)

      aggregatedDataMap.value[type] = mergedData
      await saveConnectionHistoryToIndexedDB(uuid(), type, mergedData)
    } catch (error) {
      console.error(`Failed to save connection history for ${type}:`, error)
    }
  }

  try {
    const newMatrixData = aggregateTrafficMatrix(newClosedConnections)
    const mergedMatrix = mergeTrafficMatrixData(trafficMatrixData.value, newMatrixData)

    trafficMatrixData.value = mergedMatrix
    await saveTrafficMatrixToIndexedDB(uuid(), mergedMatrix)
  } catch (error) {
    console.error('Failed to save traffic matrix:', error)
  }
}
