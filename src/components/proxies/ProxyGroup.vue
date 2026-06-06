<template>
  <CollapseCard
    :name="proxyGroup.name"
    :force-open="forceOpen"
    :data-group-name="proxyGroup.name"
    @contextmenu.prevent.stop="handlerLatencyTest"
  >
    <template v-slot:title>
      <div class="relative flex w-full items-center gap-2 overflow-hidden">
        <ProxyName
          :name="name"
          :icon-size="proxyGroupIconSize"
          :icon-margin="proxyGroupIconMargin"
        />
        <span
          class="text-base-content/60 min-w-0 flex-1 truncate text-xs tabular-nums"
          @mouseenter="checkTruncation"
        >
          · {{ proxyGroup.type }} · {{ proxiesCount }}
        </span>
        <ProxyGroupFilter :group-name="name" />
        <button
          v-if="manageHiddenGroup"
          type="button"
          class="btn btn-circle btn-xs"
          :aria-label="hiddenGroup ? t('showConnection') : t('hideConnection')"
          :title="hiddenGroup ? t('showConnection') : t('hideConnection')"
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
          :class="LATENCY_TAG_CLASS"
          :loading="isLatencyTesting"
          :name="proxyGroup.now"
          :group-name="proxyGroup.name"
          @click.stop="handlerLatencyTest"
        />
      </div>
      <div class="text-base-content/80 mt-1.5 flex items-center gap-2">
        <div class="flex flex-1 items-center gap-2 truncate text-sm">
          <ProxyGroupNow :name="name" />
        </div>
        <div class="min-w-12 shrink-0 text-right text-xs">
          {{ prettyBytesHelper(downloadTotal) }}/s
        </div>
      </div>
    </template>
    <template v-slot:preview>
      <ProxyPreview
        :nodes="renderProxies"
        :now="proxyGroup.now"
        :groupName="proxyGroup.name"
        @nodeclick="handlerProxySelect(name, $event)"
      />
    </template>
    <template v-slot:content>
      <Component
        :is="groupProxiesByProvider ? ProxiesByProvider : ProxiesContent"
        :name="name"
        :now="proxyGroup.now"
        :render-proxies="renderProxies"
      />
    </template>
  </CollapseCard>
</template>

<script setup lang="ts">
import { useBounceOnVisible } from '@/composables/bouncein'
import { useRenderProxyList } from '@/composables/renderProxies'
import { isHiddenGroup } from '@/helper'
import { checkTruncation } from '@/helper/tooltip'
import { prettyBytesHelper } from '@/helper/utils'
import { activeConnectionChainStats } from '@/store/connections'
import {
  handlerProxySelect,
  hiddenGroupMap,
  proxyGroupLatencyTest,
  proxyMap,
} from '@/store/proxies'
import {
  groupProxiesByProvider,
  manageHiddenGroup,
  proxyGroupIconMargin,
  proxyGroupIconSize,
} from '@/store/settings'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CollapseCard from '../common/CollapseCard.vue'
import LatencyTag from './LatencyTag.vue'
import ProxiesByProvider from './ProxiesByProvider.vue'
import ProxiesContent from './ProxiesContent.vue'
import ProxyGroupFilter from './ProxyGroupFilter.vue'
import ProxyGroupNow from './ProxyGroupNow.vue'
import ProxyName from './ProxyName.vue'
import ProxyPreview from './ProxyPreview.vue'

const props = defineProps<{
  name: string
  forceOpen?: boolean
}>()
const LATENCY_TAG_CLASS = 'bg-base-200/50 hover:bg-base-200'
const { t } = useI18n()
const proxyGroup = computed(() => proxyMap.value[props.name])
const allProxies = computed(() => proxyGroup.value.all ?? [])
const { proxiesCount, renderProxies } = useRenderProxyList(allProxies, props.name)
const isLatencyTesting = ref(false)
let latencyTestController: AbortController | undefined
let latencyTestSeq = 0

const isCurrentLatencyTest = (controller: AbortController, seq: number) => {
  return latencyTestController === controller && latencyTestSeq === seq
}

const handlerLatencyTest = async () => {
  if (isLatencyTesting.value) return

  latencyTestController?.abort()
  const controller = new AbortController()
  const seq = ++latencyTestSeq
  latencyTestController = controller
  isLatencyTesting.value = true
  try {
    await proxyGroupLatencyTest(props.name, undefined, controller.signal)
  } catch {
    // Request interceptor surfaces API failures; keep this click handler settled.
  } finally {
    if (isCurrentLatencyTest(controller, seq)) {
      isLatencyTesting.value = false
      latencyTestController = undefined
    }
  }
}
const downloadTotal = computed(() => {
  return activeConnectionChainStats.value.get(props.name)?.downloadSpeed ?? 0
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

useBounceOnVisible()

onBeforeUnmount(() => {
  latencyTestController?.abort()
  latencyTestSeq += 1
  latencyTestController = undefined
})
</script>
