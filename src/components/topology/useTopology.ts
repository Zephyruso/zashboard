/**
 * 拓扑图组合式函数
 * 整合所有拓扑图相关服务，提供统一的接口
 * @module useTopology
 */

import { getIPLabelFromMap } from '@/helper/sourceip'
import { activeConnections } from '@/store/connections'
import { proxyGroupList, proxyMap } from '@/store/proxies'
import { rules as allRules } from '@/store/rules'
import type { Connection, Rule } from '@/types'
import Konva from 'konva'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { STYLES, VISUAL } from './constants'
import { GraphBuilder } from './GraphBuilder'
import { InteractionManager, ZoomHelper } from './InteractionManager'
import { LayoutCalculator } from './LayoutCalculator'
import { ParticleSystem } from './ParticleSystem'
import { RenderManager } from './RenderManager'
import type { GraphData } from './types'
import { getBackgroundColor, normalizeName } from './utils'

/**
 * 拓扑图组合式函数配置
 */
export interface UseTopologyOptions {
  /** 容器元素引用 */
  containerRef: Ref<HTMLDivElement | undefined>
  /** 舞台宿主元素引用 */
  stageHostRef: Ref<HTMLDivElement | undefined>
  /** 舞台宽度 */
  stageWidth: Ref<number>
  /** 舞台高度 */
  stageHeight: Ref<number>
  /** 对齐方式 */
  align: Ref<'center' | 'top'>
  /** 是否全屏 */
  isFullScreen: Ref<boolean>
  /** 是否启用自动适配 */
  autoFitEnabled: Ref<boolean>
}

/**
 * 拓扑图组合式函数返回值
 */
export interface UseTopologyReturn {
  /** 图形数据 */
  graphData: Ref<GraphData>
  /** 执行自动适配 */
  performAutoFit: (animate?: boolean) => void
  /** 刷新图形 */
  refresh: () => void
}

/**
 * 拓扑图组合式函数
 * 遵循依赖倒置原则：通过注入依赖实现解耦
 *
 * @param options - 配置选项
 * @returns 拓扑图控制接口
 */
export function useTopology(options: UseTopologyOptions): UseTopologyReturn {
  const {
    containerRef: _containerRef, // eslint-disable-line @typescript-eslint/no-unused-vars
    stageHostRef,
    stageWidth,
    stageHeight,
    align,
    isFullScreen,
    autoFitEnabled,
  } = options

  // ============ 核心服务实例 ============
  let stage: Konva.Stage | null = null
  let edgeLayer: Konva.Layer | null = null
  let nodeLayer: Konva.Layer | null = null
  let particleLayer: Konva.Layer | null = null

  let renderManager: RenderManager | null = null
  let particleSystem: ParticleSystem | null = null
  let interactionManager: InteractionManager | null = null

  // ============ 数据层 ============

  /**
   * 规则按代理名称映射
   */
  const rulesByProxy = computed(() => {
    const map = new Map<string, Rule>()
    for (const rule of allRules.value) {
      map.set(normalizeName(rule.proxy), rule)
    }
    return map
  })

  /**
   * 代理组名称集合
   */
  const groupNameSet = computed(() => new Set(proxyGroupList.value.map((n) => normalizeName(n))))

  /**
   * 图形数据
   */
  const graphData = ref<GraphData>({
    width: 0,
    height: 0,
    nodes: [],
    edges: [],
    maxWeight: 0,
  })

  // ============ 辅助函数 ============

  /**
   * 从连接构建节点序列
   * 用于粒子系统和交互管理器
   *
   * @param conn - 连接对象
   * @returns 节点 ID 序列
   */
  const makeNodeSequence = (conn: Connection): string[] => {
    const sequence: string[] = []

    // 1. 客户端节点
    const clientId = `client:${conn.metadata.sourceIP || 'inner'}`
    sequence.push(clientId)

    // 2. 规则节点
    const reversed = [...(conn.chains || [])].reverse().map(normalizeName)
    const root = reversed[0]

    if (root && rulesByProxy.value.has(root)) {
      const rule = rulesByProxy.value.get(root)!
      sequence.push(`rule:${rule.type}:${rule.payload}:${normalizeName(rule.proxy)}`)
    } else {
      sequence.push(`rule:${conn.rule || ''}:${conn.rulePayload || ''}`)
    }

    // 3. 代理组节点
    for (const name of reversed) {
      if (groupNameSet.value.has(name)) {
        sequence.push(`group:${name}`)
      }
    }

    // 4. 代理节点（叶子节点）
    let leafName: string | null = null
    for (let i = (conn.chains?.length || 0) - 1; i >= 0; i--) {
      const name = normalizeName(conn.chains![i])
      if (!groupNameSet.value.has(name)) {
        leafName = name
        break
      }
    }

    if (leafName) {
      sequence.push(`proxy:${leafName}`)
    }

    return sequence
  }

  /**
   * 计算偏移量
   * 使图形居中显示
   */
  const calculateOffsets = (): { offsetX: number; offsetY: number } => {
    const graphWidth = graphData.value.width
    const graphHeight = graphData.value.height
    const offsetX = Math.max(0, (stageWidth.value - graphWidth) / 2)
    const offsetY = Math.max(0, (stageHeight.value - graphHeight) / 2)
    return { offsetX, offsetY }
  }

  // ============ 图形构建与渲染 ============

  /**
   * 构建图形数据
   */
  const buildGraph = (): void => {
    const builder = new GraphBuilder(rulesByProxy.value, groupNameSet.value)
    const rawGraph = builder.build(activeConnections.value, getIPLabelFromMap)

    const layoutCalculator = new LayoutCalculator(align.value)
    graphData.value = layoutCalculator.calculateLayout(rawGraph)
  }

  /**
   * 同步渲染图形
   */
  const syncGraph = (): void => {
    if (!renderManager || !stage) return

    ensureStageSize()

    const { offsetX, offsetY } = calculateOffsets()
    const backgroundColor = getBackgroundColor(stageHostRef.value)

    renderManager.syncGraph(graphData.value, offsetX, offsetY, backgroundColor)

    // 重新应用悬停视觉效果
    if (interactionManager) {
      const hoveredId = interactionManager.getHoveredNodeId()
      const relatedIds = interactionManager.getRelatedNodeIds()
      renderManager.applyHoverVisuals(hoveredId, relatedIds)
    }
  }

  /**
   * 确保舞台尺寸正确
   */
  const ensureStageSize = (): void => {
    if (!stage) return

    const width = Math.max(stageWidth.value || graphData.value.width, graphData.value.width)
    const height = Math.max(stageHeight.value || graphData.value.height, graphData.value.height)

    stage.size({ width, height })
  }

  /**
   * 刷新图形
   * 重新构建数据并渲染
   */
  const refresh = (): void => {
    buildGraph()
    syncGraph()
  }

  // ============ 自动适配 ============

  /**
   * 执行自动适配
   *
   * @param animate - 是否使用动画
   */
  const performAutoFit = (animate = true): void => {
    if (!interactionManager || !autoFitEnabled.value || !isFullScreen.value) return

    const { offsetX, offsetY } = calculateOffsets()
    const width = Math.max(stageWidth.value, graphData.value.width)
    const height = Math.max(stageHeight.value, graphData.value.height)

    interactionManager.autoFitGraph(
      graphData.value.width,
      graphData.value.height,
      width,
      height,
      offsetX,
      offsetY,
      Math.max(8, STYLES.sidePadding),
      animate,
    )
  }

  /**
   * 延迟执行自动适配
   */
  const scheduleAutoFit = (): void => {
    if (!autoFitEnabled.value || !isFullScreen.value) return
    requestAnimationFrame(() => performAutoFit(true))
  }

  // ============ 悬停交互 ============

  /**
   * 处理悬停状态改变
   */
  const handleHoverChange = (hoveredId: string | null, relatedIds: Set<string>): void => {
    if (!renderManager || !particleSystem) return

    // 应用节点和边的视觉效果
    renderManager.applyHoverVisuals(hoveredId, relatedIds)

    // 计算边透明度映射
    const edgeAlphaMap = new Map<string, number>()
    for (const [edgeId, edgeView] of renderManager.getEdgeViews()) {
      let alpha = VISUAL.EDGE_NORMAL_OPACITY

      if (hoveredId) {
        const fromIsRelated = relatedIds.has(edgeView.from)
        const toIsRelated = relatedIds.has(edgeView.to)

        if (fromIsRelated && toIsRelated) {
          const isDirect = edgeView.from === hoveredId || edgeView.to === hoveredId
          alpha = isDirect ? VISUAL.EDGE_HIGHLIGHT_OPACITY : VISUAL.EDGE_RELATED_OPACITY
        } else {
          alpha = VISUAL.EDGE_UNRELATED_OPACITY
        }
      }

      edgeAlphaMap.set(edgeId, alpha)
    }

    // 应用粒子透明度
    particleSystem.applyHoverEffect(hoveredId, edgeAlphaMap)
  }

  // ============ 初始化与清理 ============

  /**
   * 初始化 Konva 舞台和所有服务
   */
  const initializeStage = (): void => {
    if (!stageHostRef.value) return

    // 创建舞台和图层
    const width = Math.max(stageWidth.value || 600, graphData.value.width)
    const height = Math.max(stageHeight.value || 400, graphData.value.height)

    stage = new Konva.Stage({
      container: stageHostRef.value,
      width,
      height,
      draggable: true,
    })

    edgeLayer = new Konva.Layer()
    particleLayer = new Konva.Layer()
    nodeLayer = new Konva.Layer()
    stage.add(edgeLayer, particleLayer, nodeLayer)

    // 创建交互管理器
    interactionManager = new InteractionManager(stage, makeNodeSequence, handleHoverChange)

    // 创建渲染管理器
    renderManager = new RenderManager(
      edgeLayer,
      nodeLayer,
      (nodeId) => interactionManager!.setHoveredNode(nodeId, activeConnections.value),
      () => interactionManager!.setHoveredNode(null, activeConnections.value),
    )

    // 创建粒子系统
    particleSystem = new ParticleSystem(
      particleLayer,
      () => renderManager!.getNodeViews(),
      () => renderManager!.getEdgeViews(),
      makeNodeSequence,
    )

    particleSystem.start(
      () => activeConnections.value,
      () => new Set(graphData.value.edges.map((e) => e.id)),
    )

    // 设置交互事件
    ZoomHelper.setupWheelZoom(stage, () => {
      autoFitEnabled.value = false
    })

    ZoomHelper.setupDragListeners(
      stage,
      () => {
        autoFitEnabled.value = false
        interactionManager!.setDragging(true)
      },
      () => {
        interactionManager!.setDragging(false)
      },
    )

    // 初始渲染
    syncGraph()
  }

  /**
   * 清理所有资源
   */
  const cleanup = (): void => {
    particleSystem?.destroy()
    renderManager?.destroy()

    stage?.destroy()
    stage = null
    edgeLayer = null
    nodeLayer = null
    particleLayer = null

    renderManager = null
    particleSystem = null
    interactionManager = null
  }

  // ============ 生命周期钩子 ============

  onMounted(() => {
    buildGraph()
    initializeStage()

    if (autoFitEnabled.value && isFullScreen.value) {
      scheduleAutoFit()
    }
  })

  onBeforeUnmount(() => {
    cleanup()
  })

  // ============ 响应式监听 ============

  /**
   * 监听图形数据变化
   */
  watch(
    () => [activeConnections.value.length, allRules.value.length, proxyMap.value, align.value],
    () => {
      buildGraph()
      syncGraph()
    },
    { deep: true },
  )

  /**
   * 监听舞台尺寸变化
   */
  watch([stageWidth, stageHeight], () => {
    ensureStageSize()
    syncGraph()

    if (autoFitEnabled.value && isFullScreen.value) {
      scheduleAutoFit()
    }
  })

  /**
   * 监听全屏状态变化
   */
  watch(isFullScreen, () => {
    nextTick(() => {
      ensureStageSize()
      stage?.batchDraw()

      if (autoFitEnabled.value && isFullScreen.value) {
        scheduleAutoFit()
      }
    })
  })

  /**
   * 监听自动适配启用状态
   */
  watch(autoFitEnabled, (enabled) => {
    if (enabled) {
      nextTick(() => scheduleAutoFit())
    }
  })

  // ============ 返回接口 ============

  return {
    graphData,
    performAutoFit,
    refresh,
  }
}
