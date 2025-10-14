/**
 * 图形构建服务
 * 负责从连接数据构建拓扑图的节点和边结构
 * @module GraphBuilder
 */

import type { Connection, Rule } from '@/types'
import type { GraphData, GraphEdge, GraphNode, NodeType } from './types'
import { normalizeName } from './utils'

/**
 * 图形构建器类
 * 遵循单一职责原则：仅负责图形数据结构的构建
 */
export class GraphBuilder {
  private nodesById = new Map<string, GraphNode>()
  private edgesById = new Map<string, GraphEdge>()
  private maxCol = 0

  /**
   * 构造函数
   *
   * @param rulesByProxy - 按代理名称索引的规则映射表
   * @param groupNames - 代理组名称集合
   */
  constructor(
    private rulesByProxy: Map<string, Rule>,
    private groupNames: Set<string>,
  ) {}

  /**
   * 从连接列表构建图形数据
   *
   * @param connections - 活动连接列表
   * @param getClientLabel - 获取客户端标签的函数
   * @returns 完整的图形数据结构
   */
  build(connections: Connection[], getClientLabel: (ip: string) => string): GraphData {
    this.reset()

    // 确定代理节点的固定列位置
    const proxyColumn = this.calculateProxyColumn(connections)

    // 处理每个连接，构建节点和边
    for (const conn of connections) {
      this.processConnection(conn, proxyColumn, getClientLabel)
    }

    // 生成最终的图形数据
    return this.generateGraphData()
  }

  /**
   * 重置构建器状态
   * @private
   */
  private reset(): void {
    this.nodesById.clear()
    this.edgesById.clear()
    this.maxCol = 0
  }

  /**
   * 计算代理节点应放置的列
   * 通过分析所有连接中的最大代理组深度来确定
   *
   * @param connections - 连接列表
   * @returns 代理节点列索引
   * @private
   */
  private calculateProxyColumn(connections: Connection[]): number {
    let maxGroupDepth = 0

    for (const conn of connections) {
      const chainReversed = [...(conn.chains || [])].reverse().map(normalizeName)
      let depth = 0

      for (const name of chainReversed) {
        if (!name) continue
        if (this.groupNames.has(name)) {
          depth++
        } else {
          break
        }
      }

      if (depth > maxGroupDepth) {
        maxGroupDepth = depth
      }
    }

    // 客户端=0列, 规则=1列, 代理组从2列开始, 代理节点在最后
    return 2 + maxGroupDepth
  }

  /**
   * 处理单个连接，添加相应的节点和边
   *
   * @param conn - 连接对象
   * @param proxyColumn - 代理节点列位置
   * @param getClientLabel - 获取客户端标签函数
   * @private
   */
  private processConnection(
    conn: Connection,
    proxyColumn: number,
    getClientLabel: (ip: string) => string,
  ): void {
    const up = Math.max(0, conn.uploadSpeed || 0)
    const down = Math.max(0, conn.downloadSpeed || 0)
    const traffic = up + down

    // 1. 添加客户端节点
    const clientKey = `client:${conn.metadata.sourceIP || 'inner'}`
    const clientLabel = getClientLabel(conn.metadata.sourceIP || '')
    this.addNode(clientKey, clientLabel, 'client', 0)

    // 2. 添加规则节点
    const ruleKey = this.buildRuleNode(conn)
    this.addEdge(clientKey, ruleKey, traffic, up, down)

    // 3. 添加代理组链和代理节点
    this.buildProxyChain(conn, ruleKey, traffic, up, down, proxyColumn)
  }

  /**
   * 构建规则节点
   *
   * @param conn - 连接对象
   * @returns 规则节点的 ID
   * @private
   */
  private buildRuleNode(conn: Connection): string {
    const chainReversed = [...(conn.chains || [])].reverse().map(normalizeName)
    const root = chainReversed[0]

    let ruleLabel = ''
    let ruleKey = ''

    if (root && this.rulesByProxy.has(root)) {
      const rule = this.rulesByProxy.get(root)!
      ruleLabel = `[${rule.type}] ${rule.payload}`
      ruleKey = `rule:${rule.type}:${rule.payload}:${normalizeName(rule.proxy)}`
    } else {
      ruleLabel = `[${conn.rule}] ${conn.rulePayload || ''}`.trim()
      ruleKey = `rule:${conn.rule}:${conn.rulePayload || ''}`
    }

    this.addNode(ruleKey, ruleLabel, 'rule', 1)
    return ruleKey
  }

  /**
   * 构建代理链（代理组 + 最终代理节点）
   *
   * @param conn - 连接对象
   * @param previousNodeId - 前一个节点的 ID
   * @param traffic - 总流量
   * @param up - 上传流量
   * @param down - 下载流量
   * @param proxyColumn - 代理节点列位置
   * @private
   */
  private buildProxyChain(
    conn: Connection,
    previousNodeId: string,
    traffic: number,
    up: number,
    down: number,
    proxyColumn: number,
  ): void {
    const chainReversed = [...(conn.chains || [])].reverse().map(normalizeName)
    let prevNode = previousNodeId
    let leafName: string | null = null

    // 遍历链，添加代理组节点
    for (let i = 0; i < chainReversed.length; i++) {
      const name = chainReversed[i]
      if (!name) continue

      if (this.groupNames.has(name)) {
        const groupId = `group:${name}`
        const col = 2 + i
        this.addNode(groupId, name, 'group', col)
        this.addEdge(prevNode, groupId, traffic, up, down)
        prevNode = groupId
      } else {
        leafName = name
        break
      }
    }

    // 查找最终代理节点（非代理组的叶子节点）
    if (!leafName) {
      for (let j = conn.chains.length - 1; j >= 0; j--) {
        const name = normalizeName(conn.chains[j])
        if (!this.groupNames.has(name)) {
          leafName = name
          break
        }
      }
    }

    // 添加最终代理节点
    if (leafName) {
      const proxyId = `proxy:${leafName}`
      this.addNode(proxyId, leafName, 'proxy', proxyColumn)
      this.addEdge(prevNode, proxyId, traffic, up, down)
      if (proxyColumn > this.maxCol) {
        this.maxCol = proxyColumn
      }
    }
  }

  /**
   * 添加节点（如已存在则更新）
   *
   * @param id - 节点 ID
   * @param label - 节点标签
   * @param type - 节点类型
   * @param col - 节点列位置
   * @private
   */
  private addNode(id: string, label: string, type: NodeType, col: number): void {
    let node = this.nodesById.get(id)

    if (!node) {
      node = { id, label, type, col, x: 0, y: 0 }
      this.nodesById.set(id, node)
    }

    // 更新节点属性
    if (col > node.col) node.col = col
    if (label && node.label !== label) node.label = label
    if (col > this.maxCol) this.maxCol = col
  }

  /**
   * 添加边（如已存在则累加权重）
   *
   * @param from - 起始节点 ID
   * @param to - 目标节点 ID
   * @param weight - 权重
   * @param up - 上传流量
   * @param down - 下载流量
   * @private
   */
  private addEdge(from: string, to: string, weight: number, up: number, down: number): void {
    const id = `${from}->${to}`
    const edge = this.edgesById.get(id)

    if (edge) {
      edge.weight += weight
      edge.up += up
      edge.down += down
    } else {
      this.edgesById.set(id, { id, from, to, weight, up, down })
    }
  }

  /**
   * 生成最终的图形数据
   * 不包含布局计算，仅返回原始节点和边数据
   *
   * @returns 图形数据结构
   * @private
   */
  private generateGraphData(): GraphData {
    const nodes = Array.from(this.nodesById.values())
    const edges = Array.from(this.edgesById.values())
    const maxWeight = edges.reduce((max, edge) => Math.max(max, edge.weight), 0)

    return {
      width: 0, // 将由布局计算器设置
      height: 0, // 将由布局计算器设置
      nodes,
      edges,
      maxWeight,
    }
  }
}
