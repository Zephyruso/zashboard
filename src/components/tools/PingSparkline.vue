<template>
  <svg
    width="100%"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="none"
    class="block"
  >
    <template v-if="points.length > 1">
      <polygon
        :points="areaPoints"
        :fill="color"
        opacity="0.1"
      />
      <polyline
        :points="linePoints"
        fill="none"
        :stroke="color"
        stroke-width="1.8"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
    </template>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ data: number[]; height?: number; color?: string; capacity?: number }>(),
  { height: 56, color: 'currentColor', capacity: 30 },
)

const width = 300

const points = computed(() => {
  const max = Math.max(...props.data, 1)
  const stepX = width / Math.max(props.capacity - 1, 1)
  const offset = Math.max(0, props.capacity - props.data.length)
  return props.data.map((value, index) => {
    const x = (offset + index) * stepX
    const y = props.height - 3 - (value / (max * 1.2)) * (props.height - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
})

const linePoints = computed(() => points.value.join(' '))
const areaPoints = computed(() => {
  const pts = points.value
  const firstX = pts[0].split(',')[0]
  const lastX = pts[pts.length - 1].split(',')[0]
  return `${firstX},${props.height} ${pts.join(' ')} ${lastX},${props.height}`
})
</script>
