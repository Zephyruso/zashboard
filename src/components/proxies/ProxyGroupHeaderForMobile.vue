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
import { hiddenGroupMap, proxyMap } from '@/store/proxies'
import { manageHiddenGroup } from '@/store/settings'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed } from 'vue'
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
