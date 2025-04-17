import { isMiddleScreen } from '@/helper/utils'
import { scrollAnimationEffect } from '@/store/settings'
import { useCurrentElement, useElementVisibility } from '@vueuse/core'
import { onMounted, watch, type Ref } from 'vue'

const className = 'bounce-in'

export function useBounceOnVisible(el: Ref<HTMLElement> = useCurrentElement<HTMLElement>()) {
  if (!isMiddleScreen.value || !scrollAnimationEffect.value) return

  const visible = useElementVisibility(el)

  onMounted(() => {
    if (!el.value) return

    el.value.style.opacity = '0'

    watch(
      visible,
      (value) => {
        if (value) {
          el.value?.classList.add(className)
          el.value!.style.opacity = 'unset'
        } else {
          el.value?.classList.remove(className)
          el.value!.style.opacity = '0'
        }
      },
      { immediate: true },
    )
  })
}
