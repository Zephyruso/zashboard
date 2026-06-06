<template>
  <div
    class="bg-base-200 home-page flex size-full"
    :class="sidebarLayoutCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'"
  >
    <div
      v-if="!isMiddleScreen"
      class="relative z-40 flex-none overflow-visible transition-none"
      :class="sidebarLayoutCollapsed ? 'w-18' : 'w-64'"
    >
      <SideBar
        class="absolute inset-y-0 left-0"
        @transitionend="syncSidebarLayoutState"
      />
    </div>
    <RouterView v-slot="{ Component, route }">
      <div
        class="relative flex-1 overflow-hidden"
        ref="swiperRef"
        style="touch-action: pan-y"
      >
        <div
          class="smooth-scroll-container absolute inset-0 flex h-full w-full flex-col overflow-x-hidden overflow-y-auto"
        >
          <div
            v-if="isMiddleScreen"
            :key="route.fullPath"
            ref="routePageRef"
            class="route-page"
            :class="[
              getRouteEnterClass(route.meta.transition as string),
              isRouteDragging && 'route-page-dragging',
              !shouldAnimateRouteTransition && 'route-page-transition-disabled',
            ]"
          >
            <Component :is="Component" />
          </div>
          <Component
            v-else
            :is="Component"
          />
        </div>

        <template v-if="isMiddleScreen">
          <Transition
            name="v-slide-up"
            appear
          >
            <nav
              class="dock-shell transition-opacity duration-200 ease-out"
              :class="dockHidden && 'pointer-events-none opacity-0'"
              :style="dockStyle"
              :aria-label="$t('mainNavigation')"
              :aria-hidden="dockHidden ? 'true' : undefined"
              :inert="dockHidden ? true : undefined"
              ref="dockRef"
            >
              <div class="dock dock-xs h-[52px]">
                <button
                  v-for="r in renderRoutes"
                  :key="r"
                  type="button"
                  @click="navigateDockRoute(r)"
                  class="dock-button h-[52px] flex-col items-center justify-center pt-1.5"
                  :class="r === route.name && 'dock-active'"
                  :aria-label="$t(r)"
                  :aria-current="r === route.name ? 'page' : undefined"
                >
                  <component
                    :is="ROUTE_ICON_MAP[r]"
                    class="dock-icon h-5 w-5 flex-shrink-0"
                    aria-hidden="true"
                    focusable="false"
                  />
                  <span class="dock-label">
                    {{ $t(r) }}
                  </span>
                </button>
              </div>
            </nav>
          </Transition>
        </template>
      </div>
    </RouterView>

    <DialogWrapper v-model="autoSwitchBackendDialog">
      <div class="mb-2">
        {{ $t('currentBackendUnavailable') }}
      </div>
      <div class="flex justify-end gap-2">
        <button
          class="btn btn-sm"
          @click="autoSwitchBackendDialog = false"
        >
          {{ $t('cancel') }}
        </button>
        <button
          class="btn btn-primary btn-sm"
          @click="autoSwitchBackend"
          :disabled="isAutoSwitchingBackend"
        >
          <span
            v-if="isAutoSwitchingBackend"
            class="loading loading-spinner loading-xs"
          ></span>
          {{ isAutoSwitchingBackend ? $t('checking') : $t('confirm') }}
        </button>
      </div>
    </DialogWrapper>
  </div>
</template>

<script setup lang="ts">
import { isBackendAvailable } from '@/api'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import SideBar from '@/components/sidebar/SideBar.vue'
import { MOBILE_DOCK_RESERVED_BOTTOM, dockTop } from '@/composables/paddingViews'
import { disableProxiesPageScroll } from '@/composables/proxies'
import { useSettings } from '@/composables/settings'
import { useSwipeRouter } from '@/composables/swipe'
import { PROXY_TAB_TYPE, ROUTE_ICON_MAP, ROUTE_NAME, RULE_TAB_TYPE } from '@/constant'
import { renderRoutes } from '@/helper'
import { showNotification } from '@/helper/notification'
import { getLabelFromBackend, isMiddleScreen } from '@/helper/utils'
import { fetchConfigs } from '@/store/config'
import { initConnections, pauseConnections, resumeConnections } from '@/store/connections'
import { initLogs, pauseLogs, resumeLogs } from '@/store/logs'
import { initSatistic, pauseSatistic, resumeSatistic } from '@/store/overview'
import { fetchProxies, proxiesTabShow } from '@/store/proxies'
import { fetchRules, rulesTabShow } from '@/store/rules'
import { isSidebarCollapsed, lowPowerMode, scrollAnimationEffect } from '@/store/settings'
import { activeBackend, activeUuid, backendList } from '@/store/setup'
import type { Backend } from '@/types'
import { useDocumentVisibility, useElementBounding } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'

const router = useRouter()
const routePageRef = ref<HTMLElement>()
const { isDragging: isRouteDragging, swiperRef } = useSwipeRouter(routePageRef)
const sidebarLayoutCollapsed = ref(isSidebarCollapsed.value)

const navigateDockRoute = (name: ROUTE_NAME) => {
  if (router.currentRoute.value.name === name) return
  void router.push({ name, replace: true })
}

const getRouteEnterClass = (transition?: string) => {
  if (transition === 'slide-right') return 'route-enter-right'
  if (transition === 'slide-left') return 'route-enter-left'
  return 'route-enter-fade'
}

const dockRef = ref<HTMLElement>()
const { top: dockRefTop } = useElementBounding(dockRef)
const dockHidden = computed(() => disableProxiesPageScroll.value)
const dockStyle = computed(() => {
  return {
    bottom: 'calc(14px + env(safe-area-inset-bottom))',
  }
})

const documentVisible = useDocumentVisibility()
const shouldRunRealtimeStreams = computed(() => {
  return documentVisible.value === 'visible' && !lowPowerMode.value
})
const shouldAnimateRouteTransition = computed(() => {
  return !lowPowerMode.value && scrollAnimationEffect.value
})

const pauseRealtimeStreams = () => {
  pauseConnections()
  pauseLogs()
  pauseSatistic()
}

const resumeRealtimeStreams = () => {
  if (!activeBackend.value || !shouldRunRealtimeStreams.value) return
  resumeConnections()
  resumeLogs()
  resumeSatistic()
}

const syncSidebarLayoutState = () => {
  sidebarLayoutCollapsed.value = isSidebarCollapsed.value
}

watch(isSidebarCollapsed, (value) => {
  if (value) {
    sidebarLayoutCollapsed.value = true
  }
})

watch(
  isMiddleScreen,
  (value) => {
    if (!value) {
      sidebarLayoutCollapsed.value = isSidebarCollapsed.value
    }
  },
  { immediate: true },
)

watch(
  dockRefTop,
  () => {
    const measuredDockTop = window.innerHeight - dockRefTop.value
    if (
      !Number.isFinite(measuredDockTop) ||
      measuredDockTop <= 0 ||
      measuredDockTop >= window.innerHeight
    ) {
      dockTop.value = MOBILE_DOCK_RESERVED_BOTTOM
      return
    }

    dockTop.value = Math.max(MOBILE_DOCK_RESERVED_BOTTOM, measuredDockTop)
  },
  { immediate: true },
)

watch(
  activeUuid,
  () => {
    if (!activeBackend.value) {
      pauseRealtimeStreams()
      return
    }
    rulesTabShow.value = RULE_TAB_TYPE.RULES
    proxiesTabShow.value = PROXY_TAB_TYPE.PROXIES
    fetchConfigs()
    fetchProxies()
    fetchRules()
    initConnections()
    initLogs()
    initSatistic()

    if (!shouldRunRealtimeStreams.value) {
      pauseRealtimeStreams()
    }
  },
  {
    immediate: true,
  },
)

const autoSwitchBackendDialog = ref(false)
const isAutoSwitchingBackend = ref(false)
const BACKEND_CHECK_TIMEOUT = 10000
let backendAvailabilityCheckSeq = 0

const checkBackendWithTimeout = async (backend: Backend, timeoutMs = BACKEND_CHECK_TIMEOUT) => {
  const isAvailable = await isBackendAvailable(backend, timeoutMs)
  if (!isAvailable) {
    throw new Error('Backend unavailable')
  }

  return backend
}

const autoSwitchBackend = async () => {
  if (isAutoSwitchingBackend.value) return

  const unavailableBackendUuid = activeUuid.value
  const otherEnds = backendList.value.filter((end) => end.uuid !== activeUuid.value)

  isAutoSwitchingBackend.value = true

  try {
    const available = await Promise.any(otherEnds.map((end) => checkBackendWithTimeout(end))).catch(
      () => null,
    )

    if (unavailableBackendUuid !== activeUuid.value) return

    autoSwitchBackendDialog.value = false

    if (!available) {
      showNotification({
        content: 'backendSwitchFailed',
        type: 'alert-error',
      })
      return
    }

    activeUuid.value = available.uuid
    showNotification({
      content: 'backendSwitchTo',
      params: {
        backend: getLabelFromBackend(available),
      },
      type: 'alert-success',
    })
  } finally {
    isAutoSwitchingBackend.value = false
  }
}

watch(
  documentVisible,
  async () => {
    const checkSeq = ++backendAvailabilityCheckSeq
    if (!activeBackend.value || backendList.value.length < 2 || !shouldRunRealtimeStreams.value) {
      return
    }
    try {
      const activeBackendUuid = activeBackend.value.uuid
      const isAvailable = await isBackendAvailable(activeBackend.value)

      if (
        checkSeq !== backendAvailabilityCheckSeq ||
        activeBackendUuid !== activeUuid.value ||
        !shouldRunRealtimeStreams.value
      ) {
        return
      }

      if (!isAvailable) {
        autoSwitchBackendDialog.value = true
      }
    } catch {
      if (checkSeq !== backendAvailabilityCheckSeq || !shouldRunRealtimeStreams.value) {
        return
      }
      autoSwitchBackendDialog.value = true
    }
  },
  {
    immediate: true,
  },
)

watch(shouldRunRealtimeStreams, (shouldRun) => {
  if (!shouldRun) {
    pauseRealtimeStreams()
    return
  }

  resumeRealtimeStreams()
  fetchProxies()
})

const { cancelUIUpdateCheck, scheduleUIUpdateCheck } = useSettings()

scheduleUIUpdateCheck()

onBeforeUnmount(() => {
  cancelUIUpdateCheck()
})
</script>
