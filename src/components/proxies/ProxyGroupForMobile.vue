<template>
  <div
    ref="cardWrapperRef"
    class="relative h-20 cursor-pointer"
    @click="handlerGroupClick"
    @touchmove="preventDefault"
    @wheel="preventDefault"
  >
    <div
      v-if="modalMode"
      class="fixed inset-0 z-40 overflow-hidden bg-black/30 transition-all duration-300"
    />
    <div
      ref="cardRef"
      class="card absolute overflow-hidden transition-[max-height,width,transform] duration-250 ease-in-out will-change-[max-height,width,transform]"
      :class="modalMode && blurIntensity < 5 && 'backdrop-blur-sm!'"
      :style="cardStyle"
      @contextmenu.prevent.stop="handlerLatencyTest"
      @transitionend="handlerTransitionEnd"
    >
      <div class="flex h-20 shrink-0 flex-col p-2 pb-1">
        <div class="flex flex-1">
          <div class="flex flex-1 flex-col gap-0.5 overflow-hidden">
            <div class="text-md truncate">
              {{ proxyGroup.name }}
            </div>
            <div class="text-base-content/80 flex items-center gap-1 truncate text-sm">
              <ProxyGroupNow
                :name="proxyGroup.name"
                :mobile="true"
              />
            </div>
          </div>
          <ProxyIcon
            v-if="proxyGroup?.icon"
            :icon="proxyGroup.icon"
            :size="40"
            :margin="0"
            class="shrink-0"
          />
        </div>

        <div class="flex items-center">
          <div class="flex flex-1 items-center gap-1 truncate">
            <span class="text-base-content/60 shrink-0 text-xs">
              {{ proxyGroup.type }} ({{ proxiesCount }})
            </span>
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
          </div>
          <LatencyTag
            :class="twMerge('bg-base-200/50 z-10 hover:shadow-sm')"
            :loading="isLatencyTesting"
            :name="proxyGroup.now"
            :group-name="proxyGroup.name"
            @click.stop="handlerLatencyTest"
          />
        </div>
      </div>

      <div
        v-if="displayContent"
        ref="cardContentRef"
        class="overflow-x-hidden overflow-y-auto overscroll-contain p-2"
        :class="SCROLLABLE_PARENT_CLASS"
        style="width: calc(100vw - 1rem)"
        @touchmove.stop="preventDefaultForContent"
        @wheel.stop="preventDefaultForContent"
      >
        <Component
          :is="groupProxiesByProvider ? ProxiesByProvider : ProxiesContent"
          :name="name"
          :now="proxyGroup.now"
          :render-proxies="renderProxies"
          :show-full-content="showAllContent"
          style="max-height: unset !important"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { useBounceOnVisible } from '@renderer/composables/bouncein'
import { useRenderProxies } from '@renderer/composables/renderProxies'
import { isHiddenGroup } from '@renderer/helper'
import { hiddenGroupMap, proxyGroupLatencyTest, proxyMap } from '@renderer/store/proxies'
import { blurIntensity, groupProxiesByProvider, manageHiddenGroup } from '@renderer/store/settings'
import { twMerge } from 'tailwind-merge'
import { computed, nextTick, ref } from 'vue'
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

const cardWrapperRef = ref()
const cardRef = ref()
const cardContentRef = ref()
const overflowY = ref(false)

const INIT_STYLE = {
  width: '100%',
  maxHeight: '100%',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10,
}
const cardStyle = ref<Record<string, string | number>>({
  ...INIT_STYLE,
})
const calcCardStyle = () => {
  if (!cardWrapperRef.value) return
  if (!modalMode.value) {
    cardStyle.value = {
      ...cardStyle.value,
      width: '100%',
      maxHeight: '100%',
      transform: 'translateY(0)',
      transition:
        'width 0.25s ease-in-out,transform 0.25s ease-in-out,max-height 0.18s ease-in-out!important',
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
    maxHeight: `calc(100dvh - ${verticalOffset}px - 7rem)`,
    transform: `translateY(${transformValueY}px)`,
    transformOrigin,
    zIndex: 50,
    [positionKeyY]: 0,
    [positionKeyX]: 0,
  }
}

const handlerTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName !== 'width') return
  showAllContent.value = modalMode.value
  if (!modalMode.value) {
    cardStyle.value = {
      ...INIT_STYLE,
    }
    displayContent.value = false
    return
  }

  nextTick(() => {
    if (!cardContentRef.value) return
    overflowY.value = cardContentRef.value.scrollHeight > cardContentRef.value.clientHeight
  })
}

const handlerGroupClick = async () => {
  modalMode.value = !modalMode.value
  if (modalMode.value) {
    displayContent.value = true
  }
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

const preventDefault = (e: Event) => {
  if (modalMode.value) {
    e.preventDefault()
  }
}

const preventDefaultForContent = (e: Event) => {
  if (!overflowY.value) {
    e.preventDefault()
  }
}

useBounceOnVisible(cardRef)
</script>
