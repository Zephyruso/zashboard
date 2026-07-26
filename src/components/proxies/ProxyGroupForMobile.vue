<template>
  <div
    class="group relative h-22 cursor-pointer"
    :data-group-name="proxyGroup.name"
    ref="cardWrapperRef"
    @click="handlerGroupClick"
  >
    <div
      v-if="modalMode"
      class="fixed inset-0 z-40 overflow-hidden bg-transparent backdrop-blur-sm"
    />
    <div
      class="base-container absolute flex flex-col gap-2 overflow-hidden p-2 transition-[width,transform,max-height] duration-200 ease-out will-change-transform"
      :class="modalMode && blurIntensity < 5 && 'backdrop-blur-sm!'"
      :style="cardStyle"
      @contextmenu.prevent.stop="handlerLatencyTest"
      @transitionend="handlerTransitionEnd"
      ref="cardRef"
    >
      <ProxyGroupHeaderForMobile
        :name="name"
        :proxies-count="proxiesCount"
        :is-latency-testing="isLatencyTesting"
        :display-content="displayContent"
        @latency-test="handlerLatencyTest"
      />

      <div
        v-if="displayContent"
        class="will-change-opacity max-h-108 overflow-y-auto overscroll-contain transition-opacity duration-200 ease-out"
        :class="[PROXIES_PARENT_CLASS]"
        :style="{
          width: 'calc(100vw - 2.5rem)',
          opacity: contentOpacity,
          contain: 'layout style paint',
        }"
      >
        <Component
          :is="groupProxiesByProvider ? ProxiesByProvider : ProxiesContent"
          :name="name"
          :now="proxyGroup.now"
          :render-proxies="renderProxies"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBounceOnVisible } from '@/composables/bouncein'
import { disableProxiesPageScroll } from '@/composables/proxies'
import { useRenderProxyList } from '@/composables/renderProxies'
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import { proxyGroupLatencyTest } from '@/assembly/proxies'
import { proxyMap } from '@/assembly/proxies'
import { blurIntensity, groupProxiesByProvider } from '@/store/settings'
import { computed, nextTick, onUnmounted, ref } from 'vue'
import ProxiesByProvider from './ProxiesByProvider.vue'
import ProxiesContent from './ProxiesContent.vue'
import ProxyGroupHeaderForMobile from './ProxyGroupHeaderForMobile.vue'

const props = defineProps<{
  name: string
}>()
const proxyGroup = computed(() => proxyMap.value[props.name])
const allProxies = computed(() => proxyGroup.value.all ?? [])
const { proxiesCount, renderProxies } = useRenderProxyList(allProxies, props.name)
const isLatencyTesting = ref(false)

const modalMode = ref(false)
const displayContent = ref(false)
const showAllContent = ref(modalMode.value)
const contentOpacity = ref(0)

const cardWrapperRef = ref()
const cardRef = ref()

const INIT_STYLE = {
  width: '100%',
  maxHeight: '100%',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
  transform: 'translate3d(0, 0, 0) scale(1)',
}
const cardStyle = ref<Record<string, string | number>>({
  ...INIT_STYLE,
})

const calcCardStyle = () => {
  requestAnimationFrame(() => {
    if (!cardWrapperRef.value) return

    if (!modalMode.value) {
      cardStyle.value = {
        ...cardStyle.value,
        width: '100%',
        maxHeight: '100%',
        transform: 'translate3d(0, 0, 0) scale(1)',
        zIndex: 50,
      }
      return
    }

    const manyProxies = renderProxies.value.length > 4
    const { left, top, bottom } = cardWrapperRef.value.getBoundingClientRect()
    const { innerHeight, innerWidth } = window

    const minSafeArea = innerHeight * 0.15
    const baseLine = innerHeight * 0.2
    const maxSafeArea = innerHeight * 0.3

    const isLeft = left < innerWidth / 3
    const isTop = (top + bottom) * 0.5 < innerHeight * (manyProxies ? 0.7 : 0.5)
    const transformOrigin = isLeft
      ? isTop
        ? 'top left'
        : 'bottom left'
      : isTop
        ? 'top right'
        : 'bottom right'
    const positionKeyX = isLeft ? 'left' : 'right'
    const positionKeyY = isTop ? 'top' : 'bottom'

    let transformValueY = 0
    let verticalOffset = 0

    if (isTop) {
      if (top < minSafeArea || (top > maxSafeArea && manyProxies)) {
        transformValueY = baseLine - top
      }
      verticalOffset = top + transformValueY
    } else {
      const minSafeBottom = innerHeight - minSafeArea
      const maxSafeBottom = innerHeight - maxSafeArea
      const baseLineBottom = innerHeight - baseLine

      if (bottom > minSafeBottom || (bottom < maxSafeBottom && manyProxies)) {
        transformValueY = baseLineBottom - bottom
      }
      verticalOffset = innerHeight - bottom - transformValueY
    }

    cardStyle.value = {
      width: 'calc(100vw - 1.5rem)',
      maxHeight: `${innerHeight - verticalOffset - 112}px`,
      transform: `translate3d(0, ${transformValueY}px, 0) scale(1)`,
      transformOrigin,
      zIndex: 50,
      [positionKeyY]: 0,
      [positionKeyX]: 0,
    }
  })
}

const handlerTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName !== 'width') return

  if (modalMode.value) {
    contentOpacity.value = 1
    showAllContent.value = true
  } else {
    displayContent.value = false

    nextTick(() => {
      cardStyle.value = {
        ...INIT_STYLE,
      }
    })
  }
}

const handlerGroupClick = async () => {
  modalMode.value = !modalMode.value
  disableProxiesPageScroll.value = modalMode.value

  if (modalMode.value) {
    displayContent.value = true
  }
  showAllContent.value = false
  contentOpacity.value = 0

  calcCardStyle()
}

const handlerLatencyTest = async () => {
  if (isLatencyTesting.value) return

  isLatencyTesting.value = true
  try {
    await proxyGroupLatencyTest(props.name)
    isLatencyTesting.value = false
  } catch {
    isLatencyTesting.value = false
  }
}

onUnmounted(() => {
  if (modalMode.value) {
    disableProxiesPageScroll.value = false
  }
})

useBounceOnVisible(cardRef)
</script>
