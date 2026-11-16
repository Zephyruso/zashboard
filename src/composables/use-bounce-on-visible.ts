import { isMiddleScreen } from '@/helper/utils'
import { scrollAnimationEffect } from '@/store/settings'
import { useCurrentElement, useElementVisibility } from '@vueuse/core'
import { onMounted, watch, type Ref } from 'vue'

const className = 'bounce-in'
const initClassName = ['scale-85', 'opacity-0']

export function useBounceOnVisible(el: Ref<HTMLElement> = useCurrentElement<HTMLElement>()) {
  if (!isMiddleScreen.value || !scrollAnimationEffect.value) return

  const visible = useElementVisibility(el)

  onMounted(() => {
    if (!el.value) return

    el.value.classList.add(...initClassName)

    watch(
      visible,
      (value) => {
        if (!el.value) return

        if (value) {
          el.value.classList.add(className)
          el.value.classList.remove(...initClassName)
        } else {
          el.value.classList.remove(className)
          el.value.classList.add(...initClassName)
        }
      },
      { immediate: true },
    )
  })
}
