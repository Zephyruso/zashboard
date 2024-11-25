<template>
  <div class="w-128 drawer md:drawer-open">
    <input
      id="sidebar"
      type="checkbox"
      class="drawer-toggle"
    />

    <div class="drawer-side z-30">
      <label
        for="sidebar"
        aria-label="close sidebar"
        class="drawer-overlay"
      ></label>

      <div class="flex h-full flex-col bg-base-200 text-base-content">
        <ul class="menu w-80 flex-1 p-4">
          <li
            v-for="r in routes"
            :key="r"
          >
            <a
              :class="r === route.name ? 'active' : ''"
              :href="`#${r}`"
            >
              <component
                :is="routeIconMap[r]"
                class="h-5 w-5"
              />
              {{ $t(r) }}
            </a>
          </li>
        </ul>
        <div class="flex h-48 flex-col gap-1">
          <MemoryChart />
          <SpeedChart />
        </div>
        <div class="card m-2 bg-base-100 shadow-lg">
          <component
            v-if="sidebarComp"
            :is="sidebarComp"
          />
          <CommonSidebar />
        </div>
      </div>
    </div>

    <div
      class="drawer-content fixed bottom-0 flex h-full w-full flex-col overflow-hidden md:relative md:w-auto"
    >
      <RouterView class="flex-1"></RouterView>

      <div class="flex h-12 w-full items-center justify-center gap-1 bg-base-200 p-1 md:hidden">
        <ul class="menu menu-horizontal menu-sm">
          <li
            v-for="r in routes"
            :key="r"
          >
            <a
              :class="r === route.name ? 'active' : ''"
              :href="`#${r}`"
            >
              <component
                :is="routeIconMap[r]"
                class="h-5 w-5"
              />
            </a>
          </li>
        </ul>
        <label for="sidebar">
          <div
            class="btn btn-circle drawer-button btn-sm bg-neutral text-neutral-content shadow-lg"
          >
            <Bars3Icon class="h-4 w-4" />
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MemoryChart from '@/components/charts/MemoryChart.vue'
import SpeedChart from '@/components/charts/SpeedChart.vue'
import CommonSidebar from '@/components/sidebar/CommonCtrl.vue'
import ConnectionCtrl from '@/components/sidebar/ConnectionCtrl.vue'
import LogsCtrl from '@/components/sidebar/LogsCtrl.vue'
import ProxiesCtrl from '@/components/sidebar/ProxiesCtrl.vue'
import { ROUTE_NAME } from '@/router'
import { fetchConfigs } from '@/store/config'
import { initConnections } from '@/store/connections'
import { initLogs } from '@/store/logs'
import { fetchProxies } from '@/store/proxies'
import { fetchRules } from '@/store/rules'
import { activeUuid } from '@/store/setup'
import {
  ArrowsRightLeftIcon,
  Bars3Icon,
  Cog6ToothIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const sidebarCompMap = {
  [ROUTE_NAME.connections]: ConnectionCtrl,
  [ROUTE_NAME.logs]: LogsCtrl,
  [ROUTE_NAME.proxies]: ProxiesCtrl,
}

const routeIconMap = {
  [ROUTE_NAME.proxies]: GlobeAltIcon,
  [ROUTE_NAME.connections]: ArrowsRightLeftIcon,
  [ROUTE_NAME.rules]: WrenchScrewdriverIcon,
  [ROUTE_NAME.logs]: DocumentTextIcon,
  [ROUTE_NAME.settings]: Cog6ToothIcon,
}

const sidebarComp = computed(() => {
  if (route.name) {
    return sidebarCompMap[route.name as keyof typeof sidebarCompMap]
  }

  return null
})

const route = useRoute()
const routes = Object.values(ROUTE_NAME)

watch(
  activeUuid,
  () => {
    fetchConfigs()
    fetchProxies()
    fetchRules()
    initConnections()
    initLogs()
  },
  {
    immediate: true,
  },
)
</script>
