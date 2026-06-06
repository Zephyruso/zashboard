<template>
  <div :class="{ 'opacity-50': isDisabled, 'scroller-item': 1 }">
    <div
      class="hover:bg-base-200/40 flex flex-col gap-3 overflow-hidden px-3 py-2 text-sm transition-colors"
      :class="{
        'cursor-pointer': isSelectable,
      }"
      :role="isSelectable && !props.rule.disabled ? 'button' : undefined"
      :tabindex="isSelectable && !props.rule.disabled ? 0 : undefined"
      :aria-expanded="isSelectable && !props.rule.disabled ? !isCollapsed : undefined"
      @click="clickHandler"
      @keydown.enter.prevent="handleRowKeydown"
      @keydown.space.prevent="handleRowKeydown"
      @contextmenu.prevent.stop="openContextMenu"
      v-bind="longPressBindings"
    >
      <div class="min-h-5 leading-5">
        <span class="text-base-content/50 text-xs tabular-nums">
          {{ index }}
        </span>
        <span class="text-base-content/80 ml-4 text-xs">
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
          type="button"
          :class="
            twMerge(
              'btn btn-circle btn-ghost btn-xs -mt-[2px] ml-1',
              isUpdating ? 'animate-spin' : '',
            )
          "
          :aria-label="t('refresh')"
          :title="t('refresh')"
          :disabled="isUpdating"
          :aria-busy="isUpdating"
          @click.stop="updateRuleProviderClickHandler"
        >
          <ArrowPathIcon
            class="h-3.5 w-3.5 opacity-60"
            aria-hidden="true"
          />
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
          class="toggle toggle-sm"
          :checked="!isDisabled"
          :aria-label="isDisabled ? t('enable') : t('disable')"
          :disabled="isTogglingDisabled"
          :aria-busy="isTogglingDisabled"
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

    <template v-if="isSelectable && !isCollapsed">
      <div class="border-base-content/3 border-b"></div>
      <ProxyGroup
        :name="selected"
        :force-open="true"
        class="transparent-collapse bg-base-200/40! rounded-none!"
      />
    </template>
    <IOSContextMenu
      v-model="contextMenuOpen"
      :title="contextMenuTitle"
      :description="contextMenuDescription"
      :actions="contextMenuActions"
    />
  </div>
</template>

<script setup lang="ts">
import {
  disconnectByIdAPI,
  isRequestCanceled,
  toggleRuleDisabledAPI,
  toggleRuleDisabledSingBoxAPI,
  updateRuleProviderAPI,
} from '@/api'
import IOSContextMenu, { type IOSContextAction } from '@/components/common/IOSContextMenu.vue'
import { useBounceOnVisible } from '@/composables/bouncein'
import { useLongPress } from '@/composables/useIOSGestures'
import { showNotification } from '@/helper/notification'
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
  ClipboardDocumentIcon,
  InformationCircleIcon,
  PowerIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'
import type { Ref } from 'vue'
import {
  computed,
  createApp,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onUnmounted,
  ref,
} from 'vue'
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
let updateRuleProviderController: AbortController | undefined
let toggleRuleDisabledController: AbortController | undefined
let updateRuleProviderSeq = 0
let toggleRuleDisabledSeq = 0

const isCurrentUpdate = (controller: AbortController, seq: number) => {
  return updateRuleProviderController === controller && updateRuleProviderSeq === seq
}

const isCurrentToggle = (controller: AbortController, seq: number) => {
  return toggleRuleDisabledController === controller && toggleRuleDisabledSeq === seq
}
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

  updateRuleProviderController?.abort()
  const controller = new AbortController()
  const seq = ++updateRuleProviderSeq
  updateRuleProviderController = controller
  isUpdating.value = true
  try {
    await updateRuleProviderAPI(props.rule.payload, controller.signal)
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

const toggleRuleDisabledHandler = async () => {
  if (isTogglingDisabled.value) return

  toggleRuleDisabledController?.abort()
  const controller = new AbortController()
  const seq = ++toggleRuleDisabledSeq
  toggleRuleDisabledController = controller
  try {
    isTogglingDisabled.value = true
    const willBeDisabled = !isDisabled.value

    if (props.rule.uuid) {
      await toggleRuleDisabledSingBoxAPI(props.rule.uuid, controller.signal)
    } else {
      await toggleRuleDisabledAPI({ [props.rule.index]: willBeDisabled }, controller.signal)
    }

    if (!isCurrentToggle(controller, seq)) return

    if (willBeDisabled && disconnectOnRuleDisable.value) {
      const matchingConnections = activeConnections.value.filter((conn) => {
        const ruleTypeMatches = conn.rule === props.rule.type
        const rulePayloadMatches = (conn.rulePayload || '') === (props.rule.payload || '')
        return ruleTypeMatches && rulePayloadMatches
      })

      if (matchingConnections.length > 0) {
        await Promise.allSettled(matchingConnections.map((conn) => disconnectByIdAPI(conn.id)))
      }
    }

    if (isCurrentToggle(controller, seq)) await fetchRules()
  } catch (error) {
    if (isRequestCanceled(error)) return
    // Request interceptor surfaces API failures; keep this click handler settled.
  } finally {
    if (isCurrentToggle(controller, seq)) {
      isTogglingDisabled.value = false
      toggleRuleDisabledController = undefined
    }
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
    // Tear down the Vue subtree when tippy hides so we don't leak one app per hover.
    onHidden: () => {
      app.unmount()
    },
  })
}

const suppressClickAfterLongPress = ref(false)
let suppressClickTimer: ReturnType<typeof setTimeout> | undefined

const clickHandler = () => {
  if (suppressClickAfterLongPress.value) {
    suppressClickAfterLongPress.value = false
    return
  }
  if (isSelectable.value && !props.rule.disabled) {
    expandedRule.value = isCollapsed.value ? ruleKey.value : null
    selected.value = props.rule.proxy
  }
}

const handleRowKeydown = (e: KeyboardEvent) => {
  if (e.target !== e.currentTarget) return
  clickHandler()
}

const contextMenuOpen = ref(false)
const contextMenuTitle = computed(() => props.rule.payload || props.rule.type)
const contextMenuDescription = computed(() => {
  if (props.rule.payload) return `${props.rule.type} → ${props.rule.proxy}`
  return props.rule.proxy
})

const openContextMenu = () => {
  suppressClickAfterLongPress.value = true
  contextMenuOpen.value = true
  // Auto-clear the flag if no click arrives shortly after (e.g. right-click on
  // desktop never emits a follow-up click). Without this the next legitimate
  // tap on the row would be swallowed.
  if (suppressClickTimer !== undefined) clearTimeout(suppressClickTimer)
  suppressClickTimer = setTimeout(() => {
    suppressClickAfterLongPress.value = false
    suppressClickTimer = undefined
  }, 350)
}

const copyPayload = async () => {
  const text = props.rule.payload || props.rule.type
  try {
    await navigator.clipboard?.writeText(text)
    showNotification({
      content: 'copySuccess',
      type: 'alert-success',
      timeout: 1200,
    })
  } catch {
    showNotification({ content: 'copyFailed', type: 'alert-error' })
  }
}

const contextMenuActions = computed<IOSContextAction[]>(() => {
  const actions: IOSContextAction[] = []
  if (props.rule.uuid || props.rule.extra) {
    actions.push({
      id: 'toggle',
      label: isDisabled.value ? t('enable') : t('disable'),
      icon: PowerIcon,
      destructive: !isDisabled.value,
      onSelect: () => toggleRuleDisabledHandler(),
    })
  }
  if (isUpdateableRuleSet.value) {
    actions.push({
      id: 'refresh',
      label: t('refresh'),
      icon: ArrowPathIcon,
      onSelect: () => updateRuleProviderClickHandler(),
    })
  }
  actions.push({
    id: 'copy',
    label: t('copy'),
    icon: ClipboardDocumentIcon,
    onSelect: () => copyPayload(),
  })
  if (isSelectable.value) {
    actions.push({
      id: 'details',
      label: t('details'),
      icon: InformationCircleIcon,
      onSelect: () => {
        if (!props.rule.disabled) {
          expandedRule.value = ruleKey.value
          selected.value = props.rule.proxy
        }
      },
    })
  }
  return actions
})

const longPressBindings = useLongPress({
  duration: 480,
  onLongPress: openContextMenu,
})

useBounceOnVisible()

onUnmounted(() => {
  if (suppressClickTimer !== undefined) clearTimeout(suppressClickTimer)
})

onBeforeUnmount(() => {
  updateRuleProviderController?.abort()
  toggleRuleDisabledController?.abort()
  updateRuleProviderSeq += 1
  toggleRuleDisabledSeq += 1
  updateRuleProviderController = undefined
  toggleRuleDisabledController = undefined
})
</script>
