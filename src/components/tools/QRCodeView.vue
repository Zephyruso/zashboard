<template>
  <svg
    class="h-auto w-full max-w-64 rounded bg-white p-3"
    :viewBox="`0 0 ${qr.size} ${qr.size}`"
    role="img"
    :aria-label="value"
  >
    <path
      :d="path"
      fill="#000"
      shape-rendering="crispEdges"
    />
  </svg>
</template>

<script setup lang="ts">
import { encode as encodeQR } from 'uqr'
import { computed } from 'vue'

const props = defineProps<{ value: string }>()

const qr = computed(() => encodeQR(props.value, { border: 2 }))

const path = computed(() => {
  const parts: string[] = []
  qr.value.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) parts.push(`M${x} ${y}h1v1h-1z`)
    }),
  )
  return parts.join('')
})
</script>
