<template>
  <div class="w-12 badge flex items-center justify-center">
    <div :class="twMerge('text-xs', color)" v-if="latency > 0">
      {{ latency }}ms
    </div>
    <BoltIcon v-else class="w-4 h-4"/>
  </div>
</template>

<script setup lang="ts">
import { getLatencyByName } from '@/store/proxies';
import { twMerge } from 'tailwind-merge';
import { computed } from 'vue';
import { BoltIcon } from '@heroicons/vue/24/outline';
const props = defineProps<{
  name: string
}>()

const latency = computed(() => getLatencyByName(props.name))
const color = computed(() => {
  if (latency.value < 300) {
    return 'text-green-500'
  } else if (latency.value < 800) {
    return 'text-yellow-500'
  } else {
    return 'text-red-500'
  }
})
</script>