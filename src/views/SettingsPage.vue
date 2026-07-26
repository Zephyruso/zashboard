<template>
  <div
    class="relative h-full overflow-y-auto"
    @scroll.passive="handleScroll"
    ref="scrollContainerRef"
    :style="padding"
  >
    <SettingsCtrl
      :menu-items="menuItems"
      :active-menu-key="activeMenuKey"
      @menu-click="handleMenuClick"
    />

    <button
      v-if="isPWA"
      class="btn btn-ghost btn-sm absolute top-14 right-2 z-10"
      @click="refreshPages"
    >
      <ArrowPathIcon class="h-4 w-4" />
      {{ $t('refresh') }}
    </button>

    <!-- Edit mode toolbar -->
    <div
      v-if="settingsEditMode"
      class="bg-base-100 mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 p-3 md:px-8"
    >
      <button
        class="btn btn-sm"
        @click="applyShowAllPreset"
      >
        {{ $t('showAllPreset') }}
      </button>
      <button
        class="btn btn-sm"
        @click="applyMinimalPreset"
      >
        {{ $t('minimalPreset') }}
      </button>
      <label
        v-if="twoColumnsAvailable"
        class="ml-auto flex items-center gap-2 text-sm"
      >
        {{ $t('settingsPageTwoColumns') }}
        <input
          v-model="settingsPageTwoColumns"
          type="checkbox"
          class="toggle"
        />
      </label>
    </div>

    <!-- Content Area -->
    <template v-if="isTwoColumns">
      <div class="mx-auto grid w-full max-w-7xl grid-cols-2 gap-12 p-3">
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
            class="settings-category mb-4 rounded-lg p-2 md:mb-6"
            :class="
              settingsEditMode && isSettingHidden(item.key) ? 'settings-category--hidden' : ''
            "
          >
            <SettingsCategoryHeader :item="item" />
            <div class="settings-category-body">
              <component :is="item.component" />
            </div>
          </div>
        </div>
      </div>
    </template>
    <div
      v-else
      class="mx-auto w-full max-w-3xl space-y-1 p-3 md:space-y-2 md:px-8 md:py-6"
    >
      <div
        v-for="item in menuItems"
        :key="item.key"
        :id="`item-${item.key}`"
        :data-key="item.key"
        class="settings-category mb-4 md:mb-6"
        :class="settingsEditMode && isSettingHidden(item.key) ? 'settings-category--hidden' : ''"
      >
        <SettingsCategoryHeader :item="item" />
        <div class="settings-category-body">
          <component :is="item.component" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SettingsCtrl from '@/components/controls/SettingsCtrl.vue'
import BackendSettings from '@/components/settings/backend/BackendSettings.vue'
import ConnectionsSettings from '@/components/settings/connections/ConnectionsSettings.vue'
import ZashboardSettings from '@/components/settings/general/ZashboardSettings.vue'
import OverviewSettings from '@/components/settings/overview/OverviewSettings.vue'
import ProxiesSettings from '@/components/settings/proxies/ProxiesSettings.vue'
import SettingsCategoryHeader from '@/components/settings/SettingsCategoryHeader.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import {
  applyMinimalPreset,
  applyShowAllPreset,
  isSettingHidden,
  isSettingVisible,
  settingsEditMode,
} from '@/composables/settings'
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
import { throttle } from 'lodash'
import type { Component } from 'vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

type MenuItem = {
  key: SETTINGS_MENU_KEY
  label: string
  icon: Component
  component: Component
}

const { padding } = usePaddingForViews({
  offsetTop: 0,
  offsetBottom: 8,
})

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

const rebalanceColumns = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0)) // 等待 DOM 更新
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
})

watch(isTwoColumns, rebalanceColumns)

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
const timeoutId = ref<number>()

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
        setTimeout(() => flashElement(element), 300)
      }
    }
  }
}

const scrollTop = ref(0)
const updateActiveMenuByScroll = () => {
  if (!scrollContainerRef.value || isTriggerByClick.value || isTwoColumns.value) return

  const containerRect = scrollContainerRef.value.getBoundingClientRect()
  const newScrollTop = scrollContainerRef.value.scrollTop
  const scrollingDown = newScrollTop > scrollTop.value
  const containerTop = containerRect.top
  const containerBottom = containerRect.bottom
  const containerHeight = containerRect.height

  let bestKey: SETTINGS_MENU_KEY | null = null
  let bestScore = -Infinity

  menuItems.value.forEach((item) => {
    const element = getItemRef(item.key)
    if (!element) return

    const elementRect = element.getBoundingClientRect()
    const visibleTop = Math.max(elementRect.top, containerTop)
    const visibleBottom = Math.min(elementRect.bottom, containerBottom)
    const visibleHeight = Math.max(0, visibleBottom - visibleTop)

    if (visibleHeight <= 0) return

    // 元素自身的可见比例（对小元素更友好）
    const selfRatio = visibleHeight / elementRect.height
    // 元素占容器可见区域的比例
    const containerRatio = visibleHeight / containerHeight
    // 综合得分：优先考虑自身可见比例高的元素，其次考虑占容器比例
    // 当小元素完全可见时 selfRatio=1，得分会很高
    let score = selfRatio + containerRatio * 0.4

    // 滚动方向偏好：偏向即将进入视口的元素
    const elementCenter = (visibleTop + visibleBottom) / 2
    const referencePoint = containerTop + containerHeight * (scrollingDown ? 0.6 : 0.4)
    const normalizedDistance = Math.abs(elementCenter - referencePoint) / containerHeight
    score -= normalizedDistance * 0.2

    if (score > bestScore) {
      bestScore = score
      bestKey = item.key
    }
  })

  if (bestKey && bestKey !== activeMenuKey.value) {
    activeMenuKey.value = bestKey
  }

  scrollTop.value = newScrollTop
}

const handleScroll = throttle(updateActiveMenuByScroll, 100)

const refreshPages = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations()

  for (const registration of registrations) {
    registration.unregister()
  }
  window.location.reload()
}

onUnmounted(() => {
  settingsEditMode.value = false
})

onMounted(() => {
  rebalanceColumns()
  requestAnimationFrame(async () => {
    const scrollTo = route.query.scrollTo as SETTINGS_MENU_KEY
    if (scrollTo) {
      handleMenuClick(scrollTo)
    }
  })
})
</script>
