<template>
  <div
    ref="cardRef"
    :class="
      twMerge(
        'bg-base-200 flex cursor-pointer flex-col items-start rounded-md hover:shadow-sm',
        active ? 'bg-primary sm:hover:bg-primary/95' : 'sm:hover:bg-base-300/50',
        isSmallCard ? 'gap-1 p-1' : 'gap-2 p-2',
        latencyTipAnimationClass,
      )
    "
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
        :class="`truncate text-xs tracking-tight ${active ? 'text-primary-content' : 'text-base-content/60'}`"
        @mouseenter="checkTruncation"
      >
        {{ typeDescription }}
      </span>
      <LatencyTag
        :class="[isSmallCard && 'h-4! w-8! rounded-md!', 'shrink-0']"
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
import { proxyLatencyTest } from '@/assembly/proxies'
import { getIPv6ByName, getTestUrl, proxyMap } from '@/assembly/proxies'
import { IPv6test, proxyCardSize, proxySortType, truncateProxyName } from '@/store/settings'
import { smartWeightsMap } from '@/store/smart'
import { twMerge } from 'tailwind-merge'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import LatencyTag from './LatencyTag.vue'
import ProxyIcon from './ProxyIcon.vue'

const { t } = useI18n()
const props = defineProps<{
  name: string
  active?: boolean
  groupName?: string
}>()

const cardRef = ref()
const node = computed(() => proxyMap.value[props.name])
const isLatencyTesting = ref(false)
const typeFormatter = (type: string) => {
  type = type.toLowerCase()
  type = type.replace('shadowsocks', 'ss')
  type = type.replace('hysteria', 'hy')
  type = type.replace('wireguard', 'wg')

  return type
}
const isSmallCard = computed(() => proxyCardSize.value === PROXY_CARD_SIZE.SMALL)
const typeDescription = computed(() => {
  const type = typeFormatter(node.value.type)
  const smartUsage = smartWeightsMap.value[props.groupName ?? '']?.[props.name]
  const smartDesc = smartUsage ? t(smartUsage) : ''
  const isV6 = IPv6test.value && getIPv6ByName(node.value.name) ? 'IPv6' : ''
  const isUDP = node.value.udp ? (node.value.xudp ? 'xudp' : 'udp') : ''

  return [type, isUDP, smartDesc, isV6].filter(Boolean).join(isSmallCard.value ? '/' : ' / ')
})

const latencyTipAnimationClass = ref<string[]>([])
const handlerLatencyTest = async () => {
  if (isLatencyTesting.value) return

  isLatencyTesting.value = true
  try {
    await proxyLatencyTest(props.name, getTestUrl(props.groupName), undefined, props.groupName)
    isLatencyTesting.value = false
  } catch {
    isLatencyTesting.value = false
  }

  if (
    [PROXY_SORT_TYPE.LATENCY_ASC, PROXY_SORT_TYPE.LATENCY_DESC].includes(proxySortType.value) &&
    cardRef.value
  ) {
    const classList = ['bg-info/20!', 'transition-colors', 'duration-1500']

    scrollIntoCenter(cardRef.value)
    latencyTipAnimationClass.value = classList
    setTimeout(() => {
      latencyTipAnimationClass.value = []
    }, 1500)
  }
}

onMounted(() => {
  if (props.active) {
    setTimeout(() => {
      scrollIntoCenter(cardRef.value)
    }, 300)
  }
})
</script>

<style scoped>
.tooltip:before {
  z-index: 20;
}
</style>
