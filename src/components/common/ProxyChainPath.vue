<template>
  <div
    ref="pathRef"
    class="proxy-chain-scroll"
    @wheel.prevent="handleWheel"
  >
    <div class="proxy-chain-path">
      <template v-if="collapsed">
        <span class="proxy-chain-node">
          <ProxyName
            :name="proxy"
            :filter="filter"
          />
        </span>
        <template v-if="proxyNode?.now && showNowNode">
          <ChevronRightIcon class="proxy-chain-separator" />
          <span class="proxy-chain-node pointer-events-none">
            <ProxyName
              :name="getNowProxyNodeName(proxy)"
              :filter="filter"
            />
          </span>
        </template>
      </template>
      <template v-else>
        <template
          v-for="(chain, index) in proxyChains"
          :key="chain"
        >
          <ChevronRightIcon
            class="proxy-chain-separator"
            v-if="index > 0"
          />
          <button
            class="proxy-chain-node"
            :class="{
              'proxy-chain-node-active': selected === chain,
            }"
            :disabled="!interactive"
            type="button"
            @click.stop="handleSelect(chain)"
          >
            <ProxyName
              :name="chain"
              :filter="filter"
            />
          </button>
        </template>
        <template
          v-if="
            getNowProxyNodeName(proxy) &&
            getNowProxyNodeName(proxy) !== proxyChains[proxyChains.length - 1] &&
            showNowNode
          "
        >
          <ChevronRightIcon class="proxy-chain-separator" />
          <span
            class="proxy-chain-node proxy-chain-node-terminal"
            @click.stop
          >
            <ProxyName
              :name="getNowProxyNodeName(proxy)"
              :filter="filter"
            />
          </span>
        </template>
      </template>
      <template v-if="showLatency && latency !== NOT_CONNECTED">
        <span
          :class="latencyColor"
          class="proxy-chain-latency"
        >
          {{ latency }}
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NOT_CONNECTED } from '@/constant'
import { getColorForLatency } from '@/helper'
import {
  getLatencyByName,
  getNowProxyNodeName,
  getProxyGroupChains,
  proxyMap,
} from '@/store/proxies'
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import ProxyName from '../proxies/ProxyName.vue'

const props = withDefaults(
  defineProps<{
    proxy: string
    selected?: string
    collapsed?: boolean
    showNowNode?: boolean
    showLatency?: boolean
    interactive?: boolean
    filter?: string
  }>(),
  {
    selected: '',
    collapsed: false,
    showNowNode: false,
    showLatency: false,
    interactive: true,
    filter: '',
  },
)

const emit = defineEmits<{
  (e: 'update:selected', value: string): void
}>()

const pathRef = ref<HTMLDivElement>()
const proxyChains = computed(() => getProxyGroupChains(props.proxy))
const proxyNode = computed(() => proxyMap.value[props.proxy])
const latency = computed(() => getLatencyByName(props.proxy, props.proxy))
const latencyColor = computed(() => getColorForLatency(Number(latency.value)))

const handleWheel = (event: WheelEvent) => {
  if (!pathRef.value) return
  pathRef.value.scrollLeft += event.deltaY + event.deltaX
}

const handleSelect = (chain: string) => {
  if (!props.interactive) return
  emit('update:selected', chain)
}
</script>

<style scoped>
.proxy-chain-scroll {
  flex-shrink: 1;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
}

.proxy-chain-path {
  display: inline-flex;
  min-width: max-content;
  align-items: center;
  border-radius: 9999px;
  background-color: color-mix(in srgb, var(--color-base-content) 4%, transparent);
  padding: 2px;
  gap: 0;
}

.proxy-chain-node {
  flex-shrink: 0;
  padding: 1px 10px;
  border: 0;
  border-radius: 9999px;
  font-size: 0.75rem;
  line-height: 1.25rem;
  color: inherit;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
  white-space: nowrap;
}

.proxy-chain-node:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--color-base-content) 8%, transparent);
}

.proxy-chain-node:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.proxy-chain-node:disabled {
  cursor: default;
}

.proxy-chain-node-active {
  background-color: var(--color-neutral);
  color: var(--color-neutral-content);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.proxy-chain-node-active:hover {
  background-color: var(--color-neutral);
}

.proxy-chain-node-terminal {
  cursor: not-allowed;
  opacity: 0.6;
}

.proxy-chain-separator {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  opacity: 0.35;
}

.proxy-chain-latency {
  flex-shrink: 0;
  margin-right: 8px;
  font-size: 0.75rem;
  line-height: 1.25rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  cursor: default;
  pointer-events: none;
}
</style>
