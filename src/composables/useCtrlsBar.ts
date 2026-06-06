import { useCurrentElement, useElementSize } from '@vueuse/core'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

export function useCtrlsBar(width: MaybeRefOrGetter<number> = 720) {
  const element = useCurrentElement()
  const measuredElement = computed(() => (element.value instanceof Element ? element.value : null))
  const { width: ctrlsBarWidth } = useElementSize(measuredElement)
  const isLargeCtrlsBar = computed(() => {
    return ctrlsBarWidth.value > toValue(width)
  })

  return {
    isLargeCtrlsBar,
  }
}
