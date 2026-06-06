import { isMiddleScreen } from '@/helper/utils'
import { scrollAnimationEffect } from '@/store/settings'
import { useCurrentElement, useElementVisibility } from '@vueuse/core'
import { onMounted, onUnmounted, watch, type Ref } from 'vue'

const className = 'bounce-in'
const initClassName = ['scale-85', 'opacity-0']

export function useBounceOnVisible(el: Ref<HTMLElement> = useCurrentElement<HTMLElement>()) {
  if (!isMiddleScreen.value || !scrollAnimationEffect.value) return

  const visible = useElementVisibility(el)
  let stopVisibleWatch: ReturnType<typeof watch> | undefined

  onMounted(() => {
    if (!el.value) return

    el.value.classList.add(...initClassName)

    stopVisibleWatch = watch(
      visible,
      (value) => {
        if (!el.value) return
        if (!value) return

        el.value.classList.add(className)
        el.value.classList.remove(...initClassName)
        stopVisibleWatch?.()
        stopVisibleWatch = undefined
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    stopVisibleWatch?.()
    stopVisibleWatch = undefined
  })
}
