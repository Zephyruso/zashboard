<script setup lang="ts">
import { useCalculateMaxProxies } from '@/composables/proxiesScroll'
import { handlerProxySelect, providerNameByProxy, proxyMap } from '@/store/proxies'
import { computed } from 'vue'
import ProxyNodeCard from './ProxyNodeCard.vue'
import ProxyNodeGrid from './ProxyNodeGrid.vue'

type ProviderProxyGroup = {
  providerName: string
  proxies: string[]
}

const props = defineProps<{
  name: string
  now: string
  renderProxies: string[]
}>()

const activeIndex = computed(() => props.renderProxies.indexOf(props.now))

const { maxProxies } = useCalculateMaxProxies(() => props.renderProxies.length, activeIndex)

const visibleProxies = computed(() => {
  if (maxProxies.value >= props.renderProxies.length) {
    return props.renderProxies
  }

  return props.renderProxies.slice(0, maxProxies.value)
})

const groupedProxies = computed(() => {
  const groupedProxiesByProvider = new Map<string, ProviderProxyGroup>()
  const groupedProxies: ProviderProxyGroup[] = []
  let fallbackProviderNameByProxy: Map<string, string> | undefined

  const getFallbackProviderName = (proxy: string) => {
    fallbackProviderNameByProxy ??= providerNameByProxy.value
    return fallbackProviderNameByProxy.get(proxy)
  }

  for (const proxy of visibleProxies.value) {
    const proxyNode = proxyMap.value[proxy]
    const providerName = proxyNode['provider-name'] || getFallbackProviderName(proxy) || ''

    let providerProxies = groupedProxiesByProvider.get(providerName)

    if (!providerProxies) {
      providerProxies = {
        providerName,
        proxies: [],
      }

      if (providerName === '') {
        groupedProxies.unshift(providerProxies)
      } else {
        groupedProxies.push(providerProxies)
      }

      groupedProxiesByProvider.set(providerName, providerProxies)
    }

    providerProxies.proxies.push(proxy)
  }

  return groupedProxies
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="{ providerName, proxies } in groupedProxies"
      :key="providerName || '__default_provider__'"
    >
      <p
        class="my-2 text-sm font-semibold"
        v-if="providerName !== ''"
      >
        {{ providerName }}
      </p>
      <ProxyNodeGrid>
        <ProxyNodeCard
          v-for="node in proxies"
          :key="node"
          :name="node"
          :group-name="name"
          :active="node === now"
          :auto-scroll-active="false"
          :nested-scroll-surface="true"
          @click.stop="handlerProxySelect(name, node)"
        />
      </ProxyNodeGrid>
    </div>
  </div>
</template>
