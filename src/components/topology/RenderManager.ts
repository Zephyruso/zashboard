/**
 * Konva 渲染管理器
 * 负责使用 Konva 渲染拓扑图的节点和边
 * @module RenderManager
 */

import Konva from 'konva'
import { STYLES, VISUAL } from './constants'
import type { EdgeView, GraphData, GraphEdge, GraphNode, NodeView } from './types'
import { getNodeColors, scaleEdgeWidth } from './utils'

/**
 * 渲染管理器类
 * 遵循单一职责原则：仅负责 Konva 图形的创建、更新和销毁
 */
export class RenderManager {
  private nodeViews = new Map<string, NodeView>()
  private edgeViews = new Map<string, EdgeView>()
  private edgeFollowAnimation: Konva.Animation | null = null

  /**
   * 构造函数
   *
   * @param edgeLayer - Konva 边图层
   * @param nodeLayer - Konva 节点图层
   * @param onNodeHover - 节点悬停回调
   * @param onNodeLeave - 节点离开回调
   */
  constructor(
    private edgeLayer: Konva.Layer,
    private nodeLayer: Konva.Layer,
    private onNodeHover: (nodeId: string) => void,
    private onNodeLeave: () => void,
  ) {
    this.setupEdgeFollowAnimation()
  }

  /**
   * 同步渲染图形数据
   * 创建新节点/边，更新已有节点/边，移除不再存在的节点/边
   *
   * @param graphData - 图形数据
   * @param offsetX - X 轴偏移
   * @param offsetY - Y 轴偏移
   * @param backgroundColor - 背景色
   */
  syncGraph(graphData: GraphData, offsetX: number, offsetY: number, backgroundColor: string): void {
    const desiredNodeIds = new Set(graphData.nodes.map((n) => n.id))
    const desiredEdgeIds = new Set(graphData.edges.map((e) => e.id))

    // 更新或创建节点
    for (const node of graphData.nodes) {
      this.updateOrCreateNode(node, offsetX, offsetY, backgroundColor)
    }

    // 移除不再存在的节点
    for (const [id] of this.nodeViews) {
      if (!desiredNodeIds.has(id)) {
        this.removeNode(id)
      }
    }

    // 更新或创建边
    for (const edge of graphData.edges) {
      this.updateOrCreateEdge(edge, graphData.maxWeight)
    }

    // 移除不再存在的边
    for (const [id] of this.edgeViews) {
      if (!desiredEdgeIds.has(id)) {
        this.removeEdge(id)
      }
    }

    // 更新所有边的端点坐标
    this.updateAllEdgePoints()

    this.nodeLayer.batchDraw()
    this.edgeLayer.batchDraw()
  }

  /**
   * 应用悬停视觉效果
   *
   * @param hoveredNodeId - 当前悬停的节点 ID
   * @param relatedNodeIds - 相关节点 ID 集合
   */
  applyHoverVisuals(hoveredNodeId: string | null, relatedNodeIds: Set<string>): void {
    this.applyNodeHoverEffects(hoveredNodeId, relatedNodeIds)
    this.applyEdgeHoverEffects(hoveredNodeId, relatedNodeIds)

    this.nodeLayer.batchDraw()
    this.edgeLayer.batchDraw()
  }

  /**
   * 更新所有边的端点坐标
   * 用于在节点移动动画时保持边连接正确
   */
  updateAllEdgePoints(): void {
    for (const [, edgeView] of this.edgeViews) {
      const sourceNode = this.nodeViews.get(edgeView.from)
      const targetNode = this.nodeViews.get(edgeView.to)

      if (!sourceNode || !targetNode) continue

      const sx = sourceNode.group.x() + STYLES.nodeWidth
      const sy = sourceNode.group.y() + STYLES.nodeHeight / 2
      const tx = targetNode.group.x()
      const ty = targetNode.group.y() + STYLES.nodeHeight / 2
      const mid = (sx + tx) / 2

      const points = [sx, sy, mid, sy, mid, ty, tx, ty]
      edgeView.line.points(points)
    }
  }

  /**
   * 获取节点视图映射表
   *
   * @returns 节点 ID 到视图对象的映射
   */
  getNodeViews(): Map<string, NodeView> {
    return this.nodeViews
  }

  /**
   * 获取边视图映射表
   *
   * @returns 边 ID 到视图对象的映射
   */
  getEdgeViews(): Map<string, EdgeView> {
    return this.edgeViews
  }

  /**
   * 销毁渲染管理器
   * 清理所有资源
   */
  destroy(): void {
    if (this.edgeFollowAnimation) {
      this.edgeFollowAnimation.stop()
      this.edgeFollowAnimation = null
    }

    this.nodeViews.clear()
    this.edgeViews.clear()
  }

  /**
   * 设置边跟随动画
   * 确保边在节点动画时保持连接
   * @private
   */
  private setupEdgeFollowAnimation(): void {
    this.edgeFollowAnimation = new Konva.Animation(() => {
      this.updateAllEdgePoints()
    }, this.edgeLayer)
    this.edgeFollowAnimation.start()
  }

  /**
   * 更新或创建节点
   *
   * @param node - 节点数据
   * @param offsetX - X 轴偏移
   * @param offsetY - Y 轴偏移
   * @param backgroundColor - 背景色
   * @private
   */
  private updateOrCreateNode(
    node: GraphNode,
    offsetX: number,
    offsetY: number,
    backgroundColor: string,
  ): void {
    const existingView = this.nodeViews.get(node.id)

    if (existingView) {
      this.updateNode(existingView, node, offsetX, offsetY, backgroundColor)
    } else {
      this.createNode(node, offsetX, offsetY, backgroundColor)
    }
  }

  /**
   * 创建新节点视图
   *
   * @param node - 节点数据
   * @param offsetX - X 轴偏移
   * @param offsetY - Y 轴偏移
   * @param backgroundColor - 背景色
   * @private
   */
  private createNode(
    node: GraphNode,
    offsetX: number,
    offsetY: number,
    backgroundColor: string,
  ): void {
    const group = new Konva.Group({
      x: offsetX + node.x,
      y: offsetY + node.y,
      opacity: 0,
    })

    const commonRectConfig = {
      width: STYLES.nodeWidth,
      height: STYLES.nodeHeight,
      cornerRadius: 8,
    }

    const baseRect = new Konva.Rect({
      ...commonRectConfig,
      fill: backgroundColor,
      listening: false,
    })

    const colors = getNodeColors(node.type)
    const rect = new Konva.Rect({
      ...commonRectConfig,
      fill: colors.fill,
      stroke: colors.stroke,
      strokeWidth: VISUAL.NODE_NORMAL_STROKE,
    })

    const text = new Konva.Text({
      text: node.label,
      fontSize: 14,
      fill: colors.stroke,
      width: STYLES.nodeWidth - 16,
      height: STYLES.nodeHeight,
      align: 'center',
      verticalAlign: 'middle',
      x: 8,
    })

    group.add(baseRect, rect, text)
    this.nodeLayer.add(group)
    group.to({ opacity: 1, duration: 0.22 })

    const view: NodeView = {
      group,
      baseRect,
      rect,
      text,
      type: node.type,
      label: node.label,
    }

    this.nodeViews.set(node.id, view)
    this.attachNodeHoverListeners(group, node.id)
  }

  /**
   * 更新已有节点视图
   *
   * @param view - 节点视图对象
   * @param node - 新的节点数据
   * @param offsetX - X 轴偏移
   * @param offsetY - Y 轴偏移
   * @param backgroundColor - 背景色
   * @private
   */
  private updateNode(
    view: NodeView,
    node: GraphNode,
    offsetX: number,
    offsetY: number,
    backgroundColor: string,
  ): void {
    const targetX = offsetX + node.x
    const targetY = offsetY + node.y

    // 更新标签
    if (view.label !== node.label) {
      view.text.text(node.label)
      view.label = node.label
    }

    // 更新类型颜色
    if (view.type !== node.type) {
      const colors = getNodeColors(node.type)
      view.rect.to({ fill: colors.fill, stroke: colors.stroke, duration: 0.28 })
      view.text.to({ fill: colors.stroke, duration: 0.28 })
      view.type = node.type
    }

    // 更新位置
    view.group.to({ x: targetX, y: targetY, duration: 0.32 })
    view.baseRect.fill(backgroundColor)
  }

  /**
   * 移除节点视图
   *
   * @param nodeId - 节点 ID
   * @private
   */
  private removeNode(nodeId: string): void {
    const view = this.nodeViews.get(nodeId)
    if (!view) return

    view.group.to({
      opacity: 0,
      duration: 0.2,
      onFinish: () => view.group.destroy(),
    })

    this.nodeViews.delete(nodeId)
  }

  /**
   * 为节点组添加悬停监听器
   *
   * @param group - Konva 组对象
   * @param nodeId - 节点 ID
   * @private
   */
  private attachNodeHoverListeners(group: Konva.Group, nodeId: string): void {
    group.on('mouseenter', () => {
      const stage = group.getStage()
      if (stage?.container()) {
        stage.container().style.cursor = 'pointer'
      }
      this.onNodeHover(nodeId)
    })

    group.on('mouseleave', () => {
      const stage = group.getStage()
      if (stage?.container()) {
        stage.container().style.cursor = 'default'
      }
      this.onNodeLeave()
    })
  }

  /**
   * 更新或创建边
   *
   * @param edge - 边数据
   * @param maxWeight - 最大权重值
   * @private
   */
  private updateOrCreateEdge(edge: GraphEdge, maxWeight: number): void {
    const existingView = this.edgeViews.get(edge.id)

    if (existingView) {
      this.updateEdge(existingView, edge, maxWeight)
    } else {
      this.createEdge(edge, maxWeight)
    }
  }

  /**
   * 创建新边视图
   *
   * @param edge - 边数据
   * @param maxWeight - 最大权重值
   * @private
   */
  private createEdge(edge: GraphEdge, maxWeight: number): void {
    const line = new Konva.Line({
      points: [0, 0, 0, 0, 0, 0, 0, 0],
      stroke: VISUAL.EDGE_DEFAULT_COLOR,
      strokeWidth: 0.1,
      lineCap: 'round',
      lineJoin: 'round',
      bezier: true,
      opacity: 0,
      listening: false,
    })

    this.edgeLayer.add(line)

    const view: EdgeView = {
      line,
      from: edge.from,
      to: edge.to,
    }

    this.edgeViews.set(edge.id, view)

    const targetWidth = scaleEdgeWidth(edge.weight, maxWeight)
    line.to({ strokeWidth: targetWidth, opacity: VISUAL.EDGE_NORMAL_OPACITY, duration: 0.28 })
  }

  /**
   * 更新已有边视图
   *
   * @param view - 边视图对象
   * @param edge - 新的边数据
   * @param maxWeight - 最大权重值
   * @private
   */
  private updateEdge(view: EdgeView, edge: GraphEdge, maxWeight: number): void {
    const targetWidth = scaleEdgeWidth(edge.weight, maxWeight)
    view.line.to({
      strokeWidth: targetWidth,
      opacity: VISUAL.EDGE_NORMAL_OPACITY,
      duration: 0.28,
    })
  }

  /**
   * 移除边视图
   *
   * @param edgeId - 边 ID
   * @private
   */
  private removeEdge(edgeId: string): void {
    const view = this.edgeViews.get(edgeId)
    if (!view) return

    view.line.to({
      opacity: 0,
      strokeWidth: 0.05,
      duration: 0.18,
      onFinish: () => view.line.destroy(),
    })

    this.edgeViews.delete(edgeId)
  }

  /**
   * 应用节点悬停效果
   *
   * @param hoveredNodeId - 悬停节点 ID
   * @param relatedNodeIds - 相关节点 ID 集合
   * @private
   */
  private applyNodeHoverEffects(hoveredNodeId: string | null, relatedNodeIds: Set<string>): void {
    for (const [id, view] of this.nodeViews) {
      const isHovered = hoveredNodeId === id
      const isRelated = relatedNodeIds.has(id)

      let targetOpacity = VISUAL.NODE_NORMAL_OPACITY
      if (hoveredNodeId && !isHovered && !isRelated) {
        targetOpacity = VISUAL.NODE_FADED_OPACITY
      }

      const strokeWidth = isHovered ? VISUAL.NODE_HIGHLIGHT_STROKE : VISUAL.NODE_NORMAL_STROKE

      view.group.to({ opacity: targetOpacity, duration: 0.18 })
      view.rect.to({ strokeWidth, duration: 0.18 })

      if (isHovered) {
        view.group.moveToTop()
      }
    }
  }

  /**
   * 应用边悬停效果
   *
   * @param hoveredNodeId - 悬停节点 ID
   * @param relatedNodeIds - 相关节点 ID 集合
   * @private
   */
  private applyEdgeHoverEffects(hoveredNodeId: string | null, relatedNodeIds: Set<string>): void {
    for (const [, view] of this.edgeViews) {
      let opacity = VISUAL.EDGE_NORMAL_OPACITY
      let color = VISUAL.EDGE_DEFAULT_COLOR

      if (hoveredNodeId) {
        const fromIsRelated = relatedNodeIds.has(view.from)
        const toIsRelated = relatedNodeIds.has(view.to)

        if (fromIsRelated && toIsRelated) {
          const isDirect = view.from === hoveredNodeId || view.to === hoveredNodeId
          opacity = isDirect ? VISUAL.EDGE_HIGHLIGHT_OPACITY : VISUAL.EDGE_RELATED_OPACITY
          color = isDirect ? VISUAL.EDGE_HIGHLIGHT_COLOR : VISUAL.EDGE_DEFAULT_COLOR
        } else {
          opacity = VISUAL.EDGE_UNRELATED_OPACITY
        }
      }

      view.line.to({ opacity, stroke: color, duration: 0.18 })
    }
  }
}
