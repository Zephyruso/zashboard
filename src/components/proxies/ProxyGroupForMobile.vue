<template>
  <div
    class="group relative h-22 cursor-pointer"
    :data-group-name="proxyGroup.name"
    :data-page-swipe-ignore="panelMounted || undefined"
    @click="open = !open"
    @contextmenu.prevent.stop="handlerLatencyTest"
  >
    <div
      class="base-container absolute inset-0 flex flex-col p-2"
      ref="cardRef"
    >
      <ProxyGroupHeaderForMobile
        :name="name"
        :proxies-count="proxiesCount"
        :is-latency-testing="isLatencyTesting"
        :display-content="false"
        @latency-test="handlerLatencyTest"
      />
    </div>
    <PanelReveal
      v-model:open="open"
      :source="cardRef"
      :get-panel-style="getPanelStyle"
      @active-change="handlerPanelActive"
    >
      <template #header>
        <ProxyGroupHeaderForMobile
          :name="name"
          :proxies-count="proxiesCount"
          :is-latency-testing="isLatencyTesting"
          :display-content="true"
          @latency-test="handlerLatencyTest"
        />
      </template>
      <div
        class="max-h-108 min-h-0 overflow-y-auto overscroll-contain"
        :class="[PROXIES_PARENT_CLASS]"
        style="contain: layout style paint"
      >
        <Component
          :is="groupProxiesByProvider ? ProxiesByProvider : ProxiesContent"
          :name="name"
          :now="proxyGroup.now"
          :render-proxies="renderProxies"
        />
      </div>
    </PanelReveal>
  </div>
</template>

<script setup lang="ts">
import { proxyGroupLatencyTest, proxyMap } from '@/assembly/proxies'
import PanelReveal from '@/components/common/PanelReveal.vue'
import { useBounceOnVisible } from '@/composables/use-bounce-on-visible'
import { useRenderProxyList } from '@/composables/use-render-proxy-list'
import { disableProxiesPageScroll } from '@/helper/proxies'
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import { groupProxiesByProvider } from '@/store/settings'
import { computed, onBeforeUnmount, ref, type CSSProperties } from 'vue'
import ProxiesByProvider from './ProxiesByProvider.vue'
import ProxiesContent from './ProxiesContent.vue'
import ProxyGroupHeaderForMobile from './ProxyGroupHeaderForMobile.vue'

const props = defineProps<{ name: string }>()
const proxyGroup = computed(() => proxyMap.value[props.name])
const allProxies = computed(() => proxyGroup.value.all ?? [])
const { proxiesCount, renderProxies } = useRenderProxyList(allProxies, props.name)
const isLatencyTesting = ref(false)
const open = ref(false)
const panelMounted = ref(false)
const cardRef = ref<HTMLElement>(null!)

const getPanelStyle = ({ left, right, top, bottom, height }: DOMRect): CSSProperties => {
  const { innerHeight, innerWidth } = window
  const manyProxies = renderProxies.value.length > 4
  const isTop = (top + bottom) * 0.5 < innerHeight * (manyProxies ? 0.7 : 0.5)
  const isLeft = left < innerWidth / 3
  const sourceOffset = isTop ? top : innerHeight - bottom
  const verticalOffset =
    sourceOffset < innerHeight * 0.15 || (manyProxies && sourceOffset > innerHeight * 0.3)
      ? innerHeight * 0.2
      : sourceOffset

  return {
    width: 'calc(100vw - 1.5rem)',
    maxHeight: `${Math.max(height, innerHeight - verticalOffset - 112)}px`,
    [isTop ? 'top' : 'bottom']: `${verticalOffset}px`,
    [isLeft ? 'left' : 'right']: `${isLeft ? left : innerWidth - right}px`,
  }
}

const handlerPanelActive = (active: boolean) => {
  panelMounted.value = active
  disableProxiesPageScroll.value = active
}

const handlerLatencyTest = async () => {
  if (isLatencyTesting.value) return

  isLatencyTesting.value = true
  try {
    await proxyGroupLatencyTest(props.name)
    isLatencyTesting.value = false
  } catch {
    isLatencyTesting.value = false
  }
}

onBeforeUnmount(() => {
  if (panelMounted.value) disableProxiesPageScroll.value = false
})

useBounceOnVisible(cardRef)
</script>
