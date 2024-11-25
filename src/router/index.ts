import ConnectionsPage from '@/views/ConnectionsPage.vue'
import LogsPage from '@/views/LogsPage.vue'
import ProxiesPage from '@/views/ProxiesPage.vue'
import RulesPage from '@/views/RulesPage.vue'
import { createRouter, createWebHashHistory } from 'vue-router'

export enum ROUTE_NAME {
  proxies = 'proxies',
  connections = 'connections',
  logs = 'logs',
  rules = 'rules',
  settings = 'settings',
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/proxies',
      name: ROUTE_NAME.proxies,
      component: ProxiesPage,
    },
    {
      path: '/connections',
      name: ROUTE_NAME.connections,
      component: ConnectionsPage,
    },
    {
      path: '/logs',
      name: ROUTE_NAME.logs,
      component: LogsPage,
    },
    {
      path: '/rules',
      name: ROUTE_NAME.rules,
      component: RulesPage,
    },
    {
      path: '/settings',
      name: ROUTE_NAME.settings,
      component: () => import('@/views/SettingsPage.vue'),
    },
    {
      path: '/:catchAll(.*)',
      redirect: ROUTE_NAME.proxies,
    },
  ],
})

export default router
