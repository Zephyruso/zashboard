<template>
  <div
    class="flex shrink-0 items-center"
    :class="isLarge ? 'text-lg font-medium' : 'text-sm'"
  >
    <ProxyIcon
      v-if="icon"
      :icon="icon"
      :size="iconSizeComputed"
      :margin="iconMarginComputed"
    />
    {{ name }}
  </div>
</template>

<script setup lang="ts">
import { proxyMap } from '@renderer/store/proxies'
import { proxyGroupIconMargin, proxyGroupIconSize } from '@renderer/store/settings'
import { computed } from 'vue'
import ProxyIcon from './ProxyIcon.vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: 'small' | 'large'
  }>(),
  {
    size: 'small',
  },
)

const isLarge = computed(() => {
  return props.size === 'large'
})

const iconSizeComputed = computed(() => {
  return isLarge.value ? proxyGroupIconSize.value : undefined
})
const iconMarginComputed = computed(() => {
  return isLarge.value ? proxyGroupIconMargin.value : undefined
})

const icon = computed(() => {
  return proxyMap.value[props.name]?.icon
})
</script>
