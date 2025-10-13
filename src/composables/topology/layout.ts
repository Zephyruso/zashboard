import type { Connection, Rule } from '@/types'
import { computed, type ComputedRef } from 'vue'
import { LAYOUT_CONSTANTS, type Node, type NodeLevel } from '../../composables/topology/types'
// 新增：用于将空 IP 显示为 "Inner" 等标签，与连接页面保持一致
import { topologyColumnAlign } from '@/store/settings'
import { getIPLabelFromMap } from '../../helper/sourceip'

const { NODE_HEIGHT, COLUMN_SPACING, ROW_SPACING, PADDING } = LAYOUT_CONSTANTS

// 名称标准化（去除首尾空格）
export const normalizeName = (name: string) => name.trim()

/**
 * 计算节点层级信息
 */
export function useNodeLevels(
  activeConnections: ComputedRef<Connection[]>,
  groupNameSet: ComputedRef<Set<string>>,
  rulesByProxyNormalized: ComputedRef<Map<string, Rule>>,
  hasRuleColumn: ComputedRef<boolean>,
) {
  return computed(() => {
    type Edge = { source: string; target: string }

    const levelMap = new Map<string, NodeLevel>()
    const edges: Edge[] = []

    const levelStart = hasRuleColumn.value ? 2 : 1 // 规则列为1，组从这里开始

    // 构建每条连接的顺序序列：client -> rule? -> groups... -> proxy
    activeConnections.value.forEach((conn) => {
      if (!conn.chains?.length) return

      const sequence: string[] = []

      // 客户端（仅参与排序，不计入 levelMap）
      const clientId = `client-${conn.metadata.sourceIP || 'inner'}`
      sequence.push(clientId)

      // 使用 root->leaf 顺序（反转 chains）
      const reversed = [...conn.chains].reverse().map(normalizeName)

      // 规则固定为第 1 列（如果存在）
      const rootCandidate = reversed[0]
      const matchingRule = rulesByProxyNormalized.value.get(rootCandidate)
      if (matchingRule && hasRuleColumn.value) {
        const ruleKey = `rule-${matchingRule.type}-${matchingRule.payload}-${matchingRule.proxy}`
        sequence.push(ruleKey)
        if (!levelMap.has(ruleKey)) {
          levelMap.set(ruleKey, {
            name: ruleKey,
            type: 'rule',
            level: 1,
            isGroup: false,
          })
        }
      }

      // 组按出现顺序加入序列（不立即确定层级）
      reversed.forEach((name) => {
        if (groupNameSet.value.has(name)) {
          const nodeKey = `group-${name}`
          sequence.push(nodeKey)
          if (!levelMap.has(nodeKey)) {
            levelMap.set(nodeKey, {
              name: nodeKey,
              type: 'group',
              level: levelStart, // 初始给最小可能层级
              isGroup: true,
            })
          }
        }
      })

      // 叶子出口
      let leaf = ''
      for (let i = reversed.length - 1; i >= 0; i--) {
        const name = reversed[i]
        if (!groupNameSet.value.has(name)) {
          leaf = name
          break
        }
      }
      if (leaf) {
        const proxyKey = `proxy-${leaf}`
        sequence.push(proxyKey)
        if (!levelMap.has(proxyKey)) {
          levelMap.set(proxyKey, {
            name: proxyKey,
            type: 'proxy',
            level: levelStart + 1, // 暂定，后续统一
            isGroup: false,
          })
        }
      }

      // 根据序列生成边
      for (let i = 0; i < sequence.length - 1; i++) {
        edges.push({ source: sequence[i], target: sequence[i + 1] })
      }
    })

    // 通过松弛算法确保严格递增分层：level(v) >= level(u) + 1（忽略 client->* 的边）
    const getTypeById = (id: string): NodeLevel['type'] | 'client' => {
      if (id.startsWith('group-')) return 'group'
      if (id.startsWith('proxy-')) return 'proxy'
      if (id.startsWith('rule-')) return 'rule'
      if (id.startsWith('client-')) return 'client'
      return 'group'
    }

    // 初始化层级
    levelMap.forEach((n) => {
      if (n.type === 'rule') n.level = 1
      else if (n.type === 'group') n.level = levelStart
      else if (n.type === 'proxy') n.level = levelStart + 1
    })

    // 迭代松弛，次数上限为节点数以避免死循环
    const nodeCount = levelMap.size
    for (let iter = 0; iter < nodeCount; iter++) {
      let updated = false
      for (const e of edges) {
        const srcType = getTypeById(e.source)
        if (srcType === 'client') continue // 客户端不参与层级
        const src = levelMap.get(e.source)
        const tgt = levelMap.get(e.target)
        if (!src || !tgt) continue
        const desired = src.level + 1
        if (tgt.level < desired) {
          tgt.level = desired
          updated = true
        }
        // 规则列固定
        if (src.type === 'rule' && src.level !== 1) {
          src.level = 1
          updated = true
        }
      }
      if (!updated) break
    }

    // 统一将所有出口放在最终一列
    let maxNonProxyLevel = 0
    levelMap.forEach((n) => {
      if (n.type !== 'proxy') {
        if (n.level > maxNonProxyLevel) maxNonProxyLevel = n.level
      }
    })
    const proxyLevel = Math.max(maxNonProxyLevel + 1, levelStart + 1)
    levelMap.forEach((n) => {
      if (n.type === 'proxy') n.level = proxyLevel
    })

    return levelMap
  })
}

/**
 * 计算最大层级数
 */
export function useMaxLevel(nodeLevels: ComputedRef<Map<string, NodeLevel>>) {
  return computed(() => {
    if (nodeLevels.value.size === 0) return 1
    return Math.max(...Array.from(nodeLevels.value.values()).map((n) => n.level))
  })
}

/**
 * 按层级分组并进行层内次序优化（基于前一层的重心排序，减少交叉与穿越）
 */
export function useNodesByLevel(
  nodeLevels: ComputedRef<Map<string, NodeLevel>>,
  activeConnections: ComputedRef<Connection[]>,
  clients: ComputedRef<Array<{ ip: string; count: number; totalTraffic: number }>>,
  groupNameSet: ComputedRef<Set<string>>,
  rulesByProxyNormalized: ComputedRef<Map<string, Rule>>,
  hasRuleColumn: ComputedRef<boolean>,
) {
  return computed(() => {
    type Edge = { source: string; target: string }
    const levels = new Map<number, NodeLevel[]>()

    // 分组
    nodeLevels.value.forEach((node) => {
      if (!levels.has(node.level)) levels.set(node.level, [])
      levels.get(node.level)!.push(node)
    })

    // 基于连接重建简单边集（包含 client，用于 level 1 的重心计算）
    const edges: Edge[] = []
    activeConnections.value.forEach((conn) => {
      if (!conn.chains?.length) return
      const seq: string[] = []
      const clientId = `client-${conn.metadata.sourceIP || 'inner'}`
      seq.push(clientId)
      const reversed = [...conn.chains].reverse().map(normalizeName)
      const rootCandidate = reversed[0]
      const matchingRule = rulesByProxyNormalized.value.get(rootCandidate)
      if (matchingRule && hasRuleColumn.value) {
        const ruleKey = `rule-${matchingRule.type}-${matchingRule.payload}-${matchingRule.proxy}`
        seq.push(ruleKey)
      }
      reversed.forEach((name) => {
        if (groupNameSet.value.has(name)) seq.push(`group-${name}`)
      })
      let leaf = ''
      for (let i = reversed.length - 1; i >= 0; i--) {
        const n = reversed[i]
        if (!groupNameSet.value.has(n)) {
          leaf = n
          break
        }
      }
      if (leaf) seq.push(`proxy-${leaf}`)
      for (let i = 0; i < seq.length - 1; i++) edges.push({ source: seq[i], target: seq[i + 1] })
    })

    // 构建入边索引
    const inNeighbors = new Map<string, Set<string>>()
    for (const e of edges) {
      if (!inNeighbors.has(e.target)) inNeighbors.set(e.target, new Set())
      inNeighbors.get(e.target)!.add(e.source)
    }

    // 客户端顺序（按流量已排序），用于 level 1 的重心
    const clientIndex = new Map<string, number>()
    clients.value.forEach((c, idx) => clientIndex.set(`client-${c.ip}`, idx))

    // 按层级顺序进行重心排序
    const sortedLevels = new Map<number, NodeLevel[]>()
    const maxLvl = Math.max(0, ...Array.from(levels.keys()))
    let prevOrderIndex = new Map<string, number>()

    for (let lvl = 1; lvl <= maxLvl; lvl++) {
      const arr = (levels.get(lvl) || []).slice()
      // 计算相对于前一层的重心
      const bary = new Map<string, number>()
      arr.forEach((n) => {
        const preds = Array.from(inNeighbors.get(n.name) || [])
        let sum = 0
        let cnt = 0
        for (const p of preds) {
          if (lvl === 1) {
            // 前一层为客户端
            if (clientIndex.has(p)) {
              sum += clientIndex.get(p)!
              cnt++
            }
          } else {
            // 前一层为普通节点
            if (prevOrderIndex.has(p)) {
              sum += prevOrderIndex.get(p)!
              cnt++
            }
          }
        }
        if (cnt > 0) bary.set(n.name, sum / cnt)
      })

      arr.sort((a, b) => {
        const ab = bary.get(a.name)
        const bb = bary.get(b.name)
        if (ab != null && bb != null) return ab - bb
        if (ab != null) return -1
        if (bb != null) return 1
        return a.name.localeCompare(b.name)
      })

      // 保存排序
      sortedLevels.set(lvl, arr)
      prevOrderIndex = new Map(arr.map((n, i) => [n.name, i]))
    }

    // 用优化后的顺序覆盖
    sortedLevels.forEach((arr, lvl) => levels.set(lvl, arr))

    return levels
  })
}

/**
 * 计算所有节点位置（基于动态层级）
 */
export function useNodes(
  clients: ComputedRef<Array<{ ip: string; count: number; totalTraffic: number }>>,
  maxLevel: ComputedRef<number>,
  nodesByLevel: ComputedRef<Map<number, NodeLevel[]>>,
) {
  return computed<Node[]>(() => {
    const result: Node[] = []
    const centerAlign = topologyColumnAlign.value === 'center'

    // 计算各列节点数量仅在居中时需要
    let maxColumnCount = 0
    if (centerAlign) {
      const levelCounts = new Map<number, number>()
      nodesByLevel.value.forEach((nodesArr, lvl) => levelCounts.set(lvl, nodesArr.length))
      maxColumnCount = Math.max(
        clients.value.length,
        ...Array.from(levelCounts.values(), (v) => v || 0),
      )
    }
    const colUnit = NODE_HEIGHT + ROW_SPACING

    // 客户端列
    let yOffset = PADDING
    if (centerAlign && maxColumnCount > clients.value.length) {
      yOffset += ((maxColumnCount - clients.value.length) * colUnit) / 2
    }
    clients.value.forEach((client) => {
      // 使用辅助函数转换 IP，为空字符串时返回 "Inner"
      const displayLabel = getIPLabelFromMap(client.ip)

      result.push({
        id: `client-${client.ip || 'inner'}`,
        label: displayLabel,
        x: PADDING,
        y: yOffset,
        type: 'client',
        connections: client.count,
        traffic: client.totalTraffic,
      })
      yOffset += NODE_HEIGHT + ROW_SPACING
    })

    // 遍历每个层级
    for (let level = 1; level <= maxLevel.value; level++) {
      const nodesInLevel = nodesByLevel.value.get(level) || []
      yOffset = PADDING
      if (centerAlign && maxColumnCount > nodesInLevel.length) {
        yOffset += ((maxColumnCount - nodesInLevel.length) * colUnit) / 2
      }

      nodesInLevel.forEach((nodeInfo) => {
        // 从 nodeInfo.name 中提取实际的节点名称和类型
        let label = ''
        const nodeType: 'rule' | 'group' | 'proxy' = nodeInfo.type

        if (nodeInfo.type === 'rule') {
          // 规则节点：从 ID 中解析
          const ruleId = nodeInfo.name.replace('rule-', '')
          const parts = ruleId.split('-')
          if (parts.length >= 3) {
            const type = parts[0]
            const payload = parts.slice(1, -1).join('-')
            label = `${type}: ${payload}`
          } else {
            label = ruleId
          }
        } else if (nodeInfo.type === 'group') {
          // 策略组节点
          label = nodeInfo.name.replace('group-', '')
        } else {
          // 代理节点
          label = nodeInfo.name.replace('proxy-', '')
        }

        result.push({
          id: nodeInfo.name,
          label,
          x: PADDING + COLUMN_SPACING * level,
          y: yOffset,
          type: nodeType,
          connections: 0,
          traffic: 0,
        })
        yOffset += NODE_HEIGHT + ROW_SPACING
      })
    }

    return result
  })
}
