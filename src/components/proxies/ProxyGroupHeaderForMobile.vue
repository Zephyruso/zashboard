<template>
  <div class="relative flex h-18 shrink-0 flex-col justify-between">
    <div
      class="text-md truncate font-medium"
      :class="proxyGroup.icon && 'pr-10'"
    >
      {{ proxyGroup.name }}
    </div>
    <div
      class="text-base-content/40 flex min-w-0 items-center gap-2 truncate text-[11px]"
      :class="proxyGroup.icon && 'pr-12'"
    >
      <span class="shrink-0 font-medium tracking-wider whitespace-nowrap uppercase tabular-nums">
        {{ proxyGroup.type }} · {{ proxiesCount }}
      </span>
      <ProxyGroupFilter
        v-if="displayContent"
        :group-name="name"
      />
    </div>
    <div class="flex items-center">
      <div class="flex flex-1 items-center gap-1 truncate">
        <VisibilityToggle
          v-if="manageHiddenGroup"
          :hidden="hiddenGroup"
          class="z-10"
          @toggle="handlerGroupToggle"
        />
        <ProxyGroupNow
          :name="proxyGroup.name"
          :mobile="true"
        />
      </div>
      <div
        v-if="!twoColumnProxyGroup || displayContent"
        class="text-base-content/40 mr-2 min-w-12 shrink-0 text-right text-xs tabular-nums"
      >
        {{ prettyBytesHelper(downloadTotal) }}/s
      </div>
      <LatencyTag
        :class="twMerge('bg-base-200/40 hover:bg-base-200/70 z-10')"
        :loading="isLatencyTesting"
        :name="proxyGroup.now"
        :group-name="proxyGroup.name"
        @click.stop="emit('latency-test')"
      />
    </div>
    <ProxyIcon
      v-if="proxyGroup?.icon"
      :icon="proxyGroup.icon"
      :size="40"
      :margin="0"
      class="absolute top-0 right-0"
    />
  </div>
</template>

<script setup lang="ts">
import { isHiddenGroup } from '@/helper'
import { hiddenGroupMap, proxyMap } from '@/assembly/proxies'
import { prettyBytesHelper } from '@/helper/utils'
import { getConnectionChains } from '@/helper'
import { activeConnections } from '@/store/connections'
import { manageHiddenGroup, twoColumnProxyGroup } from '@/store/settings'
import { twMerge } from 'tailwind-merge'
import { computed } from 'vue'
import VisibilityToggle from '../common/VisibilityToggle.vue'
import LatencyTag from './LatencyTag.vue'
import ProxyGroupFilter from './ProxyGroupFilter.vue'
import ProxyGroupNow from './ProxyGroupNow.vue'
import ProxyIcon from './ProxyIcon.vue'

const props = defineProps<{
  name: string
  proxiesCount: string
  isLatencyTesting: boolean
  displayContent: boolean
}>()

const emit = defineEmits<{
  'latency-test': []
}>()

const proxyGroup = computed(() => proxyMap.value[props.name])

const downloadTotal = computed(() => {
  return activeConnections.value
    .filter((conn) => getConnectionChains(conn).includes(props.name))
    .reduce((total, conn) => total + conn.downloadSpeed, 0)
})

const hiddenGroup = computed({
  get: () => Boolean(isHiddenGroup(props.name)),
  set: (value: boolean) => {
    hiddenGroupMap.value[props.name] = value
  },
})

const handlerGroupToggle = () => {
  hiddenGroup.value = !hiddenGroup.value
}
</script>
