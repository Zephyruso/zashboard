<script setup lang="ts">
import { useCalculateMaxProxies } from '@/composables/proxiesScroll'
import { handlerProxySelect } from '@/store/proxies'
import { computed } from 'vue'
import ProxyNodeCard from './ProxyNodeCard.vue'
import ProxyNodeGrid from './ProxyNodeGrid.vue'
import VirtualProxyNodeGrid from './VirtualProxyNodeGrid.vue'

const props = defineProps<{
  name: string
  now?: string
  renderProxies: string[]
}>()

const activeIndex = computed(() => props.renderProxies.indexOf(props.now ?? ''))
const isVirtualGrid = computed(() => props.renderProxies.length > 200)
const { maxProxies } = useCalculateMaxProxies(
  () => props.renderProxies.length,
  activeIndex,
  () => !isVirtualGrid.value,
)
const proxies = computed(() => props.renderProxies.slice(0, maxProxies.value))
</script>

<template>
  <VirtualProxyNodeGrid
    v-if="isVirtualGrid"
    :name="name"
    :now="now"
    :nodes="renderProxies"
  />
  <ProxyNodeGrid v-else>
    <ProxyNodeCard
      v-for="node in proxies"
      :key="node"
      :name="node"
      :group-name="name"
      :active="node === now"
      @click.stop="handlerProxySelect(name, node)"
    />
  </ProxyNodeGrid>
</template>
