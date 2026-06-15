<template>
  <div class="relative flex w-full items-center gap-2.5 overflow-hidden">
    <ProxyName
      :name="name"
      :icon-size="proxyGroupIconSize"
      :icon-margin="proxyGroupIconMargin"
      class="text-base-content font-medium"
    />
    <span
      class="text-base-content/40 min-w-0 flex-1 truncate text-[11px] font-medium tracking-wider uppercase tabular-nums"
      @mouseenter="checkTruncation"
    >
      {{ proxyGroup.type }} · {{ proxiesCount }}
    </span>
    <ProxyGroupFilter :group-name="name" />
    <button
      v-if="manageHiddenGroup"
      class="btn btn-circle btn-ghost btn-xs"
      @click.stop="handlerGroupToggle"
    >
      <EyeIcon
        v-if="!hiddenGroup"
        class="h-3 w-3"
      />
      <EyeSlashIcon
        v-else
        class="text-warning h-3 w-3"
      />
    </button>
    <LatencyTag
      :class="twMerge('bg-base-200/40 hover:bg-base-200/70')"
      :loading="isLatencyTesting"
      :name="proxyGroup.now"
      :group-name="proxyGroup.name"
      @click.stop="emit('latency-test')"
    />
  </div>
  <div class="text-base-content/70 mt-2 flex items-center gap-2">
    <div class="flex flex-1 items-center gap-2 truncate text-sm">
      <ProxyGroupNow :name="name" />
    </div>
    <div class="text-base-content/40 min-w-12 shrink-0 text-right text-xs tabular-nums">
      {{ prettyBytesHelper(downloadTotal) }}/s
    </div>
  </div>
</template>

<script setup lang="ts">
import { isHiddenGroup } from '@/helper'
import { checkTruncation } from '@/helper/tooltip'
import { prettyBytesHelper } from '@/helper/utils'
import { activeConnections } from '@/store/connections'
import { hiddenGroupMap, proxyMap } from '@/store/proxies'
import { manageHiddenGroup, proxyGroupIconMargin, proxyGroupIconSize } from '@/store/settings'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed } from 'vue'
import LatencyTag from './LatencyTag.vue'
import ProxyGroupFilter from './ProxyGroupFilter.vue'
import ProxyGroupNow from './ProxyGroupNow.vue'
import ProxyName from './ProxyName.vue'

const props = defineProps<{
  name: string
  proxiesCount: string
  isLatencyTesting: boolean
}>()

const emit = defineEmits<{
  'latency-test': []
}>()

const proxyGroup = computed(() => proxyMap.value[props.name])

const downloadTotal = computed(() => {
  return activeConnections.value
    .filter((conn) => conn.chains.includes(props.name))
    .reduce((total, conn) => total + conn.downloadSpeed, 0)
})

const hiddenGroup = computed({
  get: () => isHiddenGroup(props.name),
  set: (value: boolean) => {
    hiddenGroupMap.value[props.name] = value
  },
})

const handlerGroupToggle = () => {
  hiddenGroup.value = !hiddenGroup.value
}
</script>
