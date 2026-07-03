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
      >
        <div class="absolute flex h-full w-full flex-col overflow-y-auto">
          <Transition
            :name="(route.meta.transition as string) || 'fade'"
            v-if="isMiddleScreen"
          >
            <Component :is="Component" />
          </Transition>
          <Component
            v-else
            :is="Component"
          />
        </div>

        <template v-if="isMiddleScreen">
          <div
            class="bg-base-100/20 dock dock-xs z-10 grid h-auto w-auto max-w-[calc(100vw-var(--spacing)*4)] shadow-sm backdrop-blur-sm"
            :style="{
              gridTemplateColumns: `repeat(${mobileDockColumnCount}, minmax(0, 1fr))`,
              padding: '0',
              bottom: 'calc(var(--spacing) * 2 + env(safe-area-inset-bottom))',
            }"
            ref="dockRef"
          >
            <button
              v-for="r in renderRoutes"
              :key="r"
              :disabled="!isRouteAvailable(r)"
              @click="navigateDockRoute(r)"
              class="h-14 min-w-0 flex-col items-center justify-center pt-2"
              :class="[r === route.name && 'dock-active', !isRouteAvailable(r) && 'opacity-45']"
            >
              <component
                :is="ROUTE_ICON_MAP[r]"
                class="h-5 w-5 flex-shrink-0"
              />
              <span class="dock-label">
                {{ $t(r) }}
              </span>
            </button>
          </div>
          <div
            class="fixed bottom-0 z-10 w-full"
            style="
              background: linear-gradient(
                to top,
                rgba(0, 0, 0, 0.3),
                rgba(0, 0, 0, 0.16),
                rgba(0, 0, 0, 0.08),
                rgba(0, 0, 0, 0.02),
                rgba(0, 0, 0, 0)
              );
              height: env(safe-area-inset-bottom);
            "
          ></div>
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
        >
          {{ $t('confirm') }}
        </button>
      </div>
    </DialogWrapper>
  </div>
</template>

<script setup lang="ts">
import { isBackendAvailable } from '@/api'
import { detectBackendFlavor } from '@/api/fastproxy'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import SideBar from '@/components/sidebar/SideBar.vue'
import { dockTop } from '@/composables/paddingViews'
import { useSettings } from '@/composables/settings'
import { useSwipeRouter } from '@/composables/swipe'
import { PROXY_TAB_TYPE, ROUTE_ICON_MAP, ROUTE_NAME, RULE_TAB_TYPE } from '@/constant'
import { isRouteAvailable, renderRoutes } from '@/helper'
import { showNotification } from '@/helper/notification'
import { getLabelFromBackend, isMiddleScreen } from '@/helper/utils'
import { fastProxyRuntimeStatus, loadFastProxyWorkspace } from '@/store/fastproxyRepository'
import { fetchProxies, proxiesTabShow } from '@/store/proxies'
import { rulesTabShow } from '@/store/rules'
import { initRuntimePanelData, stopRuntimePanelData } from '@/store/runtimePanel'
import { isSidebarCollapsed } from '@/store/settings'
import {
  activeBackend,
  activeBackendFlavor,
  activeUuid,
  backendList,
  setActiveBackendFlavor,
} from '@/store/setup'
import type { Backend } from '@/types'
import { useDocumentVisibility, useElementBounding } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'

const router = useRouter()
const { swiperRef } = useSwipeRouter()
const sidebarLayoutCollapsed = ref(isSidebarCollapsed.value)
const mobileDockColumnCount = computed(() => {
  return renderRoutes.value.length > 6
    ? Math.ceil(renderRoutes.value.length / 2)
    : renderRoutes.value.length
})

const dockRef = ref<HTMLDivElement>()
const { top: dockRefTop } = useElementBounding(dockRef)

const syncSidebarLayoutState = () => {
  sidebarLayoutCollapsed.value = isSidebarCollapsed.value
}

const ensureCurrentRouteAvailable = () => {
  if (isRouteAvailable(router.currentRoute.value.name)) return
  router.replace({ name: ROUTE_NAME.home })
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
    dockTop.value = window.innerHeight - dockRefTop.value
  },
  { immediate: true },
)

watch(
  activeBackend,
  async (backend) => {
    if (!backend) return
    const flavor = await detectBackendFlavor(backend)
    setActiveBackendFlavor(flavor)

    if (flavor === 'fastproxy') {
      await loadFastProxyWorkspace().catch(() => undefined)
      if (fastProxyRuntimeStatus.value?.state === 'running') {
        await initRuntimePanelData().catch(() => undefined)
      }
      ensureCurrentRouteAvailable()
      if (router.currentRoute.value.name === ROUTE_NAME.setup) {
        router.replace({ name: ROUTE_NAME.home })
      }
      return
    }

    if (flavor !== 'controller') {
      return
    }

    rulesTabShow.value = RULE_TAB_TYPE.RULES
    proxiesTabShow.value = PROXY_TAB_TYPE.PROXIES
    initRuntimePanelData()
  },
  { immediate: true },
)

watch(
  () => [activeBackendFlavor.value, fastProxyRuntimeStatus.value?.state],
  ([flavor, state]) => {
    if (flavor === 'fastproxy' && state !== 'running') {
      stopRuntimePanelData()
    }
  },
  { immediate: true },
)

const autoSwitchBackendDialog = ref(false)

const navigateDockRoute = (routeName: string) => {
  if (!isRouteAvailable(routeName)) return
  router.push({ name: routeName, replace: true })
}

const autoSwitchBackend = async () => {
  const otherEnds = backendList.value.filter((end) => end.uuid !== activeUuid.value)

  autoSwitchBackendDialog.value = false
  const avaliable = await Promise.race<Backend>(
    otherEnds.map((end) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject()
        }, 10000)
        isBackendAvailable(end).then((res) => {
          if (res) {
            resolve(end)
          }
        })
      })
    }),
  )

  if (avaliable) {
    activeUuid.value = avaliable.uuid
    showNotification({
      content: 'backendSwitchTo',
      params: {
        backend: getLabelFromBackend(avaliable),
      },
      type: 'alert-success',
    })
  }
}

const documentVisible = useDocumentVisibility()

watch(
  documentVisible,
  async () => {
    if (
      !activeBackend.value ||
      backendList.value.length < 2 ||
      documentVisible.value !== 'visible'
    ) {
      return
    }
    try {
      const activeBackendUuid = activeBackend.value.uuid
      const isAvailable = await isBackendAvailable(activeBackend.value)

      if (activeBackendUuid !== activeUuid.value) {
        return
      }

      if (!isAvailable) {
        autoSwitchBackendDialog.value = true
      }
    } catch {
      autoSwitchBackendDialog.value = true
    }
  },
  {
    immediate: true,
  },
)

watch(documentVisible, () => {
  if (documentVisible.value !== 'visible' || activeBackendFlavor.value !== 'controller') return
  fetchProxies()
})

watch(
  () => [activeBackendFlavor.value, fastProxyRuntimeStatus.value?.state],
  ([flavor, state]) => {
    // Avoid redirecting runtime routes during the initial fastproxy bootstrap window.
    if (flavor === 'fastproxy' && !state) return
    ensureCurrentRouteAvailable()
  },
)

const { checkUIUpdate } = useSettings()

checkUIUpdate()
</script>
