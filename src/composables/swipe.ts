import { proxiesTabShow, proxyProviederList } from '@/assembly/proxies'
import { ruleProviderList, rulesTabShow } from '@/assembly/rules'
import { CONNECTION_TAB_TYPE, PROXY_TAB_TYPE, ROUTE_NAME, RULE_TAB_TYPE } from '@/constant'
import { renderRoutes } from '@/helper'
import { connectionTabShow } from '@/store/connections'
import { swipeInPages, swipeInTabs } from '@/store/settings'
import { useSwipe } from '@vueuse/core'
import { flatten } from 'lodash'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export const disableSwipe = ref(false)

export const useSwipeRouter = () => {
  const swiperRef = ref()
  const route = useRoute()
  const router = useRouter()
  const { direction } = useSwipe(swiperRef, { threshold: 90 })

  const swipeList = computed(() => {
    return flatten(
      renderRoutes.value.map((r) => {
        if (swipeInTabs.value) {
          if (r === ROUTE_NAME.proxies && proxyProviederList.value.length > 0) {
            return Object.values(PROXY_TAB_TYPE).map((tab) => {
              return [
                () => route.name === ROUTE_NAME.proxies && proxiesTabShow.value === tab,
                () => {
                  router.push({ name: ROUTE_NAME.proxies, replace: true })
                  proxiesTabShow.value = tab
                },
              ]
            })
          } else if (r === ROUTE_NAME.connections) {
            return Object.values(CONNECTION_TAB_TYPE).map((tab) => {
              return [
                () => route.name === ROUTE_NAME.connections && connectionTabShow.value === tab,
                () => {
                  router.push({ name: ROUTE_NAME.connections, replace: true })
                  connectionTabShow.value = tab
                },
              ]
            })
          } else if (r === ROUTE_NAME.rules && ruleProviderList.value.length > 0) {
            return Object.values(RULE_TAB_TYPE).map((tab) => {
              return [
                () => route.name === ROUTE_NAME.rules && rulesTabShow.value === tab,
                () => {
                  router.push({ name: ROUTE_NAME.rules, replace: true })
                  rulesTabShow.value = tab
                },
              ]
            })
          }
        }

        return [[() => route.name === r, () => router.push({ name: r, replace: true })]]
      }),
    )
  })

  const getNextIndexInSwipeList = () => {
    return swipeList.value.findIndex((s) => s[0]())
  }

  const getNextRouteName = () => {
    const routeName = route.name as ROUTE_NAME

    if (routeName === ROUTE_NAME.setup) {
      return router.push({ name: ROUTE_NAME.proxies, replace: true })
    }

    return swipeList.value[(getNextIndexInSwipeList() + 1) % swipeList.value.length]?.[1]?.()
  }
  const getPrevRouteName = () => {
    const routeName = route.name as ROUTE_NAME

    if (routeName === ROUTE_NAME.setup) {
      return router.push({ name: ROUTE_NAME.proxies, replace: true })
    }

    return swipeList.value[
      (getNextIndexInSwipeList() - 1 + swipeList.value.length) % swipeList.value.length
    ]?.[1]?.()
  }

  const isInputActive = () => {
    const activeEl = document.activeElement
    return activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')
  }

  watch(direction, () => {
    if (!swipeInPages.value) return

    if (
      document.querySelector('dialog:modal') ||
      isInputActive() ||
      window.getSelection()?.toString()?.length ||
      disableSwipe.value
    )
      return
    if (direction.value === 'right') {
      getPrevRouteName()
    } else if (direction.value === 'left') {
      getNextRouteName()
    }
  })

  return {
    swiperRef,
  }
}
