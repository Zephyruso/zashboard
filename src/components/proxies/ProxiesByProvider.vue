<script setup lang="ts">
import { useCalculateMaxProxies } from '@/composables/proxiesScroll'
import { handlerProxySelect, proxyProviederList } from '@/store/proxies'
import { computed } from 'vue'
import ProxyNodeCard from './ProxyNodeCard.vue'
import ProxyNodeGrid from './ProxyNodeGrid.vue'

const props = defineProps<{
  name: string
  now: string
  renderProxies: string[]
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

  return providerKeys.map((providerName) => ({
    providerName,
    proxies: groupdProixes[providerName],
  }))
})

const activeIndex = groupedProxies.value.reduce((acc, { proxies }) => {
  const index = proxies.indexOf(props.now)

  if (index !== -1) {
    return acc + index
  }
  return acc + proxies.length
}, 0)

const { maxProxies } = useCalculateMaxProxies(props.renderProxies.length, activeIndex)

const truncatedProxies = computed(() => {
  let displayCount = 0
  const truncatedProxies: { providerName: string; proxies: string[] }[] = []

  for (const { providerName, proxies } of groupedProxies.value) {
    if (displayCount + proxies.length > maxProxies.value) {
      truncatedProxies.push({
        providerName,
        proxies: proxies.slice(0, maxProxies.value - displayCount),
      })
      break
    } else {
      truncatedProxies.push({ providerName, proxies })
      displayCount += proxies.length
    }
  }
  return truncatedProxies
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="({ providerName, proxies }, index) in truncatedProxies"
      :key="index"
    >
      <p
        v-if="providerName !== ''"
        class="my-2 text-sm font-semibold"
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
          @click.stop="handlerProxySelect(name, node)"
        />
      </ProxyNodeGrid>
    </div>
  </div>
</template>
