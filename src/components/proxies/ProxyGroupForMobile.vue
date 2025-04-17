<template>
  <div
    class="relative h-20 cursor-pointer"
    ref="cardWrapperRef"
    @click="handlerGroupClick"
  >
    <div
      v-if="activeMode"
      class="fixed inset-0 z-40 transition-all duration-200"
      :class="modalMode && 'bg-black/30'"
    ></div>
    <div
      class="card overflow-hidden will-change-[height,width,transform]"
      :class="[
        activeMode ? `fixed z-50` : 'absolute top-0 left-0 h-auto w-full',
        transitionAll && 'transition-all duration-200',
        blurIntensity < 5 && 'backdrop-blur-sm!',
      ]"
      :style="activeMode && [cardPosition, cardSize]"
      @contextmenu.prevent.stop="handlerLatencyTest"
      @transitionend="handlerTransitionEnd"
      ref="cardRef"
    >
      <div class="flex h-20 shrink-0 flex-col gap-1 p-2">
        <ProxyIcon
          v-if="proxyGroup?.icon"
          :icon="proxyGroup.icon"
          size="small"
          class="absolute top-2 right-2 z-[-1] h-10 w-10!"
        />
        <div class="text-md truncate">
          {{ proxyGroup.name }}
        </div>
        <div class="text-base-content/80 flex h-4 gap-1 truncate text-xs">
          <template v-if="proxyGroup.now">
            <LockClosedIcon
              class="h-4 w-4 shrink-0"
              v-if="proxyGroup.fixed === proxyGroup.now"
              @mouseenter="tipForFixed"
            />
            {{ proxyGroup.now }}
          </template>
          <template v-else-if="proxyGroup.type.toLowerCase() === PROXY_TYPE.LoadBalance">
            <CheckCircleIcon class="h-4 w-4 shrink-0" />
            {{ $t('loadBalance') }}
          </template>
        </div>

        <div class="flex h-4 items-center justify-between gap-1">
          <span class="text-base-content/60 text-xs">
            {{ proxyGroup.type }} ({{ proxiesCount }})
          </span>
          <button
            v-if="manageHiddenGroup"
            class="btn btn-circle btn-xs z-10 ml-1"
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
          <div class="flex-1"></div>
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
        v-if="modalMode"
        class="grid flex-1 grid-cols-2 gap-2 overflow-x-hidden overflow-y-auto p-2"
        style="max-height: calc(50dvh - 5rem)"
      >
        <ProxyNodeCard
          v-for="node in diplayAllContent ? renderProxies : renderProxies.slice(0, 16)"
          :key="node"
          :name="node"
          :group-name="proxyGroup.name"
          :active="node === proxyGroup.now"
          @click.stop="handlerProxySelect(node)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBounceOnVisible } from '@/composables/bouncein'
import { useRenderProxies } from '@/composables/renderProxies'
import { PROXY_TYPE } from '@/constant'
import { isHiddenGroup } from '@/helper'
import { useTooltip } from '@/helper/tooltip'
import { hiddenGroupMap, proxyGroupLatencyTest, proxyMap, selectProxy } from '@/store/proxies'
import { blurIntensity, manageHiddenGroup } from '@/store/settings'
import { CheckCircleIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import LatencyTag from './LatencyTag.vue'
import ProxyIcon from './ProxyIcon.vue'
import ProxyNodeCard from './ProxyNodeCard.vue'

const props = defineProps<{
  name: string
}>()
const proxyGroup = computed(() => proxyMap.value[props.name])
const allProxies = computed(() => proxyGroup.value.all ?? [])
const { proxiesCount, renderProxies } = useRenderProxies(allProxies, props.name)
const isLatencyTesting = ref(false)

const activeMode = ref(false)
const modalMode = ref(activeMode.value)
const diplayAllContent = ref(activeMode.value)

const cardWrapperRef = ref()
const cardRef = ref()

const initWidth = ref(0)
const initHeight = ref(0)
const transitionAll = ref(false)

const cardPosition = ref<Record<string, string>>({})
const cardSize = computed(() => {
  if (modalMode.value) {
    return {
      width: 'calc(100vw - 1rem)',
    }
  }
  return {
    width: initWidth.value + 'px',
    height: initHeight.value + 'px',
  }
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const transitionEndCallback = ref<() => void>(() => {})
const handlerTransitionEnd = () => {
  transitionEndCallback.value()
}

const handlerGroupClick = async () => {
  const { innerHeight, innerWidth } = window
  const { x, y, width, height } = cardWrapperRef.value.getBoundingClientRect()
  const leftRightKey = x < innerWidth / 3 ? 'left' : 'right'
  const topBottomKey = y < innerHeight / 2 ? 'top' : 'bottom'
  const topBottomValue = topBottomKey === 'top' ? y : innerHeight - y - height

  transitionEndCallback.value = () => {}
  diplayAllContent.value = false
  transitionAll.value = false
  cardPosition.value = {
    [leftRightKey]: '0.5rem',
    [topBottomKey]: topBottomValue + 'px',
  }

  if (activeMode.value) {
    transitionAll.value = true
    modalMode.value = false
    transitionEndCallback.value = () => {
      transitionAll.value = false
      activeMode.value = false
    }
  } else {
    initWidth.value = width
    initHeight.value = height
    activeMode.value = true
    await sleep(50)
    transitionAll.value = true
    cardPosition.value[topBottomKey] = Math.max(topBottomValue, innerHeight * 0.15) + 'px'
    modalMode.value = true
    transitionEndCallback.value = () => {
      diplayAllContent.value = true
    }
  }
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

const handlerProxySelect = (name: string) => {
  if (proxyGroup.value.type.toLowerCase() === PROXY_TYPE.LoadBalance) return

  selectProxy(props.name, name)
}

const { showTip } = useTooltip()
const { t } = useI18n()
const tipForFixed = (e: Event) => {
  showTip(e, t('tipForFixed'), {
    delay: [500, 0],
  })
}

useBounceOnVisible(cardRef)
</script>
