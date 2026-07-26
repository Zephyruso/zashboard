<template>
  <div :class="{ 'opacity-50': isDisabled, 'scroller-item': 1 }">
    <div
      class="transparent-collapse collapse rounded-none!"
      :class="isExpanded ? 'collapse-open' : 'collapse-close'"
    >
      <div
        class="collapse-title hover:bg-base-200/40 flex min-h-0 flex-col gap-3 overflow-hidden px-3 py-2 text-sm transition-colors"
        :class="{
          'cursor-pointer': isSelectable,
        }"
        @click="clickHandler"
      >
        <div class="min-h-5 leading-5">
          <span class="text-base-content/50 text-xs tabular-nums">
            {{ index }}
          </span>
          <span class="text-base-content/55 ml-4 text-xs tracking-wide">
            <HighlightText
              :text="rule.type"
              :filter="rulesFilter"
            />
            <template v-if="rule.payload"> : </template>
          </span>
          <span
            class="ml-2"
            v-if="rule.payload"
          >
            <HighlightText
              :text="rule.payload"
              :filter="rulesFilter"
            />
          </span>
          <span
            v-if="typeof size === 'number' && size !== -1"
            class="text-base-content/50 ml-1 text-xs tabular-nums"
          >
            ({{ size }})
            <QuestionMarkCircleIcon
              v-if="size === 0"
              class="-mt-1 ml-1 inline-block h-4 w-4"
              @mouseenter="showMMDBSizeTip"
            />
          </span>
          <button
            v-if="isUpdateableRuleSet"
            :class="
              twMerge(
                'btn btn-circle btn-ghost btn-xs -mt-[2px] ml-1',
                isUpdating ? 'animate-spin' : '',
              )
            "
            @click.stop="updateRuleProviderClickHandler"
          >
            <ArrowPathIcon class="h-3.5 w-3.5 opacity-60" />
          </button>
          <InformationCircleIcon
            v-if="rule.extra"
            class="-mt-[2px] ml-1 inline-block h-4 w-4 opacity-60"
            @mouseenter="showRuleHitInfoTip"
            @click.stop
          />
        </div>
        <div class="flex items-center gap-2">
          <input
            v-if="rule.uuid || rule.extra"
            type="checkbox"
            class="toggle"
            :checked="!isDisabled"
            @change="toggleRuleDisabledHandler"
            @click.stop
          />
          <ProxyChainPath
            :proxy="rule.proxy"
            :selected="selected"
            :collapsed="isCollapsed"
            :show-now-node="displayNowNodeInRule"
            :show-latency="displayLatencyInRule"
            :filter="rulesFilter"
            :interactive="!isCollapsed"
            @update:selected="selected = $event"
          />
        </div>
      </div>

      <div
        class="collapse-content p-0"
        @transitionend="handlerExpandTransitionEnd"
      >
        <template v-if="showExpandedContent">
          <div class="border-base-content/3 border-b"></div>
          <ProxyGroup
            :name="selected"
            :force-open="true"
            class="transparent-collapse bg-base-200/30"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { disconnectByIdAPI } from '@/assembly/connections'
import { useBounceOnVisible } from '@/composables/bouncein'
import { getConnectionRulePayload } from '@/helper'
import { useTooltip } from '@/helper/tooltip'
import { activeConnections } from '@/store/connections'
import { proxyGroupList } from '@/assembly/proxies'
import {
  fetchRules,
  ruleProviderList,
  rulesFilter,
  toggleRuleDisabledAPI,
  toggleRuleDisabledSingBoxAPI,
  updateRuleProviderAPI,
} from '@/assembly/rules'
import {
  disconnectOnRuleDisable,
  displayLatencyInRule,
  displayNowNodeInRule,
} from '@/store/settings'
import type { Rule } from '@/types'
import {
  ArrowPathIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'
import type { Ref } from 'vue'
import { computed, createApp, defineComponent, h, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HighlightText from '../common/HighlightText.vue'
import ProxyChainPath from '../common/ProxyChainPath.vue'
import ProxyGroup from '../proxies/ProxyGroup.vue'

const props = defineProps<{
  rule: Rule
  index: number
}>()

const expandedRule = inject<Ref<string | null>>('expandedRule', ref(null))
const ruleKey = computed(() => `${props.index}-${props.rule.payload}`)
const isCollapsed = computed(() => expandedRule.value !== ruleKey.value)
const isSelectable = computed(() => proxyGroupList.value.includes(props.rule.proxy))
const selected = ref('')

const isExpanded = computed(() => isSelectable.value && !isCollapsed.value)
const showExpandedContent = ref(isExpanded.value)

watch(isExpanded, (value) => {
  if (value) {
    showExpandedContent.value = true
  }
})

const handlerExpandTransitionEnd = () => {
  if (!isExpanded.value) {
    showExpandedContent.value = false
  }
}

const { t } = useI18n()
const { showTip } = useTooltip()

const size = computed(() => {
  if (props.rule.type === 'RuleSet') {
    return ruleProviderList.value.find((provider) => provider.name === props.rule.payload)
      ?.ruleCount
  }

  return props.rule.size
})

const isUpdating = ref(false)
const isTogglingDisabled = ref(false)
const isDisabled = computed(() => {
  const rule = props.rule

  if (rule.extra) {
    return rule.extra.disabled
  }

  return rule.disabled
})

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
  await fetchRules()
  isUpdating.value = false
}

const toggleRuleDisabledHandler = async () => {
  if (isTogglingDisabled.value) return

  try {
    isTogglingDisabled.value = true
    const willBeDisabled = !isDisabled.value

    if (props.rule.uuid) {
      await toggleRuleDisabledSingBoxAPI(props.rule.uuid)
    } else {
      await toggleRuleDisabledAPI({ [props.rule.index]: willBeDisabled })
    }

    if (willBeDisabled && disconnectOnRuleDisable.value) {
      const matchingConnections = activeConnections.value.filter((conn) => {
        const ruleTypeMatches = conn.rule === props.rule.type
        const rulePayloadMatches = getConnectionRulePayload(conn) === (props.rule.payload || '')

        return ruleTypeMatches && rulePayloadMatches
      })

      if (matchingConnections.length > 0) {
        matchingConnections.forEach((conn) => disconnectByIdAPI(conn.id))
      }
    }

    await fetchRules()
  } finally {
    isTogglingDisabled.value = false
  }
}

const showMMDBSizeTip = (e: Event) => {
  showTip(e, t('mmdbSizeTip'))
}

const ruleHitCount = computed(() => t('ruleHitCount', { count: props.rule.extra?.hitCount }))
const ruleLastHit = computed(() =>
  t('ruleLastHit', { time: dayjs(props.rule.extra?.hitAt).format('YYYY-MM-DD HH:mm:ss') }),
)
const ruleMissCount = computed(() => t('ruleMissCount', { count: props.rule.extra?.missCount }))
const ruleLastMiss = computed(() =>
  t('ruleLastMiss', { time: dayjs(props.rule.extra?.missAt).format('YYYY-MM-DD HH:mm:ss') }),
)

const showRuleHitInfoTip = (e: Event) => {
  if (!props.rule.extra) return

  const PopContent = defineComponent({
    setup() {
      return () =>
        h('div', { class: 'flex flex-col gap-2 text-sm' }, [
          h('div', { class: 'flex flex-col gap-1' }, [
            h('div', ruleHitCount.value),
            h('div', ruleLastHit.value),
          ]),
          h('div', { class: 'flex flex-col gap-1' }, [
            h('div', ruleMissCount.value),
            h('div', ruleLastMiss.value),
          ]),
        ])
    },
  })
  const mountEl = document.createElement('div')
  const app = createApp(PopContent)

  app.mount(mountEl)

  showTip(e, mountEl, {
    delay: [500, 0],
    trigger: 'mouseenter',
  })
}

const clickHandler = () => {
  if (isSelectable.value && !props.rule.disabled) {
    expandedRule.value = isCollapsed.value ? ruleKey.value : null
    selected.value = props.rule.proxy
  }
}

useBounceOnVisible()
</script>
