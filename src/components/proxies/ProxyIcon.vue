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
import { getIconFromIndexedDB, saveIconToIndexedDB } from '@/helper/utils'
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

const fetchAndCacheIcon = async (key: string, iconUrl: string) => {
  const response = await fetch(iconUrl)
  const blob = await response.blob()
  const reader = new FileReader()
  reader.onload = async () => {
    const dataUrl = reader.result as string
    await saveIconToIndexedDB(key, dataUrl)
    cachedIcon.value = dataUrl
  }
  reader.readAsDataURL(blob)
}

const loadIcon = async () => {
  const key = props.icon
  try {
    const cachedData = await getIconFromIndexedDB(key)
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
