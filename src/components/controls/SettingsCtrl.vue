<template>
  <CtrlsBar>
    <div
      ref="menuRef"
      class="scrollbar-hidden p-1 px-2"
      @touchstart.passive.stop
      @touchmove.passive.stop
      @touchend.passive.stop
    >
      <div class="flex w-full gap-2">
        <div
          ref="menuTrackRef"
          class="relative mx-auto flex max-w-6xl flex-1 gap-2"
        >
          <div
            v-if="showActiveIndicator"
            class="bg-neutral absolute top-1 left-0 -z-1 h-8 rounded-lg"
            :class="[!isSwiping ? 'transition-transform duration-300' : '']"
            :style="activeStyle"
          ></div>
          <button
            v-for="item in menuItems"
            :id="`menu-item-${item.key}`"
            :key="item.key"
            type="button"
            ref="menuItemRefs"
            :data-key="item.key"
            class="btn btn-ghost btn-sm my-1 flex-1"
            :class="[
              !showActiveIndicator
                ? 'hover:btn hover:btn-neutral'
                : activeMenuKey === item.key
                  ? 'text-neutral-content bg-transparent'
                  : '',
            ]"
            :aria-label="$t(item.label)"
            :aria-current="activeMenuKey === item.key ? 'page' : undefined"
            @click="handleMenuClick(item.key)"
          >
            <component
              :is="item.icon"
              class="h-5 w-5"
              aria-hidden="true"
            />
            <span class="hidden text-sm lg:block">
              {{ $t(item.label) }}
            </span>
          </button>
        </div>
        <button
          type="button"
          class="btn btn-circle btn-sm my-auto"
          :aria-label="$t('settingsVisibility')"
          :title="$t('settingsVisibility')"
          @click="showVisibilityDialog = true"
        >
          <Cog6ToothIcon
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </div>
      <SettingsVisibilityDialog
        v-model="showVisibilityDialog"
        :two-columns-available="twoColumnsAvailable"
      />
    </div>
  </CtrlsBar>
</template>

<script setup lang="ts">
import { useCtrlsBar } from '@/composables/useCtrlsBar'
import { SETTINGS_MENU_KEY } from '@/constant'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { useElementSize, useSwipe } from '@vueuse/core'
import type { Component } from 'vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import CtrlsBar from '../common/CtrlsBar.vue'
import SettingsVisibilityDialog from './SettingsVisibilityDialog.vue'

type MenuItem = {
  key: SETTINGS_MENU_KEY
  label: string
  icon: Component
  component: Component
}

type MenuItemRect = {
  key: SETTINGS_MENU_KEY
  left: number
  width: number
}

const props = defineProps<{
  menuItems: MenuItem[]
  activeMenuKey: SETTINGS_MENU_KEY
  showActiveIndicator?: boolean
  twoColumnsAvailable: boolean
}>()

const emit = defineEmits<{
  (e: 'menu-click', key: SETTINGS_MENU_KEY): void
}>()

const showVisibilityDialog = ref(false)

const menuRef = ref<HTMLDivElement>()
const menuTrackRef = ref<HTMLDivElement>()
const menuItemRefs = ref<HTMLButtonElement[]>([])
const { width } = useElementSize(menuTrackRef)
const activeLeft = ref(0)
const activeWidth = ref(0)
const menuItemRects = ref<MenuItemRect[]>([])
const menuTrackLeft = ref(0)
const menuTrackWidth = ref(0)
let pendingSwipeClientX = 0
let swipeFrameId: number | undefined
let lastSwipeTargetKey: SETTINGS_MENU_KEY | null = null
let isAlive = true

const activeStyle = computed(() => {
  return {
    transform: `translateX(${activeLeft.value}px)`,
    width: `${activeWidth.value}px`,
  }
})

useCtrlsBar()

const cacheMenuItemRects = () => {
  if (!menuTrackRef.value) {
    menuItemRects.value = []
    menuTrackLeft.value = 0
    menuTrackWidth.value = 0
    return
  }

  const trackRect = menuTrackRef.value.getBoundingClientRect()
  menuTrackLeft.value = trackRect.left
  menuTrackWidth.value = trackRect.width
  menuItemRects.value = menuItemRefs.value.map((itemEl) => {
    const itemRect = itemEl.getBoundingClientRect()
    return {
      key: itemEl.dataset.key as SETTINGS_MENU_KEY,
      left: itemRect.left - trackRect.left,
      width: itemRect.width,
    }
  })
}

const updateActiveMenuMetrics = async () => {
  await nextTick()
  if (!isAlive) return

  const itemRef = menuItemRefs.value.find((el) => el.dataset.key === props.activeMenuKey)
  if (itemRef) {
    activeLeft.value = itemRef.offsetLeft
    activeWidth.value = itemRef.offsetWidth
  }

  cacheMenuItemRects()
}

const getMenuItemAtPosition = (relativeX: number): SETTINGS_MENU_KEY | null => {
  const item = menuItemRects.value.find((itemRect) => {
    return relativeX >= itemRect.left && relativeX <= itemRect.left + itemRect.width
  })

  return item?.key ?? null
}

const updateSwipePosition = (clientX: number) => {
  if (!menuTrackWidth.value) return

  const relativeX = clientX - menuTrackLeft.value
  const maxLeft = Math.max(0, menuTrackWidth.value - activeWidth.value)
  activeLeft.value = Math.max(0, Math.min(relativeX - activeWidth.value / 2, maxLeft))

  const targetKey = getMenuItemAtPosition(relativeX)
  if (targetKey && targetKey !== props.activeMenuKey && targetKey !== lastSwipeTargetKey) {
    lastSwipeTargetKey = targetKey
    emit('menu-click', targetKey)
  }
}

const scheduleSwipeUpdate = () => {
  if (swipeFrameId !== undefined) return

  swipeFrameId = requestAnimationFrame(() => {
    swipeFrameId = undefined
    updateSwipePosition(pendingSwipeClientX)
  })
}

const flushSwipeUpdate = () => {
  if (swipeFrameId === undefined) return

  cancelAnimationFrame(swipeFrameId)
  swipeFrameId = undefined
  updateSwipePosition(pendingSwipeClientX)
}

const { isSwiping } = useSwipe(menuRef, {
  passive: false,
  threshold: 8,
  onSwipeStart() {
    cacheMenuItemRects()
    lastSwipeTargetKey = props.activeMenuKey
  },
  onSwipe(e: TouchEvent) {
    pendingSwipeClientX = e.touches[0].clientX
    scheduleSwipeUpdate()
  },
  onSwipeEnd() {
    flushSwipeUpdate()
    lastSwipeTargetKey = null
    void updateActiveMenuMetrics()
  },
})

const handleMenuClick = (key: SETTINGS_MENU_KEY) => {
  if (isSwiping.value) return
  emit('menu-click', key)
}

watch(
  () => props.activeMenuKey,
  () => {
    if (isSwiping.value) return
    void updateActiveMenuMetrics()
  },
  {
    immediate: true,
  },
)

watch(
  () => [width.value, props.menuItems],
  () => {
    void updateActiveMenuMetrics()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (swipeFrameId !== undefined) {
    cancelAnimationFrame(swipeFrameId)
    swipeFrameId = undefined
  }
  isAlive = false
})
</script>
