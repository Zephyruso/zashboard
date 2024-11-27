<template>
  <div class="w-128 drawer md:drawer-open">
    <input
      id="sidebar"
      type="checkbox"
      class="drawer-toggle"
    />

    <SideBar />

    <div
      class="drawer-content fixed bottom-0 flex h-full w-full flex-col overflow-hidden md:relative md:w-auto"
    >
      <RouterView class="flex-1 bg-base-200/50"></RouterView>

      <div class="flex h-12 w-full items-center justify-center gap-1 bg-base-200 p-1 md:hidden">
        <ul class="menu menu-horizontal">
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
import SideBar from '@/components/sidebar/SideBar.vue'
import { ROUTE_NAME } from '@/router'
import {
  fetchConfigs,
  proxiesTabShow,
  PROXY_TAB_TYPE,
  RULE_TAB_TYPE,
  rulesTabShow,
} from '@/store/config'
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
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const routeIconMap = {
  [ROUTE_NAME.proxies]: GlobeAltIcon,
  [ROUTE_NAME.connections]: ArrowsRightLeftIcon,
  [ROUTE_NAME.rules]: WrenchScrewdriverIcon,
  [ROUTE_NAME.logs]: DocumentTextIcon,
  [ROUTE_NAME.settings]: Cog6ToothIcon,
}

const route = useRoute()
const routes = Object.values(ROUTE_NAME)

watch(
  activeUuid,
  () => {
    rulesTabShow.value = RULE_TAB_TYPE.RULES
    proxiesTabShow.value = PROXY_TAB_TYPE.PROXIES
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
