<template>
  <div class="flex shrink-0 items-center">
    <ProxyIcon
      v-if="icon"
      :icon="icon"
      :margin="iconMargin"
      :size="iconSize"
    />
    <HighlightText
      v-if="filter"
      :text="name"
      :filter="filter"
    />
    <template v-else>{{ name }}</template>
    <template v-if="dialerProxy"> ({{ dialerProxy }}) </template>
  </div>
</template>

<script setup lang="ts">
import HighlightText from '@/components/common/HighlightText.vue'
import { proxyMap } from '@/store/proxies'
import { computed } from 'vue'
import ProxyIcon from './ProxyIcon.vue'

const props = withDefaults(
  defineProps<{
    name: string
    iconSize?: number
    iconMargin?: number
    filter?: string
  }>(),
  {
    iconSize: 16,
    iconMargin: 4,
    filter: '',
  },
)

const node = computed(() => proxyMap.value[props.name])
const icon = computed(() => {
  return node.value?.icon
})
const dialerProxy = computed(() => {
  return node.value?.['dialer-proxy']
})
</script>
