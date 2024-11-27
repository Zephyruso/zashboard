<template>
  <div class="drawer-side z-30">
    <label
      for="sidebar"
      aria-label="close sidebar"
      class="drawer-overlay"
    ></label>
    <div
      :class="
        twMerge(
          'flex h-full flex-col gap-2 overflow-x-hidden bg-base-200 p-2 text-base-content transition-all duration-500',
          isSiderbarCollapsed ? 'w-16 px-0' : 'w-[21rem]',
        )
      "
    >
      <ul class="menu flex-1 pb-0">
        <li
          v-for="r in routes"
          :key="r"
        >
          <a
            :class="r === route.name ? 'active' : 'inactive'"
            :href="`#${r}`"
          >
            <component
              :is="routeIconMap[r]"
              class="h-5 w-5"
            />
            <template v-if="!isSiderbarCollapsed">
              {{ $t(r) }}
            </template>
          </a>
        </li>
      </ul>
      <div class="flex items-center justify-center">
        <button
          class="btn btn-circle btn-xs"
          v-if="isSiderbarCollapsed"
        >
          <ArrowRightCircleIcon
            class="h-5 w-5"
            @click="isSiderbarCollapsed = false"
          />
        </button>
      </div>
      <template v-if="!isSiderbarCollapsed">
        <div class="card bg-base-100 shadow-lg">
          <component
            v-if="sidebarComp"
            :is="sidebarComp"
          />
          <CommonSidebar />
        </div>
        <SpeedCharts />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommonSidebar from '@/components/sidebar/CommonCtrl.vue'
import ConnectionCtrl from '@/components/sidebar/ConnectionCtrl.vue'
import LogsCtrl from '@/components/sidebar/LogsCtrl.vue'
import ProxiesCtrl from '@/components/sidebar/ProxiesCtrl.vue'
import RulesCtrl from '@/components/sidebar/RulesCtrl.vue'
import SpeedCharts from '@/components/sidebar/SpeedCharts.vue'
import { ROUTE_NAME } from '@/router'
import {
  ArrowRightCircleIcon,
  ArrowsRightLeftIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isSiderbarCollapsed } from './config'

const sidebarCompMap = {
  [ROUTE_NAME.connections]: ConnectionCtrl,
  [ROUTE_NAME.logs]: LogsCtrl,
  [ROUTE_NAME.proxies]: ProxiesCtrl,
  [ROUTE_NAME.rules]: RulesCtrl,
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
</script>
