import { useCurrentElement, useElementBounding } from '@vueuse/core'
import { computed, onUnmounted, watch } from 'vue'
import { ctrlsBottom } from './paddingViews'

export function useCtrlsBar(width: number = 720) {
  const element = useCurrentElement()
  const { width: ctrlsBarWidth, bottom: ctrlsBarBottom, top } = useElementBounding(element)

  const isLargeCtrlsBar = computed(() => {
    return ctrlsBarWidth.value > width
  })

  watch(
    ctrlsBarBottom,
    () => {
      ctrlsBottom.value = ctrlsBarBottom.value - top.value
    },
    { immediate: true },
  )

  onUnmounted(() => {
    ctrlsBottom.value = 0
  })

  return {
    isLargeCtrlsBar,
  }
}
