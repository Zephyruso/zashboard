<script setup lang="ts">
/*
 * 节点网格有两条渲染路线,由 canvasProxyNodeGrid 选:
 *   - ProxiesContentDom    —— DOM 卡片 + tanstack 行虚拟化(默认,行为最久经考验)
 *   - ProxiesContentCanvas —— 整片网格画在一张画布上
 *
 * 这层薄派发器的存在是为了让五个调用点(ProxyGroup / ProxyGroupForMobile / ProxyProvider /
 * ProxiesByProvider / ProxyGroupPanel)一行都不用改:props 与 syncScrollMargin 原样透传。
 */
import { canvasProxyNodeGrid } from '@/store/settings'
import { computed, ref } from 'vue'
import ProxiesContentCanvas from './ProxiesContentCanvas.vue'
import ProxiesContentDom from './ProxiesContentDom.vue'

defineProps<{
  name?: string
  now?: string
  renderProxies: string[]
}>()

const implRef = ref<{ syncScrollMargin: () => void } | null>(null)
const impl = computed(() => (canvasProxyNodeGrid.value ? ProxiesContentCanvas : ProxiesContentDom))

// ProxiesByProvider 会在任意一段变高时叫醒所有段;Canvas 那边是空实现。
const syncScrollMargin = () => implRef.value?.syncScrollMargin()

defineExpose({ syncScrollMargin })
</script>

<template>
  <Component
    :is="impl"
    ref="implRef"
    :name="name"
    :now="now"
    :render-proxies="renderProxies"
  />
</template>
