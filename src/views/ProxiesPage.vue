<template>
  <div
    class="h-full overflow-y-scroll p-2 sm:pr-1"
    :class="displayTwoColumns && 'max-sm:scrollbar-hidden'"
  >
    <template v-if="displayTwoColumns">
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
import ProxyGroupForMobile from '@/components/proxies/ProxyGroupForMobile.vue'
import ProxyProvider from '@/components/proxies/ProxyProvider.vue'
import { useProxies } from '@/composables/proxies'
import { PROXY_TAB_TYPE } from '@/constant'
import { isSmallScreen, twoColumn, twoColumnWithSidebar } from '@/helper/utils'
import { fetchProxies } from '@/store/proxies'
import { isSidebarCollapsed, twoColumnProxyGroup } from '@/store/settings'
import { computed } from 'vue'

const { proxiesTabShow, renderGroups } = useProxies()

const isLargeScreen = computed(() => {
  return isSidebarCollapsed.value ? twoColumn.value : twoColumnWithSidebar.value
})

const Comp = computed(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER) {
    return ProxyProvider
  }

  return isSmallScreen.value && displayTwoColumns.value ? ProxyGroupForMobile : ProxyGroup
})

const displayTwoColumns = computed(() => {
  return (
    (isLargeScreen.value || isSmallScreen.value) &&
    twoColumnProxyGroup.value &&
    renderGroups.value.length > 1
  )
})

const filterContent: <T>(all: T[], target: number) => T[] = (all, target) => {
  return all.filter((_, index: number) => index % 2 === target)
}

fetchProxies()
</script>
