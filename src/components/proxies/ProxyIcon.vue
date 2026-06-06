<template>
  <div
    v-if="isDom"
    :class="['inline-block', fill || 'fill-primary']"
    :style="style"
    v-html="pureDom"
  />
  <img
    v-else
    class="inline-block"
    :style="style"
    :src="icon"
  />
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import { computed } from 'vue'

const DOM_STARTS_WITH = 'data:image/svg+xml,'
const purifiedSvgCache = new Map<string, string>()

const props = withDefaults(
  defineProps<{
    icon: string
    fill?: string
    size?: number
    margin?: number
  }>(),
  {
    size: 16,
    margin: 4,
  },
)

const style = computed(() => {
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    marginRight: `${props.margin}px`,
  }
})
const isDom = computed(() => {
  return props.icon.startsWith(DOM_STARTS_WITH)
})

const pureDom = computed(() => {
  if (!isDom.value) return ''

  const cached = purifiedSvgCache.get(props.icon)
  if (cached !== undefined) return cached

  const sanitized = DOMPurify.sanitize(props.icon.replace(DOM_STARTS_WITH, ''))

  purifiedSvgCache.set(props.icon, sanitized)
  return sanitized
})
</script>
