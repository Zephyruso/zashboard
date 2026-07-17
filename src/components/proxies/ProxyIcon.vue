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
import { computed, ref, watchEffect } from 'vue'

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
const DOM_STARTS_WITH = 'data:image/svg+xml,'
const isDom = computed(() => {
  return props.icon.startsWith(DOM_STARTS_WITH)
})

// dompurify(29KB)按需加载:仅配置了 SVG 图标时才需要
const pureDom = ref('')

watchEffect(async () => {
  if (!isDom.value) {
    pureDom.value = ''
    return
  }
  const raw = props.icon.replace(DOM_STARTS_WITH, '')
  const { default: DOMPurify } = await import('dompurify')

  if (props.icon.startsWith(DOM_STARTS_WITH) && props.icon.replace(DOM_STARTS_WITH, '') === raw) {
    pureDom.value = DOMPurify.sanitize(raw)
  }
})
</script>
