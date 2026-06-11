<template>
  <div :class="{ 'opacity-50': isDisabled, 'scroller-item': 1 }">
    <div
      class="hover:bg-base-200/40 flex items-center gap-2 overflow-hidden px-3 py-2 text-sm transition-colors"
      :class="{
        'cursor-pointer': isSelectable,
      }"
      @click="clickHandler"
    >
      <div class="min-w-0 flex-1 truncate">
        <span class="text-base-content/50 text-xs tabular-nums">
          {{ index }}
        </span>
        <span class="text-base-content/80 ml-3 text-xs">
          <HighlightText
            :text="rule.type"
            :filter="rulesFilter"
          />
          <template v-if="rule.payload"> : </template>
        </span>
        <span
          v-if="rule.payload"
          class="ml-1"
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
        <InformationCircleIcon
          v-if="rule.extra"
          class="-mt-[2px] ml-1 inline-block h-4 w-4 opacity-60"
          @mouseenter="showRuleHitInfoTip"
          @click.stop
        />
      </div>
      <div class="max-w-[50%] min-w-0 shrink">
        <ProxyChainPath
          :proxy="rule.proxy"
          :selected="selected"
          :show-now-node="displayNowNodeInRule"
          :show-latency="displayLatencyInRule"
          :filter="rulesFilter"
          @update:selected="selected = $event"
        />
      </div>
      <input
        v-if="rule.uuid || rule.extra"
        type="checkbox"
        class="toggle toggle-sm shrink-0"
        :checked="!isDisabled"
        @change="toggleRuleDisabledHandler"
        @click.stop
      />
      <button
        :class="
          twMerge(
            'btn btn-circle btn-ghost btn-xs shrink-0',
            isUpdating ? 'animate-spin' : '',
            isUpdateableRuleSet ? '' : 'pointer-events-none invisible',
          )
        "
        :aria-hidden="!isUpdateableRuleSet"
        :tabindex="isUpdateableRuleSet ? 0 : -1"
        @click.stop="updateRuleProviderClickHandler"
      >
        <ArrowPathIcon class="h-3.5 w-3.5 opacity-60" />
      </button>
    </div>

    <div
      class="transparent-collapse bg-base-200/40! collapse rounded-none!"
      :class="isSelectable && !isCollapsed ? 'collapse-open' : 'collapse-close'"
    >
      <div
        v-if="isSelectable"
        class="collapse-content p-0!"
      >
        <div class="border-base-content/3 border-b"></div>
        <ProxyGroup
          :name="selected"
          :force-open="true"
          class="transparent-collapse bg-base-200/40! rounded-none!"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  disconnectByIdAPI,
  toggleRuleDisabledAPI,
  toggleRuleDisabledSingBoxAPI,
  updateRuleProviderAPI,
} from '@/api'
import { useBounceOnVisible } from '@/composables/bouncein'
import { useTooltip } from '@/helper/tooltip'
import { activeConnections } from '@/store/connections'
import { proxyGroupList } from '@/store/proxies'
import { fetchRules, ruleProviderList, rulesFilter } from '@/store/rules'
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
import { computed, createApp, defineComponent, h, inject, ref } from 'vue'
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
        const rulePayloadMatches = (conn.rulePayload || '') === (props.rule.payload || '')
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
