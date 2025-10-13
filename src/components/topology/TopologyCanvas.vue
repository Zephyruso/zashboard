<template>
  <div
    ref="containerRef"
    class="topology-container"
  >
    <canvas
      ref="canvasRef"
      class="topology-canvas"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    ></canvas>

    <!-- 控制按钮 -->
    <div class="topology-controls">
      <button
        class="btn btn-sm btn-circle"
        @click="resetView"
        :title="$t('reset')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </div>

    <!-- 图例 -->
    <div class="topology-legend">
      <div class="legend-item">
        <div
          class="legend-color"
          style="background: #3b82f6"
        ></div>
        <span class="legend-label">{{ $t('sourceIP') }}</span>
      </div>
      <div class="legend-item">
        <div
          class="legend-color"
          style="background: #8b5cf6"
        ></div>
        <span class="legend-label">{{ $t('rule') }}</span>
      </div>
      <div class="legend-item">
        <div
          class="legend-color"
          style="background: #10b981"
        ></div>
        <span class="legend-label">{{ $t('proxies') }}</span>
      </div>
      <div class="legend-item">
        <div
          class="legend-color"
          style="background: #f59e0b"
        ></div>
        <span class="legend-label">{{ $t('outbound') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  useClients,
  useEndpointSides,
  useGroupNameSet,
  useHasRuleColumn,
  useLinks,
  useMaxLevel,
  useMaxTraffic,
  useNodeLevels,
  useNodes,
  useNodesByLevel,
  useParticleSystem,
  useRulesByProxyNormalized,
  useTopologyAnimation,
  useTopologyInteraction,
  useTopologyRenderer,
} from '@/composables/topology'
import { activeConnections } from '@/store/connections'
import { proxyGroupList } from '@/store/proxies'
import { rules } from '@/store/rules'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// ================= 数据层 =================
// 将 store 的 ref 转换为 computed 以满足类型要求
const activeConnectionsComputed = computed(() => activeConnections.value)
const proxyGroupListComputed = computed(() => proxyGroupList.value)
const rulesComputed = computed(() => rules.value)

const clients = useClients(activeConnectionsComputed)
const groupNameSet = useGroupNameSet(proxyGroupListComputed)
const rulesByProxyNormalized = useRulesByProxyNormalized(rulesComputed)
const hasRuleColumn = useHasRuleColumn(activeConnectionsComputed, rulesByProxyNormalized)
const maxTraffic = useMaxTraffic(activeConnectionsComputed)

// ================= 布局层 =================
const nodeLevels = useNodeLevels(
  activeConnectionsComputed,
  groupNameSet,
  rulesByProxyNormalized,
  hasRuleColumn,
)
const maxLevel = useMaxLevel(nodeLevels)
const nodesByLevel = useNodesByLevel(
  nodeLevels,
  activeConnectionsComputed,
  clients,
  groupNameSet,
  rulesByProxyNormalized,
  hasRuleColumn,
)
const nodes = useNodes(clients, maxLevel, nodesByLevel)
const links = useLinks(
  nodes,
  activeConnectionsComputed,
  groupNameSet,
  rulesByProxyNormalized,
  hasRuleColumn,
)
const endpointSides = useEndpointSides(links)

// ================= 视图状态 =================
const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()
const containerBgColor = ref<string>('rgba(255, 255, 255, 1)')

// 视图变换状态（目标值）
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)

// 渲染状态（带动画的当前值）
const renderScale = ref(1)
const renderOffsetX = ref(0)
const renderOffsetY = ref(0)
const renderNodePos = ref(new Map<string, { x: number; y: number }>())
const renderLinkTraffic = ref(new Map<string, number>())
const renderLinkUpTraffic = ref(new Map<string, number>())
const renderLinkDownTraffic = ref(new Map<string, number>())
const renderMaxTraffic = ref(1)

// 估算刷新节奏，用于设定动画时长
const lastRefreshAt = ref(performance.now())
const estimatedRefreshMs = ref(1000)

// ================= 动画系统 =================
const {
  viewAnim,
  startAnimationLoop,
  animateViewTo,
  animateNodePositions,
  animateLinkTraffic,
  stopAnimationLoop,
} = useTopologyAnimation(
  renderScale,
  renderOffsetX,
  renderOffsetY,
  renderNodePos,
  renderLinkTraffic,
  renderLinkUpTraffic,
  renderLinkDownTraffic,
  renderMaxTraffic,
)

// ================= 渲染系统 =================
// 提前声明 hoveredNodeId，以便渲染器和交互系统共用同一个响应式引用
const hoveredNodeId = ref<string | null>(null)

// 创建渲染器（唯一实例）
const renderer = useTopologyRenderer(
  canvasRef,
  containerBgColor,
  renderScale,
  renderOffsetX,
  renderOffsetY,
  renderNodePos,
  renderLinkTraffic,
  renderLinkUpTraffic,
  renderLinkDownTraffic,
  renderMaxTraffic,
  nodes,
  links,
  endpointSides,
  hoveredNodeId,
  activeConnectionsComputed,
  groupNameSet,
  rulesByProxyNormalized,
  hasRuleColumn,
  () => getParticles(),
)

const {
  draw,
  getRenderedPos,
  getLinkId,
  getRenderedTrafficUp,
  getRenderedTrafficDown,
  initializeVisualStates,
} = renderer

// 为后续调用保持统一的 draw 引用
const drawFinal = draw

// ================= 粒子系统 =================
const { advanceParticles, getParticles } = useParticleSystem(
  links,
  renderMaxTraffic,
  getRenderedTrafficUp,
  getRenderedTrafficDown,
  getLinkId,
)

// ================= 交互系统 =================
const {
  // hoveredNodeId 与上方同一个引用，直接忽略
  resetView,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handlePointerMove,
  clearHover,
} = useTopologyInteraction(
  canvasRef,
  nodes,
  renderScale,
  renderOffsetX,
  renderOffsetY,
  scale,
  offsetX,
  offsetY,
  getRenderedPos,
  animateViewTo,
  drawFinal,
  () => startAnimationLoop(drawFinal, advanceParticles),
  hoveredNodeId,
)

// ================= 生命周期 =================
// 调整画布大小
const resizeCanvas = () => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
  drawFinal()
}

// 监听窗口大小变化
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeCanvas()

  // 初始化渲染状态
  renderScale.value = scale.value
  renderOffsetX.value = offsetX.value
  renderOffsetY.value = offsetY.value

  // 初始化节点渲染位置
  const initMap = new Map<string, { x: number; y: number }>()
  nodes.value.forEach((n) => initMap.set(n.id, { x: n.x, y: n.y }))
  renderNodePos.value = initMap

  // 初始化连接线流量
  const initTraffic = new Map<string, number>()
  links.value.forEach((l) => initTraffic.set(getLinkId(l), l.traffic))
  renderLinkTraffic.value = initTraffic
  renderMaxTraffic.value = maxTraffic.value

  // 初始化视觉状态
  initializeVisualStates()

  drawFinal()

  // 使用 ResizeObserver 监听容器大小变化
  const container = containerRef.value
  if (container) {
    // 读取容器背景色，确保节点底板与背景一致
    const bg = getComputedStyle(container).backgroundColor
    if (bg) containerBgColor.value = bg
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    resizeObserver.observe(container)
  }

  // 指针事件监听
  canvasRef.value?.addEventListener('mousemove', handlePointerMove)
  canvasRef.value?.addEventListener('touchstart', handlePointerMove)
  canvasRef.value?.addEventListener('mouseleave', clearHover)
})

onBeforeUnmount(() => {
  stopAnimationLoop()
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  canvasRef.value?.removeEventListener('mousemove', handlePointerMove)
  canvasRef.value?.removeEventListener('touchstart', handlePointerMove)
  canvasRef.value?.removeEventListener('mouseleave', clearHover)
})

// ================= 数据监听 =================
// 监听数据变化，重新绘制并触发动画
watch([activeConnectionsComputed, nodes, links], () => {
  const now = performance.now()
  const dt = now - lastRefreshAt.value
  // 指数平滑估算刷新间隔（避免抖动）
  estimatedRefreshMs.value = Math.min(
    3000,
    Math.max(200, estimatedRefreshMs.value * 0.7 + dt * 0.3),
  )
  lastRefreshAt.value = now

  // 当布局节点变化时，触发位置动画
  const nodeAnimDuration = Math.max(260, Math.min(600, estimatedRefreshMs.value * 0.8))
  animateNodePositions(nodes, nodeAnimDuration)

  // 连接线粗细动画：在下次刷新前完成
  const linkAnimDuration = Math.max(260, Math.min(600, estimatedRefreshMs.value * 0.85))
  animateLinkTraffic(links, maxTraffic, linkAnimDuration)

  startAnimationLoop(drawFinal, advanceParticles)
  drawFinal()
})

// 监听缩放和平移的目标值，若无动画在进行，直接同步渲染值
watch([scale, offsetX, offsetY], () => {
  if (!viewAnim.value) {
    renderScale.value = scale.value
    renderOffsetX.value = offsetX.value
    renderOffsetY.value = offsetY.value
    drawFinal()
  }
})

// 调试：输出连接信息和层级信息
watch(
  () => ({
    connections: activeConnectionsComputed.value.length,
    clients: clients.value.length,
    totalNodes: nodeLevels.value.size,
    maxLevel: maxLevel.value,
    links: links.value.length,
  }),
  (info) => {
    console.log('拓扑统计:', info)

    // 输出每层的节点数量
    const levelStats = new Map<number, number>()
    nodeLevels.value.forEach((node) => {
      levelStats.set(node.level, (levelStats.get(node.level) || 0) + 1)
    })
    console.log('各层级节点数:', Object.fromEntries(levelStats))

    // 输出层级详情
    console.log('层级详情:')
    for (let level = 1; level <= maxLevel.value; level++) {
      const nodesInLevel = nodesByLevel.value.get(level) || []
      console.log(
        `  层级 ${level}:`,
        nodesInLevel.map((n) => ({
          name: n.name.replace(/^(rule|group|proxy)-/, ''),
          type: n.type,
        })),
      )
    }

    if (links.value.length > 0) {
      console.log(
        '连接示例:',
        links.value.slice(0, 5).map((l) => ({
          from: l.source.label,
          to: l.target.label,
          fromType: l.source.type,
          toType: l.target.type,
          traffic: l.traffic,
        })),
      )
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.topology-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-base-100);
}

.topology-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.topology-canvas:active {
  cursor: grabbing;
}

.topology-controls {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
}

.topology-legend {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: var(--color-base-200);
  padding: 1rem;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
}

.legend-label {
  font-size: 0.875rem;
  color: var(--color-base-content);
}
</style>
