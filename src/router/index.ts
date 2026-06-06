import { ROUTE_NAME } from '@/constant'
import { renderRoutes } from '@/helper'
import { i18n } from '@/i18n'
import { language } from '@/store/settings'
import { activeBackend } from '@/store/setup'
// HomePage is the shell (sidebar + dock) for every child route, so it must
// remain part of the initial bundle. Every page underneath ships in its own
// async chunk to keep the main-route payload small.
import HomePage from '@/views/HomePage.vue'
import { useTitle } from '@vueuse/core'
import { watch } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const childrenRouter = [
  {
    path: 'proxies',
    name: ROUTE_NAME.proxies,
    component: () => import('@/views/ProxiesPage.vue'),
  },
  {
    path: 'overview',
    name: ROUTE_NAME.overview,
    component: () => import('@/views/OverviewPage.vue'),
  },
  {
    path: 'connections',
    name: ROUTE_NAME.connections,
    component: () => import('@/views/ConnectionsPage.vue'),
  },
  {
    path: 'logs',
    name: ROUTE_NAME.logs,
    component: () => import('@/views/LogsPage.vue'),
  },
  {
    path: 'rules',
    name: ROUTE_NAME.rules,
    component: () => import('@/views/RulesPage.vue'),
  },
  {
    path: 'settings',
    name: ROUTE_NAME.settings,
    component: () => import('@/views/SettingsPage.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: ROUTE_NAME.proxies,
      component: HomePage,
      children: childrenRouter,
    },
    {
      path: '/setup',
      name: ROUTE_NAME.setup,
      component: () => import('@/views/SetupPage.vue'),
    },
    {
      path: '/:catchAll(.*)',
      redirect: ROUTE_NAME.proxies,
    },
  ],
})

const title = useTitle('zashboard')
const setTitleByName = (name: string | symbol | undefined) => {
  if (typeof name === 'string' && activeBackend.value) {
    const backend = activeBackend.value
    const prefix = backend.label || `${backend.host}:${backend.port}`
    title.value = `${prefix} | ${i18n.global.t(name)}`
  } else {
    title.value = 'zashboard'
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

  if (!activeBackend.value && to.name !== ROUTE_NAME.setup) {
    return { name: ROUTE_NAME.setup }
  }
})

router.afterEach((to) => {
  setTitleByName(to.name)
})

watch([language, activeBackend], () => {
  setTimeout(() => {
    setTitleByName(router.currentRoute.value.name)
  })
})

export default router
