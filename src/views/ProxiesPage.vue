<template>
  <div
    class="flex h-full w-full flex-col"
    :style="padding"
    :class="[disableProxiesPageTextSelect ? 'select-none' : '']"
  >
    <ProxiesCtrl />
    <div class="flex min-h-0 w-full flex-1">
      <FolderManagerPanel v-if="foldersUiVisible && folderManagerOpen" />
      <div
        class="smooth-scroll-container max-md:scrollbar-hidden relative h-full min-w-0 flex-1"
        :class="disableProxiesPageScroll ? 'overflow-y-hidden' : 'overflow-y-scroll'"
        :style="scrollPaddingStyle"
        :id="PROXIES_PAGE"
        ref="proxiesRef"
        @scroll.passive="handleScroll"
      >
        <FolderTopBar v-if="foldersUiVisible" />
        <template v-if="renderPageItems.length === 0">
          <EmptyState
            :icon="GlobeAltIcon"
            :title="$t('noProxyGroups')"
            :description="$t('noProxyGroupsDesc')"
          />
        </template>
        <template v-else-if="displayTwoColumns">
          <div
            class="grid grid-cols-2 gap-3 p-3 md:pr-1"
            :style="contentPaddingStyle"
          >
            <div
              v-for="idx in [0, 1]"
              :key="idx"
              class="flex flex-1 flex-col gap-3"
            >
              <component
                v-for="name in twoColumnRenderPageItems[idx]"
                :is="renderComponent"
                :key="name"
                :name="name"
              />
            </div>
          </div>
        </template>
        <div
          class="grid grid-cols-1 gap-3 p-3 md:pr-1"
          :style="contentPaddingStyle"
          v-else
        >
          <component
            v-for="name in renderPageItems"
            :is="renderComponent"
            :key="name"
            :name="name"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import ProxiesCtrl from '@/components/controls/ProxiesCtrl'
import FolderManagerPanel from '@/components/proxies/folders/FolderManagerPanel.vue'
import FolderTopBar from '@/components/proxies/folders/FolderTopBar.vue'
import ProxyGroup from '@/components/proxies/ProxyGroup.vue'
import ProxyGroupForMobile from '@/components/proxies/ProxyGroupForMobile.vue'
import ProxyProvider from '@/components/proxies/ProxyProvider.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import {
  disableProxiesPageScroll,
  isProxiesPageMounted,
  renderProxiesPageItems,
} from '@/composables/proxies'
import { PROXY_TAB_TYPE } from '@/constant'
import { isMiddleScreen, PROXIES_PAGE } from '@/helper/utils'
import { GlobeAltIcon } from '@heroicons/vue/24/outline'
import { fetchProxies, proxiesTabShow } from '@/store/proxies'
import { disableProxiesPageTextSelect, twoColumnProxyGroup } from '@/store/settings'
import { folderManagerOpen, isProxyFolderModeActive } from '@/store/proxyFolders'
import { useSessionStorage } from '@vueuse/core'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const { padding, paddingBottom } = usePaddingForViews({
  offsetTop: 0,
  offsetBottom: 0,
})
const scrollPaddingStyle = computed(() => ({
  scrollPaddingBottom: `${paddingBottom.value}px`,
}))
const contentPaddingStyle = computed(() => ({
  paddingBottom: isMiddleScreen.value ? `${paddingBottom.value + 12}px` : undefined,
}))
const renderPageItems = renderProxiesPageItems
const proxiesRef = ref()
const scrollStatus = useSessionStorage('cache/proxies-scroll-status', {
  [PROXY_TAB_TYPE.PROVIDER]: 0,
  [PROXY_TAB_TYPE.PROXIES]: 0,
})
let scrollSaveFrame: number | undefined
let restoreScrollFrame: number | undefined
let mountedTimer: ReturnType<typeof setTimeout> | undefined
let restoreScrollSeq = 0

const saveScrollStatus = () => {
  scrollSaveFrame = undefined
  if (!proxiesRef.value) return
  scrollStatus.value[proxiesTabShow.value] = proxiesRef.value.scrollTop
}

const handleScroll = () => {
  if (scrollSaveFrame !== undefined) return
  scrollSaveFrame = requestAnimationFrame(saveScrollStatus)
}

const waitTickUntilReady = (
  targetTab: PROXY_TAB_TYPE,
  sequence: number,
  startTime = performance.now(),
) => {
  if (sequence !== restoreScrollSeq) return

  const proxiesEl = proxiesRef.value
  const isTimedOut = performance.now() - startTime > 300
  const targetScrollTop = scrollStatus.value[targetTab]

  if (isTimedOut || (proxiesEl && proxiesEl.scrollHeight > targetScrollTop)) {
    if (!proxiesEl) return
    if (sequence !== restoreScrollSeq || proxiesTabShow.value !== targetTab) return
    proxiesEl.scrollTop = targetScrollTop
  } else {
    if (restoreScrollFrame !== undefined) cancelAnimationFrame(restoreScrollFrame)
    restoreScrollFrame = requestAnimationFrame(() => {
      restoreScrollFrame = undefined
      waitTickUntilReady(targetTab, sequence, startTime)
    })
  }
}

const scheduleScrollRestore = () => {
  const targetTab = proxiesTabShow.value
  const sequence = ++restoreScrollSeq

  if (restoreScrollFrame !== undefined) {
    cancelAnimationFrame(restoreScrollFrame)
    restoreScrollFrame = undefined
  }

  nextTick(() => {
    waitTickUntilReady(targetTab, sequence)
  })
}

watch(proxiesTabShow, scheduleScrollRestore)

isProxiesPageMounted.value = false

onMounted(() => {
  mountedTimer = setTimeout(() => {
    mountedTimer = undefined
    isProxiesPageMounted.value = true
    nextTick(() => {
      scheduleScrollRestore()
      fetchProxies()
    })
  })
})

onUnmounted(() => {
  if (mountedTimer !== undefined) clearTimeout(mountedTimer)
  if (restoreScrollFrame !== undefined) cancelAnimationFrame(restoreScrollFrame)
  if (scrollSaveFrame !== undefined) {
    cancelAnimationFrame(scrollSaveFrame)
    saveScrollStatus()
  }
  restoreScrollSeq++
  isProxiesPageMounted.value = false
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

const foldersUiVisible = computed(
  () => isProxyFolderModeActive.value && proxiesTabShow.value === PROXY_TAB_TYPE.PROXIES,
)

const displayTwoColumns = computed(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER && isMiddleScreen.value) {
    return false
  }
  return twoColumnProxyGroup.value && renderPageItems.value.length > 1
})

const twoColumnRenderPageItems = computed(() => {
  const columns: [string[], string[]] = [[], []]

  renderPageItems.value.forEach((name, index) => {
    columns[index % 2].push(name)
  })

  return columns
})
</script>
