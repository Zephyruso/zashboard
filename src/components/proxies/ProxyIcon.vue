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
import { isInlineSvgIcon, sanitizeInlineSvgIcon } from '@/helper/proxyIcon'
import { computed } from 'vue'

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
  return isInlineSvgIcon(props.icon)
})

const pureDom = computed(() => {
  if (!isDom.value) return
  return sanitizeInlineSvgIcon(props.icon)
})
</script>
