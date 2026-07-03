import { ROUTE_NAME } from '@/constant'
import { isRouteAvailable, renderRoutes } from '@/helper'
import { i18n } from '@/i18n'
import { language } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import AppShell from '@/views/AppShell.vue'
import ConfigManagementPage from '@/views/ConfigManagementPage.vue'
import ConfigSubscriptionsPage from '@/views/ConfigSubscriptionsPage.vue'
import ConnectionsPage from '@/views/ConnectionsPage.vue'
import HomePage from '@/views/HomePage.vue'
import KernelManagementPage from '@/views/KernelManagementPage.vue'
import LogsPage from '@/views/LogsPage.vue'
import ProxiesPage from '@/views/ProxiesPage.vue'
import RoutingRulesPage from '@/views/RoutingRulesPage.vue'
import RulesPage from '@/views/RulesPage.vue'
import SettingsPage from '@/views/SettingsPage.vue'
import SetupPage from '@/views/SetupPage.vue'
import { useTitle } from '@vueuse/core'
import { watch } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const childrenRouter = [
  {
    path: '',
    name: ROUTE_NAME.home,
    component: HomePage,
  },
  {
    path: 'kernel-management',
    name: ROUTE_NAME.kernelManagement,
    component: KernelManagementPage,
  },
  {
    path: 'config-management',
    name: ROUTE_NAME.configManagement,
    component: ConfigManagementPage,
  },
  {
    path: 'config-subscriptions',
    name: ROUTE_NAME.configSubscriptions,
    component: ConfigSubscriptionsPage,
  },
  {
    path: 'routing-rules',
    name: ROUTE_NAME.routingRules,
    component: RoutingRulesPage,
  },
  {
    path: 'proxies',
    name: ROUTE_NAME.proxies,
    component: ProxiesPage,
  },
  {
    path: 'connections',
    name: ROUTE_NAME.connections,
    component: ConnectionsPage,
  },
  {
    path: 'logs',
    name: ROUTE_NAME.logs,
    component: LogsPage,
  },
  {
    path: 'rules',
    name: ROUTE_NAME.rules,
    component: RulesPage,
  },
  {
    path: 'settings',
    name: ROUTE_NAME.settings,
    component: SettingsPage,
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: childrenRouter,
    },
    {
      path: '/setup',
      name: ROUTE_NAME.setup,
      component: SetupPage,
    },
    {
      path: '/:catchAll(.*)',
      redirect: ROUTE_NAME.home,
    },
  ],
})

const appTitle = 'FastProxy'
const title = useTitle(appTitle)
const setTitleByName = (name: string | symbol | undefined) => {
  if (typeof name === 'string' && activeBackend.value) {
    title.value = `${appTitle} | ${i18n.global.t(name)}`
  } else {
    title.value = appTitle
  }
}

router.beforeEach((to, from) => {
  if (!isRouteAvailable(to.name)) {
    return { name: ROUTE_NAME.home }
  }

  const toIndex = renderRoutes.value.findIndex((item) => item === to.name)
  const fromIndex = renderRoutes.value.findIndex((item) => item === from.name)

  if (toIndex === 0 && fromIndex === renderRoutes.value.length - 1) {
    to.meta.transition = 'slide-left'
  } else if (toIndex === renderRoutes.value.length - 1 && fromIndex === 0) {
    to.meta.transition = 'slide-right'
  } else if (toIndex !== fromIndex) {
    to.meta.transition = toIndex < fromIndex ? 'slide-right' : 'slide-left'
  }
})

router.afterEach((to) => {
  setTitleByName(to.name)
})

watch(language, () => {
  setTimeout(() => {
    setTitleByName(router.currentRoute.value.name)
  })
})

export default router
