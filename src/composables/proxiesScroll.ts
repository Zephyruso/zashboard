import { PROXY_CARD_SIZE } from '@/constant'
import { findScrollableParent } from '@/helper/utils'
import { minProxyCardWidth, proxyCardSize } from '@/store/settings'
import { useCurrentElement, useElementSize, useInfiniteScroll } from '@vueuse/core'
import { computed, nextTick, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

const SCROLL_STABLE_PROXY_LIMIT = 200

export const useCalculateMaxProxies = (
  totalProxies: MaybeRefOrGetter<number>,
  activeIndex: MaybeRefOrGetter<number>,
  enabled: MaybeRefOrGetter<boolean> = true,
) => {
  const el = useCurrentElement()
  const measuredElement = computed(() => (el.value instanceof HTMLElement ? el.value : null))
  const { width } = useElementSize(measuredElement)
  const totalProxyCount = computed(() => Math.max(0, toValue(totalProxies)))
  const enabledState = computed(() => toValue(enabled))
  const activeProxyIndex = computed(() => {
    if (!enabledState.value) return -1

    return Math.max(-1, toValue(activeIndex))
  })
  const initMaxProxies = computed(() => {
    if (totalProxyCount.value <= SCROLL_STABLE_PROXY_LIMIT) {
      return totalProxyCount.value
    }

    return (
      Math.max(Math.floor(width.value / minProxyCardWidth.value), 2) *
      (proxyCardSize.value === PROXY_CARD_SIZE.LARGE ? 9 : 12)
    )
  })
  const maxProxies = ref(Math.min(Math.max(24, activeProxyIndex.value + 12), totalProxyCount.value))

  const setMaxProxies = (nextMaxProxies: number) => {
    if (nextMaxProxies === maxProxies.value) return
    maxProxies.value = nextMaxProxies
  }

  const syncMaxProxies = () => {
    if (!enabledState.value) return

    setMaxProxies(
      Math.min(
        Math.max(maxProxies.value, initMaxProxies.value, activeProxyIndex.value + 12, 24),
        totalProxyCount.value,
      ),
    )
  }

  watch([initMaxProxies, totalProxyCount, activeProxyIndex, enabledState], syncMaxProxies, {
    immediate: true,
  })

  onMounted(() => {
    nextTick(() => {
      const element = measuredElement.value

      if (!element) return

      const scrollEl = findScrollableParent(element)

      if (!scrollEl) return

      useInfiniteScroll(
        scrollEl,
        () => {
          if (!enabledState.value) return

          setMaxProxies(
            Math.min(maxProxies.value + Math.max(initMaxProxies.value, 24), totalProxyCount.value),
          )
        },
        {
          distance: 100,
          interval: 120,
          canLoadMore: () => {
            return enabledState.value && maxProxies.value < totalProxyCount.value
          },
        },
      )
    })
  })

  return {
    maxProxies,
  }
}
