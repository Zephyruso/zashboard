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
            :class="isPWA ? 'h-[5.5rem]' : 'h-14'"
          />
          <div
            class="dock dock-sm bg-base-200 z-30"
            :class="isPWA ? 'h-[5.5rem] pb-8' : 'h-14'"
          >
            <button
              v-for="r in renderRoutes"
              :key="r"
              @click="router.push({ name: r })"
              :class="r === route.name && 'dock-active'"
            >
              <component
                :is="ROUTE_ICON_MAP[r]"
                class="size-5 shrink-0"
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
import { isBackendAvailable } from '@/api'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import ConnectionCtrl from '@/components/sidebar/ConnectionCtrl.tsx'
import LogsCtrl from '@/components/sidebar/LogsCtrl.tsx'
import ProxiesCtrl from '@/components/sidebar/ProxiesCtrl.tsx'
import RulesCtrl from '@/components/sidebar/RulesCtrl.tsx'
import SideBar from '@/components/sidebar/SideBar.vue'
import { useNotification } from '@/composables/notification'
import { useProxies } from '@/composables/proxies'
import { rulesTabShow } from '@/composables/rules'
import { useSettings } from '@/composables/settings'
import { useSwipeRouter } from '@/composables/swipe'
import { PROXY_TAB_TYPE, ROUTE_ICON_MAP, ROUTE_NAME, RULE_TAB_TYPE } from '@/constant'
import { getUrlFromBackend, renderRoutes } from '@/helper'
import { isMiddleScreen, isPWA } from '@/helper/utils'
import { fetchConfigs } from '@/store/config'
import { initConnections } from '@/store/connections'
import { initLogs } from '@/store/logs'
import { initSatistic } from '@/store/overview'
import { fetchProxies } from '@/store/proxies'
import { fetchRules } from '@/store/rules'
import { isSidebarCollapsed } from '@/store/settings'
import { activeBackend, activeUuid, backendList } from '@/store/setup'
import type { Backend } from '@/types'
import { useDocumentVisibility } from '@vueuse/core'
import { ref, watch, type Component } from 'vue'
import { RouterView, useRouter } from 'vue-router'

const ctrlsMap: Record<string, Component> = {
  [ROUTE_NAME.connections]: ConnectionCtrl,
  [ROUTE_NAME.logs]: LogsCtrl,
  [ROUTE_NAME.proxies]: ProxiesCtrl,
  [ROUTE_NAME.rules]: RulesCtrl,
}

const router = useRouter()
const { proxiesTabShow } = useProxies()
const { swiperRef } = useSwipeRouter()

watch(
  activeUuid,
  () => {
    if (!activeUuid.value) return
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
        backend: getUrlFromBackend(avaliable),
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

const { checkUIUpdate } = useSettings()

checkUIUpdate()
</script>
