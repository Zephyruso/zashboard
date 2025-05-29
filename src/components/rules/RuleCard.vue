<template>
  <div class="card hover:bg-base-200 gap-2 p-2 text-sm">
    <div class="min-h-6">
      <span>{{ index }}.</span>
      <span class="ml-2 capitalize">{{ rule.type }}</span>
      <span
        v-if="rule.payload"
        class="text-main ml-2"
      >
        {{ rule.payload }}
      </span>
      <span
        v-if="typeof size === 'number' && size !== -1"
        class="badge badge-sm bg-base-200 ml-2"
      >
        {{ size }}
      </span>
      <button
        v-if="isUpdateableRuleSet"
        :class="twMerge('btn btn-circle btn-xs ml-2', isUpdating ? 'animate-spin' : '')"
        @click="updateRuleProviderClickHandler"
      >
        <ArrowPathIcon class="h-4 w-4" />
      </button>
    </div>
    <div class="text-base-content/80 flex items-center gap-1">
      <ProxyName
        :name="rule.proxy"
        class="text-xs"
      />
      <template v-if="proxyNode?.now && displayNowNodeInRule">
        <ArrowRightCircleIcon class="h-4 w-4" />
        <ProxyName
          :name="getNowProxyNodeName(rule.proxy)"
          class="text-xs"
        />
      </template>
      <span
        v-if="latency !== NOT_CONNECTED && displayLatencyInRule"
        :class="latencyColor"
        class="ml-1 text-xs"
      >
        {{ latency }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowPathIcon, ArrowRightCircleIcon } from '@heroicons/vue/24/outline'
import { updateRuleProviderAPI } from '@renderer/api'
import { useBounceOnVisible } from '@renderer/composables/bouncein'
import { NOT_CONNECTED } from '@renderer/constant'
import { getColorForLatency } from '@renderer/helper'
import { getLatencyByName, getNowProxyNodeName, proxyMap } from '@renderer/store/proxies'
import { fetchRules, ruleProviderList } from '@renderer/store/rules'
import { displayLatencyInRule, displayNowNodeInRule } from '@renderer/store/settings'
import type { Rule } from '@renderer/types'
import { twMerge } from 'tailwind-merge'
import { computed, ref } from 'vue'
import ProxyName from '../proxies/ProxyName.vue'

const props = defineProps<{
  rule: Rule
  index: number
}>()

const proxyNode = computed(() => proxyMap.value[props.rule.proxy])
const latency = computed(() => getLatencyByName(props.rule.proxy, props.rule.proxy))
const latencyColor = computed(() => getColorForLatency(Number(latency.value)))

const size = computed(() => {
  if (props.rule.type === 'RuleSet') {
    return ruleProviderList.value.find((provider) => provider.name === props.rule.payload)
      ?.ruleCount
  }

  return props.rule.size
})

const isUpdating = ref(false)
const isUpdateableRuleSet = computed(() => {
  if (props.rule.type !== 'RuleSet') {
    return false
  }

  const provider = ruleProviderList.value.find((provider) => provider.name === props.rule.payload)

  if (!provider) {
    return false
  }
  return provider.vehicleType !== 'Inline'
})

const updateRuleProviderClickHandler = async () => {
  if (isUpdating.value) return

  isUpdating.value = true
  await updateRuleProviderAPI(props.rule.payload)
  fetchRules()
  isUpdating.value = false
}

useBounceOnVisible()
</script>
