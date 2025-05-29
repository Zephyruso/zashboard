import { isCoreRunning } from '@/renderer/src/store/status'
import ProfilePage from '@/renderer/src/views/ProfilePage.vue'
import { ROUTE_NAME } from '@renderer/constant'
import { renderRoutes } from '@renderer/helper'
import { i18n } from '@renderer/i18n'
import { language } from '@renderer/store/settings'
import { activeBackend } from '@renderer/store/setup'
import ConnectionsPage from '@renderer/views/ConnectionsPage.vue'
import HomePage from '@renderer/views/HomePage.vue'
import LogsPage from '@renderer/views/LogsPage.vue'
import OverviewPage from '@renderer/views/OverviewPage.vue'
import ProxiesPage from '@renderer/views/ProxiesPage.vue'
import RulesPage from '@renderer/views/RulesPage.vue'
import SettingsPage from '@renderer/views/SettingsPage.vue'
import { useTitle } from '@vueuse/core'
import { watch } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const childrenRouter = [
  {
    path: 'profiles',
    name: ROUTE_NAME.profiles,
    component: ProfilePage,
  },
  {
    path: 'proxies',
    name: ROUTE_NAME.proxies,
    component: ProxiesPage,
  },
  {
    path: 'overview',
    name: ROUTE_NAME.overview,
    component: OverviewPage,
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
  history: createWebHashHistory('/'),
  routes: [
    {
      path: '/',
      redirect: ROUTE_NAME.proxies,
      component: HomePage,
      children: childrenRouter,
    },
    {
      path: '/:catchAll(.*)',
      redirect: ROUTE_NAME.proxies,
    },
  ],
})

const title = useTitle('Pantheon')
const setTitleByName = (name: string | symbol | undefined) => {
  if (typeof name === 'string' && activeBackend.value) {
    title.value = `Pantheon | ${i18n.global.t(name)}`
  } else {
    title.value = 'Pantheon'
  }
}

router.beforeEach((to, from) => {
  const toIndex = renderRoutes.value.findIndex((item) => item === to.name)
  const fromIndex = renderRoutes.value.findIndex((item) => item === from.name)

  if (toIndex === 0 && fromIndex === renderRoutes.value.length - 1) {
    to.meta.transition = 'slide-left'
  } else if (toIndex === renderRoutes.value.length - 1 && fromIndex === 0) {
    to.meta.transition = 'slide-right'
  } else if (toIndex !== fromIndex) {
    to.meta.transition = toIndex < fromIndex ? 'slide-right' : 'slide-left'
  }

  if (
    !isCoreRunning.value &&
    ![ROUTE_NAME.profiles, ROUTE_NAME.settings].includes(to.name as ROUTE_NAME)
  ) {
    router.push({ name: ROUTE_NAME.profiles })
  }
})

router.afterEach((to) => {
  setTitleByName(to.name)
})

watch(language, () => {
  setTitleByName(router.currentRoute.value.name)
})

export default router
