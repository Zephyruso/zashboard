<template>
  <div class="scroller-item hover:bg-base-200/40 px-4 py-2.5 sm:flex sm:items-center sm:gap-4">
    <div class="flex min-w-0 items-center gap-2 sm:flex-1">
      <span class="text-base-content/50 shrink-0 text-xs tabular-nums">{{ index }}</span>
      <span class="min-w-0 truncate text-sm">
        <HighlightText
          :text="ruleProvider.name"
          :filter="rulesFilter"
        />
      </span>
      <span class="text-base-content/50 shrink-0 text-xs tabular-nums">
        · {{ ruleProvider.ruleCount }} {{ $t('rules') }}
      </span>
    </div>
    <div class="text-base-content/50 mt-1.5 flex items-center gap-1.5 text-xs sm:mt-0">
      <span v-if="ruleProvider.behavior">
        <HighlightText
          :text="ruleProvider.behavior"
          :filter="rulesFilter"
        />
      </span>
      <span v-if="ruleProvider.behavior && ruleProvider.vehicleType">·</span>
      <span v-if="ruleProvider.vehicleType">
        <HighlightText
          :text="ruleProvider.vehicleType"
          :filter="rulesFilter"
        />
      </span>
    </div>
    <div class="mt-1 flex items-center justify-between sm:mt-0 sm:shrink-0">
      <span class="text-base-content/50 text-xs">
        {{ $t('updated') }} {{ fromNow(ruleProvider.updatedAt) }}
      </span>
      <button
        v-if="ruleProvider.vehicleType !== 'Inline'"
        type="button"
        :class="
          twMerge('btn btn-circle btn-ghost btn-xs sm:ml-1.5', isUpdating ? 'animate-spin' : '')
        "
        :aria-label="$t('refresh')"
        :title="$t('refresh')"
        :disabled="isUpdating"
        :aria-busy="isUpdating"
        @click="updateRuleProviderClickHandler"
      >
        <ArrowPathIcon
          class="h-3.5 w-3.5 opacity-60"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isRequestCanceled, updateRuleProviderAPI } from '@/api'
import HighlightText from '@/components/common/HighlightText.vue'
import { useBounceOnVisible } from '@/composables/bouncein'
import { fromNow } from '@/helper/utils'
import { fetchRules, rulesFilter } from '@/store/rules'
import type { RuleProvider } from '@/types'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { onBeforeUnmount, ref } from 'vue'
const isUpdating = ref(false)
const props = defineProps<{
  ruleProvider: RuleProvider
  index: number
}>()
let updateRuleProviderController: AbortController | undefined
let updateRuleProviderSeq = 0

const isCurrentUpdate = (controller: AbortController, seq: number) => {
  return updateRuleProviderController === controller && updateRuleProviderSeq === seq
}

const updateRuleProviderClickHandler = async () => {
  if (isUpdating.value) return

  updateRuleProviderController?.abort()
  const controller = new AbortController()
  const seq = ++updateRuleProviderSeq
  updateRuleProviderController = controller
  isUpdating.value = true
  try {
    await updateRuleProviderAPI(props.ruleProvider.name, controller.signal)
    if (isCurrentUpdate(controller, seq)) await fetchRules()
  } catch (error) {
    if (isRequestCanceled(error)) return
    // Request interceptor surfaces API failures; keep this click handler settled.
  } finally {
    if (isCurrentUpdate(controller, seq)) {
      isUpdating.value = false
      updateRuleProviderController = undefined
    }
  }
}

useBounceOnVisible()

onBeforeUnmount(() => {
  updateRuleProviderController?.abort()
  updateRuleProviderSeq += 1
  updateRuleProviderController = undefined
})
</script>
