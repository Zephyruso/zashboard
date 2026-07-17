import { isMiddleScreen } from '@/helper/utils'
import { scrollAnimationEffect } from '@/store/settings'
import { useCurrentElement } from '@vueuse/core'
import { onMounted, onUnmounted, type Ref } from 'vue'

const className = 'bounce-in'
const initClassName = ['scale-85', 'opacity-0']

// 全部行共享一个 IntersectionObserver:每行各建一个观察者时,
// 虚拟列表会常驻 40-70 个实例,滚动期回调与实例开销叠加。
let sharedObserver: IntersectionObserver | null = null
const visibilityCallbacks = new WeakMap<Element, (visible: boolean) => void>()

const getObserver = () => {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        visibilityCallbacks.get(entry.target)?.(entry.isIntersecting)
      }
    })
  }
  return sharedObserver
}

export function useBounceOnVisible(el: Ref<HTMLElement> = useCurrentElement<HTMLElement>()) {
  if (!isMiddleScreen.value || !scrollAnimationEffect.value) return

  let observed: HTMLElement | null = null

  onMounted(() => {
    const element = el.value

    if (!element) return
    observed = element

    element.classList.add(...initClassName)
    visibilityCallbacks.set(element, (visible) => {
      if (visible) {
        element.classList.add(className)
        element.classList.remove(...initClassName)
      } else {
        element.classList.remove(className)
        element.classList.add(...initClassName)
      }
    })
    getObserver().observe(element)
  })

  onUnmounted(() => {
    if (observed) {
      sharedObserver?.unobserve(observed)
      visibilityCallbacks.delete(observed)
      observed = null
    }
  })
}
