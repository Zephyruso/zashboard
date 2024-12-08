<template>
  <div
    :class="
      twMerge(
        'flex cursor-pointer flex-wrap items-center justify-end gap-1 rounded-md bg-base-200 p-2 shadow-md sm:hover:scale-105',
        active && 'bg-primary text-primary-content',
        truncateProxyName && isTruncated && 'tooltip text-left',
      )
    "
    :data-tip="node.name"
  >
    <ProxyIcon
      v-if="node.icon"
      :icon="node.icon"
      in-node-card
    />
    <div
      :class="
        twMerge('flex-1 whitespace-nowrap text-xs md:text-sm', truncateProxyName && 'truncate')
      "
      ref="nameRef"
    >
      {{ node.name }}
    </div>
    <div
      :class="
        twMerge(
          'flex items-center text-xs sm:gap-2',
          twoColumnNodeForMobile ? 'gap-[2px]' : 'gap-1',
        )
      "
    >
      <div class="flex-1">
        <span>{{ typeFormatter(node.type) }}</span>
        <template v-if="node.udp">
          <span :class="twMerge('hidden sm:hidden', twoColumnNodeForMobile && 'inline')">:udp</span>
          <span :class="twMerge('hidden sm:inline', !twoColumnNodeForMobile && 'inline')">
            | udp
          </span>
        </template>
      </div>
      <LatencyTag
        :class="isLatencyTesting ? 'animate-pulse' : ''"
        :name="node.name"
        @click.stop="handlerLatencyTest"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { proxyLatencyTest, proxyMap } from '@/store/proxies'
import { truncateProxyName, twoColumnNodeForMobile } from '@/store/settings'
import { twMerge } from 'tailwind-merge'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import LatencyTag from './LatencyTag.vue'
import ProxyIcon from './ProxyIcon.vue'

const props = defineProps<{
  name: string
  active?: boolean
}>()
const nameRef = ref()
const isTruncated = ref(false)

let resizeObserver: ResizeObserver | null = null

const checkTruncation = () => {
  if (nameRef.value) {
    const { scrollWidth, clientWidth } = nameRef.value
    isTruncated.value = scrollWidth > clientWidth
  }
}

onMounted(() => {
  if (nameRef.value) {
    resizeObserver = new ResizeObserver(() => {
      checkTruncation()
    })
    resizeObserver.observe(nameRef.value)
  }

  checkTruncation()
})

onUnmounted(() => {
  if (resizeObserver && nameRef.value) {
    resizeObserver.unobserve(nameRef.value)
  }
  resizeObserver = null
})

const node = computed(() => proxyMap.value[props.name])
const isLatencyTesting = ref(false)
const typeFormatter = (type: string) => {
  type = type.toLowerCase()
  type = type.replace('shadowsocks', 'ss')
  type = type.replace('hysteria', 'hy')
  type = type.replace('wireguard', 'wg')

  return type
}
const handlerLatencyTest = async () => {
  if (isLatencyTesting.value) return

  isLatencyTesting.value = true
  try {
    await proxyLatencyTest(props.name)
    isLatencyTesting.value = false
  } catch {
    isLatencyTesting.value = false
  }
}
</script>

<style scoped>
.tooltip:before {
  z-index: 20;
}
</style>
