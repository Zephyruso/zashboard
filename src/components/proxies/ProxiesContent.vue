<script setup lang="ts">
import { useCalculateMaxProxies } from '@/composables/proxiesScroll'
import { can } from '@/assembly/backend'
import { handlerProxySelect } from '@/assembly/proxies'
import { computed } from 'vue'
import ProxyNodeCard from './ProxyNodeCard.vue'
import ProxyNodeGrid from './ProxyNodeGrid.vue'

const props = defineProps<{
  name?: string
  now?: string
  renderProxies: string[]
}>()

const { maxProxies } = useCalculateMaxProxies(
  props.renderProxies.length,
  props.renderProxies.indexOf(props.now ?? ''),
)
const proxies = computed(() => props.renderProxies.slice(0, maxProxies.value))

// 通道不支持选择节点时(dae 的组策略写在配置文件里,API 只读)什么都不做 ——
// 让门面抛出去只会给用户弹一条他无能为力的错误。
const selectNode = (groupName: string, nodeName: string) => {
  if (!can('proxySelect')) return
  return handlerProxySelect(groupName, nodeName)
}
</script>

<template>
  <ProxyNodeGrid>
    <ProxyNodeCard
      v-for="node in proxies"
      :key="node"
      :name="node"
      :group-name="name"
      :active="node === now"
      @click.stop="name && selectNode(name, node)"
    />
  </ProxyNodeGrid>
</template>
