/**
 * 交互管理器
 * 负责处理拓扑图的用户交互（悬停、缩放、拖拽等）
 * @module InteractionManager
 */

import type { Connection } from '@/types'
import type Konva from 'konva'

/**
 * 交互管理器类
 * 遵循单一职责原则：仅负责用户交互逻辑
 */
export class InteractionManager {
  private hoveredNodeId: string | null = null
  private relatedNodeIds = new Set<string>()
  private isDragging = false

  /**
   * 构造函数
   *
   * @param stage - Konva 舞台对象
   * @param makeNodeSequence - 从连接构建节点序列的函数
   * @param onHoverChange - 悬停状态改变回调
   */
  constructor(
    private stage: Konva.Stage,
    private makeNodeSequence: (conn: Connection) => string[],
    private onHoverChange: (hoveredId: string | null, relatedIds: Set<string>) => void,
  ) {}

  /**
   * 设置悬停节点
   * 计算相关节点并触发回调
   *
   * @param nodeId - 节点 ID（null 表示清除悬停）
   * @param connections - 当前连接列表
   */
  setHoveredNode(nodeId: string | null, connections: Connection[]): void {
    if (this.isDragging) return

    this.hoveredNodeId = nodeId
    this.updateRelatedNodes(connections)
    this.onHoverChange(this.hoveredNodeId, this.relatedNodeIds)
  }

  /**
   * 获取当前悬停的节点 ID
   *
   * @returns 悬停节点 ID 或 null
   */
  getHoveredNodeId(): string | null {
    return this.hoveredNodeId
  }

  /**
   * 获取相关节点 ID 集合
   *
   * @returns 相关节点 ID 集合
   */
  getRelatedNodeIds(): Set<string> {
    return this.relatedNodeIds
  }

  /**
   * 设置拖拽状态
   *
   * @param dragging - 是否正在拖拽
   */
  setDragging(dragging: boolean): void {
    this.isDragging = dragging
  }

  /**
   * 获取拖拽状态
   *
   * @returns 是否正在拖拽
   */
  isDraggingStage(): boolean {
    return this.isDragging
  }

  /**
   * 设置自动缩放
   * 计算合适的缩放和位移，使图形完全可见并居中
   *
   * @param graphWidth - 图形宽度
   * @param graphHeight - 图形高度
   * @param stageWidth - 舞台宽度
   * @param stageHeight - 舞台高度
   * @param offsetX - X 轴偏移
   * @param offsetY - Y 轴偏移
   * @param padding - 内边距
   * @param animate - 是否使用动画
   */
  autoFitGraph(
    graphWidth: number,
    graphHeight: number,
    stageWidth: number,
    stageHeight: number,
    offsetX: number,
    offsetY: number,
    padding: number = 16,
    animate: boolean = true,
  ): void {
    if (graphWidth <= 0 || graphHeight <= 0) return

    const availableWidth = Math.max(1, stageWidth - padding * 2)
    const availableHeight = Math.max(1, stageHeight - padding * 2)

    // 计算适合的缩放比例
    const scaleX = availableWidth / graphWidth
    const scaleY = availableHeight / graphHeight
    const scale = Math.max(0.4, Math.min(3, Math.min(scaleX, scaleY)))

    // 计算居中位置
    const targetX = stageWidth / 2 - scale * (offsetX + graphWidth / 2)
    const targetY = stageHeight / 2 - scale * (offsetY + graphHeight / 2)

    if (animate) {
      this.stage.to({
        x: targetX,
        y: targetY,
        scaleX: scale,
        scaleY: scale,
        duration: 0.28,
      })
    } else {
      this.stage.scale({ x: scale, y: scale })
      this.stage.position({ x: targetX, y: targetY })
      this.stage.batchDraw()
    }
  }

  /**
   * 更新相关节点集合
   * 找出所有包含当前悬停节点的连接路径上的节点
   *
   * @param connections - 连接列表
   * @private
   */
  private updateRelatedNodes(connections: Connection[]): void {
    this.relatedNodeIds.clear()

    if (!this.hoveredNodeId) return

    for (const conn of connections) {
      const sequence = this.makeNodeSequence(conn)

      if (sequence.includes(this.hoveredNodeId)) {
        for (const nodeId of sequence) {
          this.relatedNodeIds.add(nodeId)
        }
      }
    }
  }
}

/**
 * 缩放交互助手
 * 提供滚轮缩放功能
 */
export class ZoomHelper {
  /**
   * 设置滚轮缩放事件监听
   *
   * @param stage - Konva 舞台对象
   * @param onZoom - 缩放回调（用于禁用自动适配）
   */
  static setupWheelZoom(stage: Konva.Stage, onZoom: () => void): void {
    stage.on('wheel', (event) => {
      event.evt.preventDefault()
      onZoom() // 通知外部禁用自动适配

      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()

      if (!pointer) return

      const scaleBy = 1.06
      const direction = event.evt.deltaY > 0 ? -1 : 1
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
      const clampedScale = Math.max(0.4, Math.min(3, newScale))

      // 计算鼠标位置相对于内容的坐标
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      stage.scale({ x: clampedScale, y: clampedScale })

      // 调整位置使鼠标指向的内容位置不变
      const newPosition = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      }

      stage.position(newPosition)
      stage.batchDraw()
    })
  }

  /**
   * 设置拖拽事件监听
   *
   * @param stage - Konva 舞台对象
   * @param onDragStart - 拖拽开始回调
   * @param onDragEnd - 拖拽结束回调
   */
  static setupDragListeners(
    stage: Konva.Stage,
    onDragStart: () => void,
    onDragEnd: () => void,
  ): void {
    stage.on('dragstart', onDragStart)
    stage.on('dragend', onDragEnd)
  }
}
