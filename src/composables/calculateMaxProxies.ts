import { PROXY_CARD_SIZE } from '@renderer/constant'
import { minProxyCardWidth, proxyCardSize } from '@renderer/store/settings'
import { useCurrentElement, useElementSize } from '@vueuse/core'
import { computed } from 'vue'

export const useCalculateMaxProxies = () => {
  const el = useCurrentElement()
  const { width } = useElementSize(el)
  const maxProxies = computed(() => {
    return (
      Math.floor(width.value / minProxyCardWidth.value) *
      (proxyCardSize.value === PROXY_CARD_SIZE.LARGE ? 9 : 12)
    )
  })

  return {
    maxProxies,
  }
}
