<template>
  <div class="bg-base-200/50 home-page flex size-full">
    <SideBar v-if="!isMiddleScreen" />
    <RouterView v-slot="{ Component, route }">
      <div
        class="flex flex-1 flex-col overflow-hidden"
        ref="swiperRef"
      >
        <div
          v-if="ctrlsMap[route.name as string] && isSidebarCollapsed"
          class="bg-base-100 ctrls-bar w-full"
        >
          <component
            :is="ctrlsMap[route.name as string]"
            :horizontal="true"
          />
        </div>

        <div class="relative h-0 flex-1">
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
        </div>
        <template v-if="isMiddleScreen">
          <div
            class="nav-bar shrink-0"
            :style="styleForSafeArea"
          />
          <div
            class="dock dock-sm bg-base-200 z-30"
            :style="styleForSafeArea"
          >
            <button
              v-for="r in renderRoutes"
              :key="r"
              @click="router.push({ name: r })"
              :class="r === route.name && 'dock-active'"
            >
              <component
                :is="ROUTE_ICON_MAP[r]"
                class="size-5"
              />
              <span class="dock-label">
                {{ $t(r) }}
              </span>
            </button>
          </div>
        </template>
      </div>
    </RouterView>

    <DialogWrapper v-model="autoSwitchBackendDialog">
      <h3 class="text-lg font-bold">{{ $t('currentBackendUnavailable') }}</h3>
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
import { isBackendAvailable } from '@renderer/api'
import DialogWrapper from '@renderer/components/common/DialogWrapper.vue'
import ConnectionCtrl from '@renderer/components/sidebar/ConnectionCtrl.tsx'
import LogsCtrl from '@renderer/components/sidebar/LogsCtrl.tsx'
import ProxiesCtrl from '@renderer/components/sidebar/ProxiesCtrl.tsx'
import RulesCtrl from '@renderer/components/sidebar/RulesCtrl.tsx'
import SideBar from '@renderer/components/sidebar/SideBar.vue'
import { useNotification } from '@renderer/composables/notification'
import { useSwipeRouter } from '@renderer/composables/swipe'
import { PROXY_TAB_TYPE, ROUTE_ICON_MAP, ROUTE_NAME, RULE_TAB_TYPE } from '@renderer/constant'
import { renderRoutes } from '@renderer/helper'
import { getLabelFromBackend, isMiddleScreen } from '@renderer/helper/utils'
import { fetchConfigs } from '@renderer/store/config'
import { initConnections } from '@renderer/store/connections'
import { initLogs } from '@renderer/store/logs'
import { initSatistic } from '@renderer/store/overview'
import { fetchProxies, proxiesTabShow } from '@renderer/store/proxies'
import { fetchRules, rulesTabShow } from '@renderer/store/rules'
import { isSidebarCollapsed } from '@renderer/store/settings'
import { activeBackend, activeUuid, backendList } from '@renderer/store/setup'
import type { Backend } from '@renderer/types'
import { useDocumentVisibility } from '@vueuse/core'
import { ref, watch, type Component } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { isCoreRunning } from '../store/ipc'

const ctrlsMap: Record<string, Component> = {
  [ROUTE_NAME.connections]: ConnectionCtrl,
  [ROUTE_NAME.logs]: LogsCtrl,
  [ROUTE_NAME.proxies]: ProxiesCtrl,
  [ROUTE_NAME.rules]: RulesCtrl,
}

const styleForSafeArea = {
  height: 'calc(var(--spacing) * 14 + env(safe-area-inset-bottom))',
  'padding-bottom': 'env(safe-area-inset-bottom)',
}

const router = useRouter()
const { swiperRef } = useSwipeRouter()

watch(
  isCoreRunning,
  () => {
    if (!isCoreRunning.value) return
    rulesTabShow.value = RULE_TAB_TYPE.RULES
    proxiesTabShow.value = PROXY_TAB_TYPE.PROXIES
    fetchConfigs()
    fetchProxies()
    fetchRules()
    initConnections()
    initLogs()
    initSatistic()
  },
  {
    immediate: true,
  },
)

const autoSwitchBackendDialog = ref(false)
const { showNotification } = useNotification()
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
  if (documentVisible.value !== 'visible') return
  fetchProxies()
})
</script>
