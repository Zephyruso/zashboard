import { useWindowSize } from '@vueuse/core'
import { computed } from 'vue'

const windowSize = useWindowSize()

export const isLargeScreen = computed(() => {
  return windowSize.width.value > 1280
})

export const isMiddleScreen = computed(() => {
  return windowSize.width.value < 768
})

const BACKGROUND_IMAGE = 'background-image'
export const LOCAL_IMAGE = 'local-image'

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
      request.onsuccess = () => {
        const db = request.result
        const store = db.transaction(dbKey, 'readonly').objectStore(dbKey)
        const cursorRequest = store.openCursor()

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result

          if (cursor) {
            cacheMap.set(cursor.key as string, cursor.value.value)
            cursor.continue()
          } else {
            resolve(request.result)
          }
        }
        cursorRequest.onerror = () => reject(cursorRequest.error)
      }
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
    cacheMap.set(key, value)
    return executeTransaction('readwrite', (store) =>
      store.put({
        key,
        value,
      }),
    )
  }

  const get = async (key: string) => {
    await dbPromise
    return cacheMap.get(key)
  }

  const clear = async () => {
    cacheMap.clear()
    return executeTransaction('readwrite', (store) => store.clear())
  }

  const isExists = async (key: string) => {
    await dbPromise
    return cacheMap.has(key)
  }

  const del = async (key: string) => {
    cacheMap.delete(key)
    return executeTransaction('readwrite', (store) => store.delete(key))
  }

  const getAllKeys = async () => {
    await dbPromise
    return Array.from(cacheMap.keys())
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

export const saveBase64ToIndexedDB = (val: string) => backgroundDB.put(BACKGROUND_IMAGE, val)
export const getBase64FromIndexedDB = () => backgroundDB.get(BACKGROUND_IMAGE)
export const deleteBase64FromIndexedDB = () => backgroundDB.clear()

const iconDB = useIndexedDB('iconCache')

export const saveIconToIndexedDB = iconDB.put
export const getIconFromIndexedDB = (key: string) => iconDB.get(key)
export const clearIconFromIndexedDB = () => iconDB.clear()
export const getAllIconKeys = () => iconDB.getAllKeys()
export const deleteIconFromIndexedDB = (key: string) => iconDB.del(key)
