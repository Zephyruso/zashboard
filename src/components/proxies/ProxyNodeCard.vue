<template>
  <div
    ref="cardRef"
    :class="cardClass"
    @contextmenu.stop.prevent="handlerLatencyTest"
  >
    <div
      class="w-full flex-1 text-sm"
      :class="truncateProxyName && 'truncate'"
      @mouseenter="checkTruncation"
    >
      <ProxyIcon
        v-if="node?.icon"
        class="-mt-[2px] shrink-0 align-middle"
        :icon="node.icon"
        :fill="active ? 'fill-primary-content' : 'fill-base-content'"
      /><span
        v-if="active"
        class="text-primary-content"
        >{{ node.name }}</span
      ><span
        v-else
        class="text-base-content"
        >{{ node.name }}</span
      >
    </div>

    <div class="flex h-4 w-full items-center justify-between">
      <span
        :class="typeDescriptionClass"
        @mouseenter="checkTruncation"
      >
        {{ typeDescription }}
      </span>
      <LatencyTag
        :class="latencyTagClass"
        :name="node.name"
        :loading="isLatencyTesting"
        :group-name="groupName"
        @click.stop="handlerLatencyTest"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PROXY_CARD_SIZE, PROXY_SORT_TYPE } from '@/constant'
import { checkTruncation } from '@/helper/tooltip'
import { scrollIntoCenter } from '@/helper/utils'
import { getIPv6ByName, getTestUrl, proxyLatencyTest, proxyMap } from '@/store/proxies'
import { IPv6test, proxyCardSize, proxySortType, truncateProxyName } from '@/store/settings'
import { smartWeightsMap } from '@/store/smart'
import { twMerge } from 'tailwind-merge'
import { computed, onBeforeUnmount, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LatencyTag from './LatencyTag.vue'
import ProxyIcon from './ProxyIcon.vue'

const { t } = useI18n()
const props = defineProps<{
  name: string
  active?: boolean
  groupName?: string
  autoScrollActive?: boolean
  nestedScrollSurface?: boolean
}>()

const formattedProxyTypeCache = new Map<string, string>()
const cardRef = ref()
const node = computed(() => proxyMap.value[props.name])
const isLatencyTesting = ref(false)
const typeFormatter = (type: string) => {
  const cached = formattedProxyTypeCache.get(type)
  if (cached !== undefined) return cached

  const formatted = type
    .toLowerCase()
    .replace('shadowsocks', 'ss')
    .replace('hysteria', 'hy')
    .replace('wireguard', 'wg')

  formattedProxyTypeCache.set(type, formatted)
  return formatted
}
const isSmallCard = computed(() => proxyCardSize.value === PROXY_CARD_SIZE.SMALL)
const cardClass = computed(() =>
  twMerge(
    'group bg-base-200/70 flex cursor-pointer flex-col items-start rounded-2xl border border-transparent transition-[background-color,transform,box-shadow,border-color] duration-200 ease-out active:scale-[0.98]',
    props.active
      ? 'bg-primary text-primary-content shadow-ios-card sm:hover:bg-primary/95'
      : props.nestedScrollSurface
        ? 'bg-base-200/80 hover:border-base-content/10 sm:hover:bg-base-200'
        : 'glass-surface hover:border-base-content/10 sm:hover:bg-base-200',
    isSmallCard.value ? 'gap-1 p-2' : 'gap-2 p-3',
    latencyTipAnimationClass.value,
  ),
)
const typeDescriptionClass = computed(() =>
  props.active
    ? 'truncate text-xs tracking-tight text-primary-content'
    : 'truncate text-xs tracking-tight text-base-content/60',
)
const latencyTagClass = computed(() =>
  isSmallCard.value ? ['h-4! w-8! rounded-md!', 'shrink-0'] : ['shrink-0'],
)
const typeDescription = computed(() => {
  const type = typeFormatter(node.value.type)
  const smartUsage = smartWeightsMap.value[props.groupName ?? '']?.[props.name]
  const smartDesc = smartUsage ? t(smartUsage) : ''
  const isV6 = IPv6test.value && getIPv6ByName(node.value.name) ? 'IPv6' : ''
  const isUDP = node.value.udp ? (node.value.xudp ? 'xudp' : 'udp') : ''
  const separator = isSmallCard.value ? '/' : ' / '
  let description = type

  if (isUDP) description += `${separator}${isUDP}`
  if (smartDesc) description += `${separator}${smartDesc}`
  if (isV6) description += `${separator}${isV6}`

  return description
})

const latencyTipAnimationClass = ref<string[]>([])
let latencyTipTimer: ReturnType<typeof setTimeout> | undefined
let initialScrollTimer: ReturnType<typeof setTimeout> | undefined
let latencyTestController: AbortController | undefined
let latencyTestSeq = 0

const isCurrentLatencyTest = (controller: AbortController, seq: number) => {
  return latencyTestController === controller && latencyTestSeq === seq
}

const clearInitialScrollTimer = () => {
  if (initialScrollTimer === undefined) return
  clearTimeout(initialScrollTimer)
  initialScrollTimer = undefined
}

const queueInitialScroll = () => {
  clearInitialScrollTimer()
  if (props.autoScrollActive === false) return

  initialScrollTimer = setTimeout(() => {
    initialScrollTimer = undefined
    if (!cardRef.value || !props.active || props.autoScrollActive === false) return
    scrollIntoCenter(cardRef.value, 'auto')
  }, 300)
}

const handlerLatencyTest = async () => {
  if (isLatencyTesting.value) return

  latencyTestController?.abort()
  const controller = new AbortController()
  const seq = ++latencyTestSeq
  let testSettled = false
  latencyTestController = controller
  isLatencyTesting.value = true
  try {
    await proxyLatencyTest(props.name, getTestUrl(props.groupName), undefined, controller.signal)
    testSettled = true
  } catch {
    if (controller.signal.aborted) return
    // Request interceptor surfaces API failures; avoid success-only scroll feedback.
  } finally {
    if (isCurrentLatencyTest(controller, seq)) {
      isLatencyTesting.value = false
    }
  }

  const isCurrent = isCurrentLatencyTest(controller, seq)

  if (
    isCurrent &&
    testSettled &&
    [PROXY_SORT_TYPE.LATENCY_ASC, PROXY_SORT_TYPE.LATENCY_DESC].includes(proxySortType.value) &&
    cardRef.value
  ) {
    const classList = ['bg-info/20!', 'transition-colors', 'duration-1500']

    scrollIntoCenter(cardRef.value)
    latencyTipAnimationClass.value = classList
    if (latencyTipTimer !== undefined) clearTimeout(latencyTipTimer)
    latencyTipTimer = setTimeout(() => {
      latencyTipAnimationClass.value = []
      latencyTipTimer = undefined
    }, 1500)
  }

  if (isCurrentLatencyTest(controller, seq)) {
    latencyTestController = undefined
  }
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      queueInitialScroll()
    } else {
      clearInitialScrollTimer()
    }
  },
  { immediate: true, flush: 'post' },
)

onUnmounted(() => {
  if (latencyTipTimer !== undefined) clearTimeout(latencyTipTimer)
  clearInitialScrollTimer()
})

onBeforeUnmount(() => {
  latencyTestController?.abort()
  latencyTestSeq += 1
  latencyTestController = undefined
})
</script>

<style scoped>
.tooltip:before {
  z-index: 20;
}
</style>
