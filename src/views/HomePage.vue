<template>
  <div class="drawer lg:drawer-open w-128">
    <input id="sidebar" type="checkbox" class="drawer-toggle" />

    <div class="drawer-side">
      <label for="sidebar" aria-label="close sidebar" class="drawer-overlay"></label>
      <div class="flex flex-col bg-base-200 text-base-content h-full">
        <ul class="menu w-80 p-4 flex-1">
          <li v-for="r in routes" :key="r">
            <a :class="r === route.name ? 'active' : ''" :href="`#${r}`">{{ $t(r) }}</a>
          </li>
        </ul>
        <component v-if="sidebarCompMap[route.name]" :is="sidebarCompMap[route.name]" />
        <CommonSidebar />
      </div>
    </div>

    <div class="drawer-content h-full overflow-hidden">
      <RouterView></RouterView>
      <label for="sidebar" class="btn btn-primary drawer-button lg:hidden">
        Open drawer
      </label>
    </div>

  </div>
</template>

<script setup lang="ts">
import { initConnections } from '@/store/connections';
import { initLogs } from '@/store/logs';
import { RouterView, useRoute } from 'vue-router'
import CommonSidebar from '@/components/sidebar/CommonSidebar.vue';
import { ROUTE_NAME } from '@/router';
import ConnectionSidebar from '@/components/sidebar/ConnectionSidebar.vue';

const sidebarCompMap = {
  [ROUTE_NAME.connections]: ConnectionSidebar
}

const route = useRoute()
const routes = [
  'proxies',
  'connections',
  'logs'
]

initConnections()
initLogs()
</script>