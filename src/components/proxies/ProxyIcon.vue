<template>
  <div
    v-if="isDom"
    class="h-5 w-5"
    :class="inNodeCard ? 'fill-secondary' : 'fill-primary'"
    v-html="pureDom"
  />
  <img
    v-else
    class="w-5"
    :src="icon"
  />
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import { computed } from 'vue'

const props = defineProps<{
  icon: string
  inNodeCard?: boolean
}>()

const DOM_STARTS_WITH = 'data:image/svg+xml,'
const isDom = computed(() => {
  return props.icon.startsWith(DOM_STARTS_WITH)
})

const pureDom = computed(() => {
  if (!isDom.value) return
  return DOMPurify.sanitize(props.icon.replace(DOM_STARTS_WITH, ''))
})
</script>
