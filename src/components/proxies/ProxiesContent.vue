<script setup lang="ts">
import { useCalculateMaxProxies } from '@renderer/composables/calculateMaxProxies'
import { handlerProxySelect } from '@renderer/store/proxies'
import { computed } from 'vue'
import { SCROLLABLE_PARENT_CLASS } from '../../helper/utils'
import ProxyNodeCard from './ProxyNodeCard.vue'
import ProxyNodeGrid from './ProxyNodeGrid.vue'

const props = defineProps<{
  name: string
  now: string
  renderProxies: string[]
  showFullContent: boolean
}>()

const { maxProxies } = useCalculateMaxProxies()
const proxies = computed(() =>
  props.showFullContent ? props.renderProxies : props.renderProxies.slice(0, maxProxies.value),
)
</script>

<template>
  <ProxyNodeGrid
    ref="grid"
    :class="SCROLLABLE_PARENT_CLASS"
  >
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
