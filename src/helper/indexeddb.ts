import { customBackgroundURL } from '@/store/settings'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'

const useIndexedDB = (dbKey: string) => {
  const cacheMap = new Map<string, string>()
  const openDatabase = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbKey, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(dbKey)) {
          db.createObjectStore(dbKey, { keyPath: 'key' })
        }
      }
      // 不做启动即全库预载(多后端历史会常驻数 MB~数十 MB 内存);
      // get 时按 key 惰性读 + 会话内缓存。
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

  const dbPromise = openDatabase()

  const executeTransaction = async <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ) => {
    const db = await dbPromise
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(dbKey, mode)
      const store = transaction.objectStore(dbKey)
      const request = operation(store)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const put = async (key: string, value: string) => {
    await dbPromise
    cacheMap.set(key, value)
    return executeTransaction('readwrite', (store) =>
      store.put({
        key,
        value,
      }),
    )
  }

  const get = async (key: string) => {
    if (cacheMap.has(key)) {
      return cacheMap.get(key)
    }
    const row = await executeTransaction<{ key: string; value: string } | undefined>(
      'readonly',
      (store) => store.get(key) as IDBRequest<{ key: string; value: string } | undefined>,
    )

    if (row !== undefined) {
      cacheMap.set(key, row.value)
    }
    return row?.value
  }

  const clear = async () => {
    await dbPromise
    cacheMap.clear()
    return executeTransaction('readwrite', (store) => store.clear())
  }

  const isExists = async (key: string) => {
    return (await get(key)) !== undefined
  }

  const del = async (key: string) => {
    await dbPromise
    cacheMap.delete(key)
    return executeTransaction('readwrite', (store) => store.delete(key))
  }

  const getAllKeys = async () => {
    const keys = await executeTransaction<IDBValidKey[]>('readonly', (store) => store.getAllKeys())

    return keys.map(String)
  }

  return {
    put,
    get,
    del,
    getAllKeys,
    isExists,
    clear,
  }
}

const backgroundDB = useIndexedDB('base64')
const backgroundImageKey = 'background-image'

export const saveBase64ToIndexedDB = (val: string) => backgroundDB.put(backgroundImageKey, val)
export const getBase64FromIndexedDB = () => backgroundDB.get(backgroundImageKey)
export const deleteBase64FromIndexedDB = () => backgroundDB.clear()
export const LOCAL_IMAGE = 'local-image'

const date = dayjs().format('YYYY-MM-DD')
const backgroundInDB = ref('')
const getBackgroundInDB = async () => {
  backgroundInDB.value = (await getBase64FromIndexedDB()) || ''
}

watch(
  () => customBackgroundURL.value,
  () => {
    if (customBackgroundURL.value.includes(LOCAL_IMAGE)) {
      getBackgroundInDB()
    }
  },
  {
    immediate: true,
  },
)

export const backgroundImage = computed(() => {
  if (!customBackgroundURL.value) {
    return ''
  }

  if (customBackgroundURL.value.includes(LOCAL_IMAGE)) {
    return `background-image: url('${backgroundInDB.value}');`
  }
  return `background-image: url('${customBackgroundURL.value}?v=${date}');`
})

export interface ConnectionHistoryData {
  key: string
  download: number
  upload: number
  count: number
}

export enum ConnectionHistoryType {
  SourceIP = 'sourceIP',
  Destination = 'destination',
  Process = 'process',
  Outbound = 'outbound',
  ProxyGroup = 'proxyGroup',
}

const connectionHistoryDB = useIndexedDB('connection-history')

export const saveConnectionHistoryToIndexedDB = async (
  uuid: string,
  aggregationType: ConnectionHistoryType,
  data: ConnectionHistoryData[],
) => {
  const jsonData = JSON.stringify(data)
  return connectionHistoryDB.put(`${uuid}-${aggregationType}`, jsonData)
}

export const getConnectionHistoryFromIndexedDB = async (
  uuid: string,
  aggregationType: ConnectionHistoryType,
): Promise<ConnectionHistoryData[]> => {
  const jsonData = await connectionHistoryDB.get(`${uuid}-${aggregationType}`)
  if (!jsonData) {
    return []
  }
  try {
    return JSON.parse(jsonData) as ConnectionHistoryData[]
  } catch {
    return []
  }
}

export const clearConnectionHistoryFromIndexedDB = async () => {
  return connectionHistoryDB.clear()
}
