/**
 * 布局计算服务
 * 负责计算拓扑图中节点的具体位置坐标
 * @module LayoutCalculator
 */

import { STYLES } from './constants'
import type { GraphData, GraphNode } from './types'

/**
 * 布局计算器类
 * 遵循单一职责原则：仅负责节点位置的计算
 */
export class LayoutCalculator {
  /**
   * 构造函数
   *
   * @param align - 对齐方式 ('center' | 'top')
   */
  constructor(private align: 'center' | 'top' = 'center') {}

  /**
   * 更新对齐方式
   *
   * @param align - 新的对齐方式
   */
  setAlign(align: 'center' | 'top'): void {
    this.align = align
  }

  /**
   * 计算图形布局
   * 为所有节点分配 x, y 坐标，并计算图形总尺寸
   *
   * @param graphData - 图形数据（将被就地修改）
   * @returns 更新后的图形数据
   */
  calculateLayout(graphData: GraphData): GraphData {
    const { nodes } = graphData

    // 1. 按列分组节点
    const columns = this.groupNodesByColumn(nodes)

    // 2. 对每列内的节点按标签排序
    this.sortColumnsAlphabetically(columns)

    // 3. 计算图形尺寸
    const maxCol = Math.max(...Array.from(columns.keys()))
    const dimensions = this.calculateDimensions(columns, maxCol)

    // 4. 为每个节点分配坐标
    this.assignNodePositions(columns, dimensions)

    // 5. 更新图形数据的尺寸
    graphData.width = dimensions.width
    graphData.height = dimensions.height

    return graphData
  }

  /**
   * 将节点按列分组
   *
   * @param nodes - 节点列表
   * @returns 列索引到节点数组的映射
   * @private
   */
  private groupNodesByColumn(nodes: GraphNode[]): Map<number, GraphNode[]> {
    const columns = new Map<number, GraphNode[]>()

    for (const node of nodes) {
      const column = columns.get(node.col) || []
      column.push(node)
      columns.set(node.col, column)
    }

    return columns
  }

  /**
   * 对每列内的节点按标签字母顺序排序
   *
   * @param columns - 列分组映射
   * @private
   */
  private sortColumnsAlphabetically(columns: Map<number, GraphNode[]>): void {
    for (const [, columnNodes] of columns) {
      columnNodes.sort((a, b) => a.label.localeCompare(b.label))
    }
  }

  /**
   * 计算图形的总宽度和高度
   *
   * @param columns - 列分组映射
   * @param maxCol - 最大列索引
   * @returns 包含宽度和高度的对象
   * @private
   */
  private calculateDimensions(
    columns: Map<number, GraphNode[]>,
    maxCol: number,
  ): { width: number; height: number; maxRows: number } {
    const width = Math.max(
      600,
      (maxCol + 1) * (STYLES.nodeWidth + STYLES.colSpacing) + STYLES.sidePadding * 2,
    )

    const maxRows = Math.max(1, Math.max(...Array.from(columns.values(), (arr) => arr.length)))

    const height = Math.max(
      400,
      maxRows * (STYLES.nodeHeight + STYLES.rowSpacingMin) + STYLES.topPadding * 2,
    )

    return { width, height, maxRows }
  }

  /**
   * 为所有节点分配 x, y 坐标
   *
   * @param columns - 列分组映射
   * @param dimensions - 图形尺寸信息
   * @private
   */
  private assignNodePositions(
    columns: Map<number, GraphNode[]>,
    dimensions: { width: number; height: number; maxRows: number },
  ): void {
    const fixedSpacing = STYLES.nodeHeight + STYLES.rowSpacingMin

    for (const [col, columnNodes] of columns) {
      const columnX = STYLES.sidePadding + col * (STYLES.nodeWidth + STYLES.colSpacing)

      // 计算该列的总高度
      const totalHeight =
        columnNodes.length > 0 ? (columnNodes.length - 1) * fixedSpacing + STYLES.nodeHeight : 0

      // 根据对齐方式计算列的起始 Y 坐标
      const columnTopOffset =
        this.align === 'center'
          ? Math.max(0, (dimensions.height - totalHeight) / 2)
          : STYLES.topPadding

      // 为该列的每个节点分配坐标
      columnNodes.forEach((node, index) => {
        node.x = columnX
        node.y = columnTopOffset + index * fixedSpacing
      })
    }
  }
}
