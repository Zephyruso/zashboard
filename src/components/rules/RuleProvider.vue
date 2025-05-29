<template>
  <div class="card hover:bg-base-200 w-full gap-2 p-2 text-sm">
    <div class="flex flex-1 items-center gap-2">
      <span>{{ index }}.</span>
      <span class="text-main">{{ ruleProvider.name }}</span>
      <span class="badge badge-sm bg-base-200">
        {{ ruleProvider.ruleCount }}
      </span>
    </div>
    <div class="text-base-content/80 flex h-4 items-center gap-2 text-xs">
      <span>{{ ruleProvider.behavior }}</span>
      <span>{{ ruleProvider.vehicleType }}</span>
      <span>{{ $t('updated') }} {{ fromNow(ruleProvider.updatedAt) }}</span>
      <button
        v-if="ruleProvider.vehicleType !== 'Inline'"
        :class="twMerge('btn btn-circle btn-xs', isUpdating ? 'animate-spin' : '')"
        @click="updateRuleProviderClickHandler"
      >
        <ArrowPathIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { updateRuleProviderAPI } from '@renderer/api'
import { useBounceOnVisible } from '@renderer/composables/bouncein'
import { fromNow } from '@renderer/helper/utils'
import { fetchRules } from '@renderer/store/rules'
import type { RuleProvider } from '@renderer/types'
import { twMerge } from 'tailwind-merge'
import { ref } from 'vue'
const isUpdating = ref(false)
const props = defineProps<{
  ruleProvider: RuleProvider
  index: number
}>()

const updateRuleProviderClickHandler = async () => {
  if (isUpdating.value) return

  isUpdating.value = true
  await updateRuleProviderAPI(props.ruleProvider.name)
  fetchRules()
  isUpdating.value = false
}

useBounceOnVisible()
</script>
