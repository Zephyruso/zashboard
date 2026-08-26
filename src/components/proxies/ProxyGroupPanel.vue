<template>
  <div
    v-if="proxyGroup"
    class="flex flex-col gap-3 p-4"
    :data-group-name="proxyGroup.name"
    @contextmenu.prevent.stop="handlerLatencyTest"
  >
    <div>
      <ProxyGroupHeaderForMobile
        v-if="isMiddleScreen"
        :name="name"
        :proxies-count="proxiesCount"
        :is-latency-testing="isLatencyTesting"
        :display-content="true"
        @latency-test="handlerLatencyTest"
      />
      <ProxyGroupHeader
        v-else
        :name="name"
        :proxies-count="proxiesCount"
        :is-latency-testing="isLatencyTesting"
        @latency-test="handlerLatencyTest"
      />
    </div>
    <div class="flex flex-col gap-2">
      <div
        v-for="{ providerName, proxies } in sections"
        :key="providerName"
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
            :active="node === proxyGroup.now"
            @click.stop="selectNode(name, node)"
          />
        </ProxyNodeGrid>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { can } from '@/assembly/backend'
import { handlerProxySelect, proxyGroupLatencyTest, proxyMap } from '@/assembly/proxies'
import { groupProxiesByProviderName, useRenderProxyList } from '@/composables/renderProxies'
import { isMiddleScreen } from '@/helper/utils'
import { groupProxiesByProvider } from '@/store/settings'
import { computed, ref } from 'vue'
import ProxyGroupHeader from './ProxyGroupHeader.vue'
import ProxyGroupHeaderForMobile from './ProxyGroupHeaderForMobile.vue'
import ProxyNodeCard from './ProxyNodeCard.vue'
import ProxyNodeGrid from './ProxyNodeGrid.vue'

const props = defineProps<{
  name: string
}>()

const proxyGroup = computed(() => proxyMap.value[props.name])
const allProxies = computed(() => proxyGroup.value?.all ?? [])
const { proxiesCount, renderProxies } = useRenderProxyList(allProxies, props.name)

const sections = computed(() => {
  if (groupProxiesByProvider.value) {
    return groupProxiesByProviderName(renderProxies.value)
  }
  return [{ providerName: '', proxies: renderProxies.value }]
})

const isLatencyTesting = ref(false)
const handlerLatencyTest = async () => {
  if (!can('proxyLatencyTest')) return
  if (isLatencyTesting.value) return

  isLatencyTesting.value = true
  try {
    await proxyGroupLatencyTest(props.name)
    isLatencyTesting.value = false
  } catch {
    isLatencyTesting.value = false
  }
}

// 通道不支持选择节点时(dae 的组策略写在配置文件里,API 只读)什么都不做 ——
// 让门面抛出去只会给用户弹一条他无能为力的错误。
const selectNode = (groupName: string, nodeName: string) => {
  if (!can('proxySelect')) return
  return handlerProxySelect(groupName, nodeName)
}
</script>
