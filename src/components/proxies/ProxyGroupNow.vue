<template>
  <div class="flex flex-1 items-center gap-1 truncate">
    <template v-if="proxyGroup.now">
      <Component
        class="text-base-content/40 h-3.5 w-3.5 shrink-0 outline-none"
        :is="isFixed ? LockClosedIcon : ArrowRightCircleIcon"
        @mouseenter="tipForFixed"
      />
      <template v-if="displayProxyGroupChain">
        <div
          class="flex min-w-0 flex-1 items-center gap-1 truncate"
          :title="chainTitle"
        >
          <template
            v-for="(item, index) in displayChain"
            :key="`${item.name}-${index}`"
          >
            <ChevronRightIcon
              v-if="index > 0"
              class="text-base-content/40 h-3 w-3 shrink-0"
            />
            <ProxyName
              v-if="item.kind === 'group'"
              :name="item.name"
              class="text-base-content hover:bg-base-300 min-w-0 text-xs font-medium hover:-mx-1 hover:rounded-lg hover:px-1 hover:shadow md:text-sm"
              @click="handlerClickChainGroup($event, item.name)"
            />
            <ProxyName
              v-else-if="item.kind === 'node'"
              :name="item.name"
              class="text-base-content/70 min-w-0 text-xs font-medium md:text-sm"
            />
            <button
              v-else
              class="text-base-content/55 hover:bg-base-300 rounded px-1 text-xs"
              @click.stop="handlerClickExpand"
            >
              ...
            </button>
          </template>
        </div>
        <button
          v-if="canOpenChain"
          class="hover:bg-base-300 -mr-1 shrink-0 rounded-md p-0.5"
          :title="$t('proxyGroupChain')"
          @click.stop="handlerClickExpand"
        >
          <ArrowsPointingOutIcon class="text-base-content/55 h-3.5 w-3.5" />
        </button>
      </template>
      <template v-else>
        <ProxyName
          :name="proxyGroup.now"
          :class="
            isNowAGroup && 'hover:bg-base-300 hover:-mx-1 hover:rounded-lg hover:px-1 hover:shadow'
          "
          class="text-base-content text-xs font-medium md:text-sm"
          @click="handlerClickNow"
        />
        <template v-if="finalOutbound && displayFinalOutbound">
          <ArrowRightCircleIcon class="text-base-content/40 h-3.5 w-3.5 shrink-0" />
          <ProxyName
            :name="finalOutbound"
            class="text-base-content text-xs font-medium md:text-sm"
          />
        </template>
      </template>
    </template>
    <template v-else-if="proxyGroup.type.toLowerCase() === PROXY_TYPE.LoadBalance">
      <CheckCircleIcon class="text-base-content/40 h-3.5 w-3.5 shrink-0" />
      <span class="text-base-content text-xs font-medium md:text-sm">
        {{ $t('loadBalance') }}
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  getNowProxyNodeName,
  getProxyGroupChains,
  proxyGroupList,
  proxyMap,
} from '@/assembly/proxies'
import { hasChildProxyGroups, openProxyGroupChain } from '@/composables/proxyGroupChain'
import { PROXY_TYPE } from '@/constant'
import { useTooltip } from '@/helper/tooltip'
import { scrollToGroup } from '@/helper/utils'
import { displayFinalOutbound, displayProxyGroupChain } from '@/store/settings'
import {
  ArrowRightCircleIcon,
  ArrowsPointingOutIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  LockClosedIcon,
} from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProxyName from './ProxyName.vue'

type ChainItem = {
  name: string
  kind: 'group' | 'node' | 'ellipsis'
}

const props = defineProps<{
  name: string
  mobile?: boolean
}>()
const proxyGroup = computed(() => proxyMap.value[props.name])
const { showTip } = useTooltip()
const { t } = useI18n()

const isFixed = computed(() => {
  return proxyGroup.value.fixed === proxyGroup.value.now
})

const tipForFixed = (e: Event) => {
  if (!isFixed.value) {
    return
  }

  showTip(e, t('tipForFixed', { type: proxyGroup.value.type }), {
    delay: [500, 0],
  })
}

const isNowAGroup = computed(() => {
  return proxyGroupList.value.includes(proxyGroup.value.now)
})

const finalOutbound = computed(() => {
  const now = getNowProxyNodeName(proxyGroup.value.now)

  if (now === proxyGroup.value.now) {
    return ''
  }

  return now
})

const handlerClickNow = (e: Event) => {
  if (isNowAGroup.value) {
    e.stopPropagation()
    scrollToGroup(proxyGroup.value.now)
  }
}

// Whether the group structurally has child groups (shows the expand button),
// regardless of the current selection.
const canOpenChain = computed(() => hasChildProxyGroups(props.name))

// Names along the selected chain: child groups, then the terminal node
// (the terminal node is gated by displayFinalOutbound).
const chainNames = computed(() => {
  const groupChain = getProxyGroupChains(props.name)
  const groups = groupChain.slice(1)
  const deepest = groupChain[groupChain.length - 1] ?? props.name
  const terminal = proxyMap.value[deepest]?.now
  const terminalNode = terminal && !proxyGroupList.value.includes(terminal) ? terminal : ''

  // A node is selected directly (no child-group chain): show only the node.
  if (!groups.length) {
    return terminalNode ? [terminalNode] : proxyGroup.value.now ? [proxyGroup.value.now] : []
  }

  const names = [...groups]

  if (terminalNode && displayFinalOutbound.value) {
    names.push(terminalNode)
  }

  return names
})

const toItem = (name: string): ChainItem => ({
  name,
  kind: proxyGroupList.value.includes(name) ? 'group' : 'node',
})

// Compress long chains to "first ... last"; the full chain is in the title.
const displayChain = computed<ChainItem[]>(() => {
  const names = chainNames.value

  if (names.length <= 3) {
    return names.map(toItem)
  }

  return [toItem(names[0]), { name: '...', kind: 'ellipsis' }, toItem(names[names.length - 1])]
})

const chainTitle = computed(() => chainNames.value.join(' > '))

const handlerClickChainGroup = (e: Event, name: string) => {
  e.stopPropagation()
  openProxyGroupChain(props.name, name)
}

const handlerClickExpand = (e: Event) => {
  e.stopPropagation()
  openProxyGroupChain(props.name)
}
</script>
