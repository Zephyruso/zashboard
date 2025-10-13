import type { Connection, Rule } from '@/types'
import { computed, type ComputedRef } from 'vue'
import { normalizeName } from '../../composables/topology/layout'
import { LAYOUT_CONSTANTS, type Link, type Node } from '../../composables/topology/types'

const { COLUMN_SPACING, PADDING } = LAYOUT_CONSTANTS

/**
 * 提取客户端信息
 */
export function useClients(activeConnections: ComputedRef<Connection[]>) {
  return computed(() => {
    const clientMap = new Map<string, { ip: string; count: number; totalTraffic: number }>()

    activeConnections.value.forEach((conn) => {
      const ip = conn.metadata.sourceIP
      if (!clientMap.has(ip)) {
        clientMap.set(ip, { ip, count: 0, totalTraffic: 0 })
      }
      const client = clientMap.get(ip)!
      client.count++
      client.totalTraffic += conn.download + conn.upload
    })

    return Array.from(clientMap.values()).sort((a, b) => b.totalTraffic - a.totalTraffic)
  })
}

/**
 * 组名集合（用于快速判断是否为策略组）
 */
export function useGroupNameSet(proxyGroupList: ComputedRef<string[]>) {
  return computed(() => new Set(proxyGroupList.value.map((n) => normalizeName(n))))
}

/**
 * 规则映射（按 proxy 名称标准化）
 */
export function useRulesByProxyNormalized(rules: ComputedRef<Rule[]>) {
  return computed(() => {
    const map = new Map<string, Rule>()
    rules.value.forEach((rule) => {
      map.set(normalizeName(rule.proxy), rule)
    })
    return map
  })
}

/**
 * 是否需要展示规则列（至少有一个连接的根组命中规则）
 */
export function useHasRuleColumn(
  activeConnections: ComputedRef<Connection[]>,
  rulesByProxyNormalized: ComputedRef<Map<string, Rule>>,
) {
  return computed(() => {
    for (const conn of activeConnections.value) {
      if (conn.chains?.length) {
        const root = normalizeName(conn.chains[conn.chains.length - 1]) // 反转后的第一个
        if (rulesByProxyNormalized.value.has(root)) return true
      }
    }
    return false
  })
}

/**
 * 计算连接的流量
 */
export const getConnectionTraffic = (conn: Connection) => {
  return conn.downloadSpeed + conn.uploadSpeed
}

/**
 * 获取最大流量（用于归一化线条粗细）
 */
export function useMaxTraffic(activeConnections: ComputedRef<Connection[]>) {
  return computed(() => {
    if (activeConnections.value.length === 0) return 1
    const m = Math.max(...activeConnections.value.map(getConnectionTraffic))
    return m > 0 ? m : 1
  })
}

/**
 * 计算所有连接线
 */
export function useLinks(
  nodes: ComputedRef<Node[]>,
  activeConnections: ComputedRef<Connection[]>,
  groupNameSet: ComputedRef<Set<string>>,
  rulesByProxyNormalized: ComputedRef<Map<string, Rule>>,
  hasRuleColumn: ComputedRef<boolean>,
) {
  return computed<Link[]>(() => {
    const result: Link[] = []
    const nodeMap = new Map(nodes.value.map((n) => [n.id, n]))

    activeConnections.value.forEach((conn) => {
      const up = conn.uploadSpeed
      const down = conn.downloadSpeed
      const clientId = `client-${conn.metadata.sourceIP || 'inner'}`
      const clientNode = nodeMap.get(clientId)
      if (!clientNode || !conn.chains?.length) return

      const reversed = [...conn.chains].reverse().map(normalizeName)

      let currentNode = clientNode

      // 客户端 -> 规则（如果存在）
      const root = reversed[0]
      const matchingRule = rulesByProxyNormalized.value.get(root)
      if (matchingRule && hasRuleColumn.value) {
        const ruleNode = nodeMap.get(
          `rule-${matchingRule.type}-${matchingRule.payload}-${matchingRule.proxy}`,
        )
        if (ruleNode) {
          addOrUpdateLink(result, currentNode, ruleNode, up, down, conn)
          currentNode = ruleNode
        }
      }

      // 规则/客户端 -> 组（按深度） -> 出口
      for (const name of reversed) {
        const groupNode = nodeMap.get(`group-${name}`)
        if (groupNode) {
          addOrUpdateLink(result, currentNode, groupNode, up, down, conn)
          currentNode = groupNode
          continue
        }
        const proxyNode = nodeMap.get(`proxy-${name}`)
        if (proxyNode) {
          addOrUpdateLink(result, currentNode, proxyNode, up, down, conn)
          currentNode = proxyNode
        }
      }
    })

    return result
  })
}

/**
 * 辅助函数：添加或更新连接线
 */
const addOrUpdateLink = (
  links: Link[],
  source: Node,
  target: Node,
  upTraffic: number,
  downTraffic: number,
  conn: Connection,
) => {
  // 严格保证跨列连线，避免同层连接
  const levelOf = (n: Node) => Math.round((n.x - PADDING) / COLUMN_SPACING)
  if (levelOf(target) <= levelOf(source)) return

  const existingLink = links.find((l) => l.source.id === source.id && l.target.id === target.id)

  if (existingLink) {
    existingLink.upTraffic += upTraffic
    existingLink.downTraffic += downTraffic
    existingLink.traffic = existingLink.upTraffic + existingLink.downTraffic
    existingLink.connections.push(conn)
  } else {
    links.push({
      source,
      target,
      upTraffic,
      downTraffic,
      traffic: upTraffic + downTraffic,
      connections: [conn],
    })
  }
}

/**
 * 节点端点展示侧：根据入/出边判定
 */
export function useEndpointSides(links: ComputedRef<Link[]>) {
  return computed(() => {
    const map = new Map<string, { hasIn: boolean; hasOut: boolean }>()
    links.value.forEach((l) => {
      if (!map.has(l.source.id)) map.set(l.source.id, { hasIn: false, hasOut: false })
      if (!map.has(l.target.id)) map.set(l.target.id, { hasIn: false, hasOut: false })
      map.get(l.source.id)!.hasOut = true
      map.get(l.target.id)!.hasIn = true
    })
    return map
  })
}
