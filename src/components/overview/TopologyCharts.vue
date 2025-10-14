<!--
 * 拓扑图表组件
 *
 * 功能说明：
 * - 展示网络连接的拓扑结构（客户端 -> 规则 -> 代理组 -> 代理节点）
 * - 支持实时流量粒子动画
 * - 支持悬停高亮交互
 * - 支持全屏模式和自动适配
 *
 * 架构说明：
 * - 遵循单一职责原则：组件仅负责 UI 展示和事件绑定
 * - 核心逻辑通过 useTopology composable 管理
 * - 各功能模块独立解耦（GraphBuilder、LayoutCalculator、RenderManager等）
-->
<template>
  <div
    :class="
      twMerge(
        'relative w-full overflow-hidden',
        isFullScreen ? 'bg-base-100 fixed inset-0 z-[9999] h-screen w-screen' : 'h-96',
      )
    "
    ref="containerRef"
  >
    <!-- Konva 舞台容器 -->
    <div
      class="h-full w-full"
      ref="stageHostRef"
    ></div>

    <!-- 自动适配开关（仅全屏模式显示） -->
    <div
      v-if="isFullScreen"
      class="bg-base-200/70 absolute right-1 bottom-10 flex items-center gap-2 rounded px-2 py-1"
      title="自动适配缩放并居中"
    >
      <span class="text-xs">自适应</span>
      <input
        type="checkbox"
        class="toggle toggle-xs"
        v-model="autoFitEnabled"
      />
    </div>

    <!-- 全屏切换按钮 -->
    <button
      class="btn btn-ghost btn-circle btn-sm absolute right-1 bottom-1"
      @click="toggleFullScreen"
    >
      <component
        :is="isFullScreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon"
        class="h-4 w-4"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { topologyAlign } from '@/store/settings'
import { ArrowsPointingInIcon, ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import { useElementSize } from '@vueuse/core'
import { twMerge } from 'tailwind-merge'
import { ref } from 'vue'
import { useTopology } from '../topology/useTopology'

/**
 * DOM 引用
 */
const containerRef = ref<HTMLDivElement>()
const stageHostRef = ref<HTMLDivElement>()

/**
 * 响应式尺寸监听
 */
const { width: stageWidth, height: stageHeight } = useElementSize(stageHostRef)

/**
 * 全屏状态
 */
const isFullScreen = ref(false)

/**
 * 自动适配状态
 */
const autoFitEnabled = ref(true)

/**
 * 切换全屏
 */
const toggleFullScreen = (): void => {
  isFullScreen.value = !isFullScreen.value
}

/**
 * 使用拓扑图 composable
 * 所有核心逻辑由 useTopology 管理
 */
useTopology({
  containerRef,
  stageHostRef,
  stageWidth,
  stageHeight,
  align: topologyAlign,
  isFullScreen,
  autoFitEnabled,
})
</script>
