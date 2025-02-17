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
import { computed, ref, watch } from 'vue'

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

const cachedIcon = ref(props.icon)
const setCachedIcon = (icon: string) => {
  if (cachedIcon.value !== icon) {
    cachedIcon.value = icon
  }
}

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
      setCachedIcon(cachedData)
    } else {
      setCachedIcon(props.icon)
      await fetchAndCacheIcon(key, key)
    }
  } catch {
    setCachedIcon(props.icon)
  }
}

const initIcon = () => {
  if (!isDom.value) {
    loadIcon()
  } else {
    cachedIcon.value = props.icon
  }
}

initIcon()

watch(() => props.icon, initIcon)
</script>
