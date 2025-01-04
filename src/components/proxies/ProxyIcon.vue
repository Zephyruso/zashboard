<template>
  <div
    v-if="isDom"
    :class="['inline-block', fill || 'fill-primary']"
    :style="style"
    v-html="pureDom"
  />
  <img
    v-else
    :style="style"
    :src="cachedIcon"
  />
</template>

<script setup lang="ts">
import { iconMarginRight, iconSize } from '@/store/settings'
import DOMPurify from 'dompurify'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  icon: string
  fill?: string
  size?: string
}>()

const style = computed(() => {
  return {
    width: (props.size === 'small' ? iconSize.value : iconSize.value + 4) + 'px',
    marginRight: iconMarginRight.value - 4 + 'px',
  }
})
const DOM_STARTS_WITH = 'data:image/svg+xml,'
const isDom = computed(() => {
  return props.icon.startsWith(DOM_STARTS_WITH)
})

const pureDom = computed(() => {
  if (!isDom.value) return
  return DOMPurify.sanitize(props.icon.replace(DOM_STARTS_WITH, ''))
})

const cachedIcon = ref('')

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('iconCache', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('icons')) {
        db.createObjectStore('icons')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const dbPromise = openDatabase()

const executeTransaction = async <T,>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const db = await dbPromise
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = operation(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const getIconFromDB = (key: string) =>
  executeTransaction<string | null>('icons', 'readonly', (store) => store.get(key))

const saveIconToDB = async (key: string, data: string) => {
  await executeTransaction('icons', 'readwrite', (store) => store.put(data, key))
}

const fetchAndCacheIcon = async (key: string, iconUrl: string) => {
  const response = await fetch(iconUrl)
  const blob = await response.blob()
  const reader = new FileReader()
  reader.onload = async () => {
    const dataUrl = reader.result as string
    await saveIconToDB(key, dataUrl)
    cachedIcon.value = dataUrl
  }
  reader.readAsDataURL(blob)
}

const loadIcon = async () => {
  const key = props.icon
  try {
    const cachedData = await getIconFromDB(key)
    if (cachedData) {
      cachedIcon.value = cachedData
    } else {
      await fetchAndCacheIcon(key, key)
    }
  } catch (error) {
    console.error('Fallback to original icon:', error)
    cachedIcon.value = props.icon
  }
}

onMounted(() => {
  if (!isDom.value) {
    loadIcon()
  } else {
    cachedIcon.value = props.icon
  }
})
</script>
