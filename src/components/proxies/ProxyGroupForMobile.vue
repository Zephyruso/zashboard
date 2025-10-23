<template>
  <div
    class="relative h-22 cursor-pointer"
    ref="cardWrapperRef"
    @click="handlerGroupClick"
  >
    <div
      v-if="modalMode"
      class="bg-base-300/50 fixed inset-0 z-40 overflow-hidden"
    />
    <div
      class="card absolute overflow-hidden transition-[width,transform,max-height] duration-200 ease-out will-change-transform"
      :class="modalMode && blurIntensity < 5 && 'backdrop-blur-sm!'"
      :style="cardStyle"
      @contextmenu.prevent.stop="handlerLatencyTest"
      @transitionend="handlerTransitionEnd"
    >
      <div class="relative flex h-22 shrink-0 flex-col justify-between p-2">
        <div
          class="text-md truncate"
          :class="proxyGroup.icon && 'pr-10'"
        >
          {{ proxyGroup.name }}
        </div>
        <div
          class="text-base-content/60 truncate text-xs"
          :class="proxyGroup.icon && 'pr-10'"
        >
          {{ proxyGroup.type }} ({{ proxiesCount }})
        </div>
        <div class="flex items-center">
          <div class="flex flex-1 items-center gap-1 truncate">
            <button
              v-if="manageHiddenGroup"
              class="btn btn-circle btn-xs z-10"
              @click.stop="handlerGroupToggle"
            >
              <EyeIcon
                v-if="!hiddenGroup"
                class="h-3 w-3"
              />
              <EyeSlashIcon
                v-else
                class="h-3 w-3"
              />
            </button>
            <ProxyGroupNow
              :name="proxyGroup.name"
              :mobile="true"
            />
          </div>
          <LatencyTag
            :class="twMerge('bg-base-200/50 hover:bg-base-200 z-10')"
            :loading="isLatencyTesting"
            :name="proxyGroup.now"
            :group-name="proxyGroup.name"
            @click.stop="handlerLatencyTest"
          />
        </div>
        <ProxyIcon
          v-if="proxyGroup?.icon"
          :icon="proxyGroup.icon"
          :size="40"
          :margin="0"
          class="absolute top-2 right-2"
        />
      </div>

      <div
        v-if="displayContent"
        class="will-change-opacity max-h-108 overflow-y-auto overscroll-contain p-2 transition-opacity duration-200 ease-out"
        :class="[SCROLLABLE_PARENT_CLASS]"
        :style="{
          width: 'calc(100vw - 1rem)',
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
import { useRenderProxies } from '@/composables/renderProxies'
import { isHiddenGroup } from '@/helper'
import { hiddenGroupMap, proxyGroupLatencyTest, proxyMap } from '@/store/proxies'
import { blurIntensity, groupProxiesByProvider, manageHiddenGroup } from '@/store/settings'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed, nextTick, ref } from 'vue'
import { disableProxiesPageScroll } from '../../composables/proxies'
import { SCROLLABLE_PARENT_CLASS } from '../../helper/utils'
import LatencyTag from './LatencyTag.vue'
import ProxiesByProvider from './ProxiesByProvider.vue'
import ProxiesContent from './ProxiesContent.vue'
import ProxyGroupNow from './ProxyGroupNow.vue'
import ProxyIcon from './ProxyIcon.vue'

const props = defineProps<{
  name: string
}>()
const proxyGroup = computed(() => proxyMap.value[props.name])
const allProxies = computed(() => proxyGroup.value.all ?? [])
const { proxiesCount, renderProxies } = useRenderProxies(allProxies, props.name)
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
      width: 'calc(100vw - 1rem)',
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
const hiddenGroup = computed({
  get: () => isHiddenGroup(props.name),
  set: (value: boolean) => {
    hiddenGroupMap.value[props.name] = value
  },
})

const handlerGroupToggle = () => {
  hiddenGroup.value = !hiddenGroup.value
}

useBounceOnVisible(cardRef)
</script>
