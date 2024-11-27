<template>
  <div class="h-full overflow-y-auto overflow-x-hidden p-2">
    <ProxiesCtrl
      :vertical="true"
      v-if="isSiderbarCollapsed"
    />
    <template v-if="isLargeScreen && twoColumns && renderGroups.length > 1">
      <div class="grid grid-cols-2 gap-1">
        <div
          v-for="idx in [0, 1]"
          :key="idx"
          class="flex flex-1 flex-col gap-1"
        >
          <component
            v-for="name in filterContent(renderGroups, idx)"
            :is="Comp"
            :key="name"
            :name="name"
          />
        </div>
      </div>
    </template>
    <div
      class="grid grid-cols-1 gap-1"
      v-else
    >
      <component
        v-for="name in renderGroups"
        :is="Comp"
        :key="name"
        :name="name"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ProxyGroup from '@/components/proxies/ProxyGroup.vue'
import ProxyProvider from '@/components/proxies/ProxyProvider.vue'
import { isSiderbarCollapsed } from '@/components/sidebar/config'
import ProxiesCtrl from '@/components/sidebar/ProxiesCtrl.vue'
import { isLargeScreen } from '@/helper'
import { proxiesTabShow, PROXY_TAB_TYPE, showGlobalProxy, twoColumns } from '@/store/config'
import { GLOBAL, proxyGroups, proxyProviederList } from '@/store/proxies'
import { computed } from 'vue'

const Comp = computed(() =>
  proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER ? ProxyProvider : ProxyGroup,
)
const renderGroups = computed(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER) {
    return proxyProviederList.value.map((group) => group.name)
  }
  if (showGlobalProxy.value && proxyGroups.value.length) {
    return [...proxyGroups.value, GLOBAL]
  }
  return proxyGroups.value
})

const filterContent: <T>(all: T[], target: number) => T[] = (all, target) => {
  return all.filter((_, index: number) => index % 2 === target)
}
</script>
