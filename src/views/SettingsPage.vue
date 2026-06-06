<template>
  <div
    class="smooth-scroll-container relative h-full overflow-y-auto"
    ref="scrollContainerRef"
  >
    <SettingsMenu
      :menu-items="menuItems"
      :active-menu-key="activeMenuKey"
      :show-active-indicator="!isTwoColumns"
      :two-columns-available="twoColumnsAvailable"
      @menu-click="handleMenuClick"
    />

    <button
      v-if="isPWA"
      type="button"
      class="btn btn-ghost btn-sm absolute top-14 right-2 z-10"
      @click="refreshPages"
    >
      <ArrowPathIcon class="h-4 w-4" />
      {{ $t('refresh') }}
    </button>

    <!-- Content Area -->
    <template v-if="isTwoColumns">
      <div
        class="mx-auto grid w-full max-w-7xl grid-cols-2 gap-12 p-3"
        :style="padding"
      >
        <div
          v-for="col in [0, 1]"
          :key="col"
          class="flex flex-col gap-3"
        >
          <div
            v-for="item in menuItems.filter((_, i) => columnAssignment[i] === col)"
            :key="item.key"
            :id="`item-${item.key}`"
            :data-key="item.key"
            class="mb-4 rounded-2xl p-2 md:mb-6"
          >
            <div
              class="text-base-content/55 mt-1 mb-2 px-3 text-[13px] font-semibold tracking-[0.05em] uppercase"
              v-if="![SETTINGS_MENU_KEY.general, SETTINGS_MENU_KEY.backend].includes(item.key)"
            >
              {{ $t(item.label) }}
            </div>
            <component :is="item.component" />
          </div>
        </div>
      </div>
    </template>
    <div
      v-else
      class="mx-auto w-full max-w-3xl space-y-1 p-3 md:space-y-2 md:px-8 md:py-6"
      :style="padding"
    >
      <div
        v-for="item in menuItems"
        :key="item.key"
        :id="`item-${item.key}`"
        :data-key="item.key"
        class="mb-4 md:mb-6"
      >
        <div
          class="text-base-content/55 mt-1 mb-2 px-3 text-[13px] font-semibold tracking-[0.05em] uppercase"
          v-if="![SETTINGS_MENU_KEY.general, SETTINGS_MENU_KEY.backend].includes(item.key)"
        >
          {{ $t(item.label) }}
        </div>
        <component :is="item.component" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SettingsMenu from '@/components/controls/SettingsCtrl.vue'
import BackendSettings from '@/components/settings/backend/BackendSettings.vue'
import ConnectionsSettings from '@/components/settings/connections/ConnectionsSettings.vue'
import ZashboardSettings from '@/components/settings/general/ZashboardSettings.vue'
import OverviewSettings from '@/components/settings/overview/OverviewSettings.vue'
import ProxiesSettings from '@/components/settings/proxies/ProxiesSettings.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { isSettingVisible } from '@/composables/settings'
import { SETTINGS_MENU_KEY } from '@/constant'
import { isPWA } from '@/helper/utils'
import { settingsMenuOrder, settingsPageTwoColumns } from '@/store/settings'
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CubeTransparentIcon,
  GlobeAltIcon,
  HomeIcon,
  ServerIcon,
} from '@heroicons/vue/24/outline'
import { useElementSize } from '@vueuse/core'
import type { Component } from 'vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

type MenuItem = {
  key: SETTINGS_MENU_KEY
  label: string
  icon: Component
  component: Component
}

const { padding } = usePaddingForViews()

const route = useRoute()

const scrollContainerRef = ref<HTMLDivElement>()
const { width } = useElementSize(scrollContainerRef)
const twoColumnsAvailable = computed(() => width.value >= 1000)
const isTwoColumns = computed(() => settingsPageTwoColumns.value && twoColumnsAvailable.value)
const menuItems = computed<MenuItem[]>(() => {
  const itemsMap = new Map<SETTINGS_MENU_KEY, MenuItem>([
    [
      SETTINGS_MENU_KEY.general,
      {
        key: SETTINGS_MENU_KEY.general,
        label: 'zashboardSettings',
        icon: HomeIcon,
        component: ZashboardSettings,
      },
    ],
    [
      SETTINGS_MENU_KEY.overview,
      {
        key: SETTINGS_MENU_KEY.overview,
        label: 'overviewSettings',
        icon: CubeTransparentIcon,
        component: OverviewSettings,
      },
    ],
    [
      SETTINGS_MENU_KEY.backend,
      {
        key: SETTINGS_MENU_KEY.backend,
        label: 'backendSettings',
        icon: ServerIcon,
        component: BackendSettings,
      },
    ],
    [
      SETTINGS_MENU_KEY.proxies,
      {
        key: SETTINGS_MENU_KEY.proxies,
        label: 'proxySettings',
        icon: GlobeAltIcon,
        component: ProxiesSettings,
      },
    ],
    [
      SETTINGS_MENU_KEY.connections,
      {
        key: SETTINGS_MENU_KEY.connections,
        label: 'connectionSettings',
        icon: ArrowsRightLeftIcon,
        component: ConnectionsSettings,
      },
    ],
  ])

  // 根据 settingsMenuOrder 排序，并过滤隐藏的项
  return settingsMenuOrder.value
    .map((key) => itemsMap.get(key))
    .filter((item): item is MenuItem => item !== undefined && isSettingVisible(item.key))
})
const activeMenuKey = ref<SETTINGS_MENU_KEY>(menuItems.value[0]?.key || SETTINGS_MENU_KEY.general)

const columnAssignment = ref<number[]>(menuItems.value.map((_, i) => i % 2))
let rebalanceColumnsId = 0

const rebalanceColumns = async () => {
  const rebalanceId = ++rebalanceColumnsId
  await new Promise((resolve) => setTimeout(resolve, 0)) // 等待 DOM 更新
  if (rebalanceId !== rebalanceColumnsId) return

  const colHeights = [0, 0]
  columnAssignment.value = menuItems.value.map((item) => {
    const el = document.getElementById(`item-${item.key}`)
    const h = el?.offsetHeight ?? 0
    const col = colHeights[0] <= colHeights[1] ? 0 : 1
    colHeights[col] += h
    return col
  })
}

watch(menuItems, () => {
  columnAssignment.value = menuItems.value.map((_, i) => i % 2)
  rebalanceColumns()
  setupActiveMenuObserver()
})

watch(isTwoColumns, () => {
  rebalanceColumns()
  setupActiveMenuObserver()
})

// 当 menuItems 变化时，如果当前激活的项被隐藏，则切换到第一个可见项
watch(
  menuItems,
  (newItems) => {
    if (newItems.length > 0) {
      if (!newItems.find((item) => item.key === activeMenuKey.value)) {
        activeMenuKey.value = newItems[0].key
      }
    }
  },
  { immediate: true },
)
const getItemRef = (key: SETTINGS_MENU_KEY) => {
  return document.getElementById(`item-${key}`)
}

const isTriggerByClick = ref(false)
const timeoutId = ref<ReturnType<typeof setTimeout>>()
let flashTimer: ReturnType<typeof setTimeout> | undefined
let initialScrollFrame: number | undefined
let activeMenuObserver: IntersectionObserver | undefined
let activeMenuObserverSetupId = 0
const visibleMenuItems = new Map<SETTINGS_MENU_KEY, { ratio: number; top: number }>()

const flashElement = (el: HTMLElement) => {
  el.classList.remove('highlight-flash')
  el.classList.add('highlight-flash')
  el.addEventListener('animationend', () => el.classList.remove('highlight-flash'), { once: true })
}

const handleMenuClick = (key: SETTINGS_MENU_KEY) => {
  activeMenuKey.value = key

  const index = menuItems.value.findIndex((item) => item.key === key)
  if (index !== -1) {
    isTriggerByClick.value = true
    clearTimeout(timeoutId.value)
    timeoutId.value = setTimeout(() => {
      isTriggerByClick.value = false
    }, 1000)
    const element = getItemRef(key)
    if (element && scrollContainerRef.value) {
      const containerRect = scrollContainerRef.value.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const scrollTop = scrollContainerRef.value.scrollTop
      const targetScrollTop = scrollTop + elementRect.top - containerRect.top - 54

      scrollContainerRef.value.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      })

      if (isTwoColumns.value) {
        if (flashTimer !== undefined) clearTimeout(flashTimer)
        flashTimer = setTimeout(() => {
          flashTimer = undefined
          flashElement(element)
        }, 300)
      }
    }
  }
}

const updateActiveMenuFromIntersections = () => {
  if (isTriggerByClick.value || isTwoColumns.value) return

  let bestKey: SETTINGS_MENU_KEY | null = null
  let bestScore = -Infinity

  for (const [key, item] of visibleMenuItems) {
    const score = item.ratio * 1000 - Math.abs(item.top - 54)

    if (score > bestScore) {
      bestScore = score
      bestKey = key
    }
  }

  if (bestKey && bestKey !== activeMenuKey.value) {
    activeMenuKey.value = bestKey
  }
}

const disconnectActiveMenuObserver = () => {
  activeMenuObserver?.disconnect()
  activeMenuObserver = undefined
  visibleMenuItems.clear()
}

const setupActiveMenuObserver = async () => {
  const setupId = ++activeMenuObserverSetupId
  disconnectActiveMenuObserver()
  await nextTick()

  if (setupId !== activeMenuObserverSetupId) return
  if (!scrollContainerRef.value || isTwoColumns.value) return

  activeMenuObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const key = (entry.target as HTMLElement).dataset.key as SETTINGS_MENU_KEY | undefined
        if (!key) continue

        if (entry.isIntersecting) {
          visibleMenuItems.set(key, {
            ratio: entry.intersectionRatio,
            top: entry.boundingClientRect.top,
          })
        } else {
          visibleMenuItems.delete(key)
        }
      }

      updateActiveMenuFromIntersections()
    },
    {
      root: scrollContainerRef.value,
      rootMargin: '-54px 0px -35% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    },
  )

  for (const item of menuItems.value) {
    const element = getItemRef(item.key)
    if (element) {
      activeMenuObserver.observe(element)
    }
  }
}

const refreshPages = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.allSettled(registrations.map((registration) => registration.unregister()))
  window.location.reload()
}

onMounted(() => {
  rebalanceColumns()
  setupActiveMenuObserver()
  initialScrollFrame = requestAnimationFrame(() => {
    initialScrollFrame = undefined
    const scrollTo = route.query.scrollTo as SETTINGS_MENU_KEY
    if (scrollTo) {
      handleMenuClick(scrollTo)
    }
  })
})

onUnmounted(() => {
  rebalanceColumnsId += 1
  activeMenuObserverSetupId += 1
  if (timeoutId.value !== undefined) clearTimeout(timeoutId.value)
  if (flashTimer !== undefined) clearTimeout(flashTimer)
  if (initialScrollFrame !== undefined) cancelAnimationFrame(initialScrollFrame)
  disconnectActiveMenuObserver()
})
</script>
