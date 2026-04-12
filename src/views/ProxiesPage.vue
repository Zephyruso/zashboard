<template>
  <div
    class="max-md:scrollbar-hidden h-full"
    :class="[
      disableProxiesPageScroll ? 'overflow-y-hidden' : 'overflow-y-scroll',
      disableProxiesPageTextSelect ? 'select-none' : '',
    ]"
    :style="padding"
    :id="PROXIES_PAGE"
    ref="proxiesRef"
    @scroll.passive="handleScroll"
  >
    <ProxiesCtrl />
    <template v-if="displayTwoColumns">
      <div class="grid grid-cols-2 gap-3 p-3 md:pr-1">
        <div
          v-for="idx in [0, 1]"
          :key="idx"
          class="flex flex-1 flex-col gap-3"
        >
          <component
            v-for="name in filterContent(renderGroups, idx)"
            :is="renderComponent"
            :key="name"
            :name="name"
          />
        </div>
      </div>
    </template>
    <div
      class="grid grid-cols-1 gap-3 p-3 md:pr-1"
      v-else
    >
      <component
        v-for="name in renderGroups"
        :is="renderComponent"
        :key="name"
        :name="name"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ProxiesCtrl from '@/components/controls/ProxiesCtrl'
import ProxyGroup from '@/components/proxies/ProxyGroup.vue'
import ProxyGroupForMobile from '@/components/proxies/ProxyGroupForMobile.vue'
import ProxyProvider from '@/components/proxies/ProxyProvider.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { disableProxiesPageScroll, isProxiesPageMounted, renderGroups } from '@/composables/proxies'
import { PROXY_TAB_TYPE } from '@/constant'
import { isMiddleScreen, PROXIES_PAGE } from '@/helper/utils'
import { fetchProxies, proxiesTabShow } from '@/store/proxies'
import { disableProxiesPageTextSelect, twoColumnProxyGroup } from '@/store/settings'
import { useSessionStorage } from '@vueuse/core'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const { padding } = usePaddingForViews({
  offsetTop: 0,
  offsetBottom: 0,
})
const proxiesRef = ref()
const scrollStatus = useSessionStorage('cache/proxies-scroll-status', {
  [PROXY_TAB_TYPE.PROVIDER]: 0,
  [PROXY_TAB_TYPE.PROXIES]: 0,
})

const handleScroll = () => {
  if (!proxiesRef.value) return
  scrollStatus.value[proxiesTabShow.value] = proxiesRef.value.scrollTop
}

const waitTickUntilReady = (startTime = performance.now()) => {
  const proxiesEl = proxiesRef.value
  const isTimedOut = performance.now() - startTime > 300

  if (
    isTimedOut ||
    (proxiesEl && proxiesEl.scrollHeight > scrollStatus.value[proxiesTabShow.value])
  ) {
    if (!proxiesEl) return
    proxiesEl.scrollTo({
      top: scrollStatus.value[proxiesTabShow.value],
      behavior: 'smooth',
    })
  } else {
    requestAnimationFrame(() => {
      waitTickUntilReady(startTime)
    })
  }
}

watch(proxiesTabShow, () =>
  nextTick(() => {
    waitTickUntilReady()
  }),
)

isProxiesPageMounted.value = false

onMounted(() => {
  setTimeout(() => {
    isProxiesPageMounted.value = true
    nextTick(() => {
      waitTickUntilReady()
      fetchProxies()
    })
  })
})

const renderComponent = computed(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER) {
    return ProxyProvider
  }

  if (isMiddleScreen.value && displayTwoColumns.value) {
    return ProxyGroupForMobile
  }

  return ProxyGroup
})

const displayTwoColumns = computed(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER && isMiddleScreen.value) {
    return false
  }
  return twoColumnProxyGroup.value && renderGroups.value.length > 1
})

const filterContent: <T>(all: T[], target: number) => T[] = (all, target) => {
  return all.filter((_, index: number) => index % 2 === target)
}
</script>
