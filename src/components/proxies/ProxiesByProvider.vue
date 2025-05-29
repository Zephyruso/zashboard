<script setup lang="ts">
import { useCalculateMaxProxies } from '@renderer/composables/calculateMaxProxies'
import { handlerProxySelect, proxyProviederList } from '@renderer/store/proxies'
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

const groupedProxies = computed(() => {
  const groupdProixes: Record<string, string[]> = {}
  const providerKeys: string[] = []

  for (const proxy of props.renderProxies) {
    const providerName =
      proxyProviederList.value.find((group) => group.proxies.find((node) => node.name === proxy))
        ?.name ?? ''

    if (groupdProixes[providerName]) {
      groupdProixes[providerName].push(proxy)
    } else {
      if (providerName === '') {
        providerKeys.unshift('')
      } else {
        providerKeys.push(providerName)
      }

      groupdProixes[providerName] = [proxy]
    }
  }

  return providerKeys.map((providerName) => [providerName, groupdProixes[providerName]])
})

const { maxProxies } = useCalculateMaxProxies()
</script>

<template>
  <div
    class="flex max-h-108 flex-col gap-2 overflow-x-hidden overflow-y-auto"
    :class="SCROLLABLE_PARENT_CLASS"
  >
    <div
      v-for="([providerName, proxies], index) in groupedProxies"
      :key="index"
    >
      <p
        v-if="providerName !== ''"
        class="my-2 text-sm font-semibold"
      >
        {{ providerName }}
      </p>
      <ProxyNodeGrid style="max-height: unset !important">
        <ProxyNodeCard
          v-for="node in showFullContent ? proxies : proxies.slice(0, maxProxies)"
          :key="node"
          :name="node"
          :group-name="name"
          :active="node === now"
          @click.stop="handlerProxySelect(name, node)"
        />
      </ProxyNodeGrid>
    </div>
  </div>
</template>
