import type { Connection, Rule } from '@/types'
import { ref, type ComputedRef, type Ref } from 'vue'
import { normalizeName } from './layout'
import { bezierPoint, bezierTangent } from './particles'
import {
  LAYOUT_CONSTANTS,
  NODE_COLORS,
  PARTICLE_CONSTANTS,
  VISUAL_CONSTANTS,
  type Link,
  type LinkVisual,
  type Node,
  type NodeVisual,
  type Particle,
} from './types'

const { NODE_WIDTH, NODE_HEIGHT } = LAYOUT_CONSTANTS
const { LERP, FADED_ALPHA, NORMAL_ALPHA, NORMAL_STROKE, HIGHLIGHT_STROKE } = VISUAL_CONSTANTS
const { UL_COLOR, DL_COLOR } = PARTICLE_CONSTANTS

/**
 * 渲染系统 Hook
 */
export function useTopologyRenderer(
  canvasRef: Ref<HTMLCanvasElement | undefined>,
  containerBgColor: Ref<string>,
  renderScale: Ref<number>,
  renderOffsetX: Ref<number>,
  renderOffsetY: Ref<number>,
  renderNodePos: Ref<Map<string, { x: number; y: number }>>,
  renderLinkTraffic: Ref<Map<string, number>>,
  renderLinkUpTraffic: Ref<Map<string, number>>,
  renderLinkDownTraffic: Ref<Map<string, number>>,
  renderMaxTraffic: Ref<number>,
  nodes: ComputedRef<Node[]>,
  links: ComputedRef<Link[]>,
  endpointSides: ComputedRef<Map<string, { hasIn: boolean; hasOut: boolean }>>,
  hoveredNodeId: Ref<string | null>,
  activeConnections: ComputedRef<Connection[]>,
  groupNameSet: ComputedRef<Set<string>>,
  rulesByProxyNormalized: ComputedRef<Map<string, Rule>>,
  hasRuleColumn: ComputedRef<boolean>,
  getParticles: () => Particle[],
) {
  const nodeVisual = ref(new Map<string, NodeVisual>())
  const linkVisual = ref(new Map<string, LinkVisual>())
  const relatedNodeIds = new Set<string>()

  /**
   * 获取渲染位置
   */
  const getRenderedPos = (nodeId: string, fallbackX: number, fallbackY: number) => {
    const p = renderNodePos.value.get(nodeId)
    return p ? p : { x: fallbackX, y: fallbackY }
  }

  /**
   * 获取链路 ID
   */
  const getLinkId = (link: Link) => `${link.source.id}->${link.target.id}`

  /**
   * 获取渲染的流量（总量）
   */
  const getRenderedTrafficTotal = (link: Link) => {
    const id = getLinkId(link)
    const t = renderLinkTraffic.value.get(id)
    return t !== undefined ? t : link.traffic
  }

  /**
   * 获取渲染的流量（上行）
   */
  const getRenderedTrafficUp = (link: Link) => {
    const id = getLinkId(link)
    const t = renderLinkUpTraffic.value.get(id)
    return t !== undefined ? t : link.upTraffic
  }

  /**
   * 获取渲染的流量（下行）
   */
  const getRenderedTrafficDown = (link: Link) => {
    const id = getLinkId(link)
    const t = renderLinkDownTraffic.value.get(id)
    return t !== undefined ? t : link.downTraffic
  }

  /**
   * 获取渲染的线宽
   */
  const getRenderedLineWidth = (traffic: number) => {
    const denom = renderMaxTraffic.value > 0 ? renderMaxTraffic.value : 1
    const normalized = traffic / denom
    return Math.max(1, Math.min(10, normalized * 10))
  }

  /**
   * 绘制节点
   */
  const drawNode = (ctx: CanvasRenderingContext2D, node: Node) => {
    const rp = getRenderedPos(node.id, node.x, node.y)
    const x = rp.x * renderScale.value + renderOffsetX.value
    const y = rp.y * renderScale.value + renderOffsetY.value
    const width = NODE_WIDTH * renderScale.value
    const height = NODE_HEIGHT * renderScale.value

    // 绘制圆角矩形底板（容器背景色，避免连线透过）
    const radius = 8
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.arcTo(x + width, y, x + width, y + radius, radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
    ctx.lineTo(x + radius, y + height)
    ctx.arcTo(x, y + height, x, y + height - radius, radius)
    ctx.lineTo(x, y + radius)
    ctx.arcTo(x, y, x + radius, y, radius)
    ctx.closePath()
    ctx.fillStyle = containerBgColor.value
    ctx.fill()

    // 叠加带色背景与描边
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.arcTo(x + width, y, x + width, y + radius, radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
    ctx.lineTo(x + radius, y + height)
    ctx.arcTo(x, y + height, x, y + height - radius, radius)
    ctx.lineTo(x, y + radius)
    ctx.arcTo(x, y, x + radius, y, radius)
    ctx.closePath()

    // 处理高亮与淡化
    let targetAlpha: number = NORMAL_ALPHA
    let targetStroke: number = NORMAL_STROKE
    if (hoveredNodeId.value) {
      if (node.id === hoveredNodeId.value) {
        targetStroke = HIGHLIGHT_STROKE
      } else if (!relatedNodeIds.has(node.id)) {
        targetAlpha = FADED_ALPHA
      }
    }

    const vis = nodeVisual.value.get(node.id) || { alpha: targetAlpha, stroke: targetStroke }
    vis.alpha += (targetAlpha - vis.alpha) * LERP
    vis.stroke += (targetStroke - vis.stroke) * LERP
    nodeVisual.value.set(node.id, vis)

    const alpha = vis.alpha
    const strokeW = vis.stroke

    ctx.globalAlpha = alpha
    ctx.fillStyle = NODE_COLORS[node.type] + '20'
    ctx.fill()
    ctx.strokeStyle = NODE_COLORS[node.type]
    ctx.lineWidth = strokeW
    ctx.stroke()
    ctx.globalAlpha = 1

    // 连接端点圆点（左右两侧，随缩放自适应尺寸与描边）
    const endpointR = Math.max(4, 4 * Math.sqrt(renderScale.value))
    const haloW = Math.max(1.5, 1.2 * Math.sqrt(renderScale.value))
    const cy = y + height / 2

    const drawEndpoint = (cx: number) => {
      // 实心圆点
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(cx, cy, endpointR, 0, Math.PI * 2)
      ctx.fillStyle = NODE_COLORS[node.type]
      ctx.fill()
      // 背景色光环描边
      ctx.lineWidth = haloW
      ctx.strokeStyle = containerBgColor.value
      ctx.stroke()
      ctx.restore()
    }

    // 仅在存在对应方向的连接时绘制端点
    const sides = endpointSides.value.get(node.id)
    const showLeft = !!(sides && sides.hasIn)
    const showRight = !!(sides && sides.hasOut)
    if (showLeft) drawEndpoint(x)
    if (showRight) drawEndpoint(x + width)

    // 绘制文本
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = NODE_COLORS[node.type]
    ctx.font = `${Math.max(12, 14 * renderScale.value)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 截断过长的文本
    let text = node.label
    const maxWidth = width - 20
    const metrics = ctx.measureText(text)

    if (metrics.width > maxWidth) {
      while (ctx.measureText(text + '...').width > maxWidth && text.length > 0) {
        text = text.slice(0, -1)
      }
      text += '...'
    }

    ctx.fillText(text, x + width / 2, y + height / 2)
    ctx.restore()
  }

  /**
   * 绘制连接线通道
   */
  const drawLinkChannel = (ctx: CanvasRenderingContext2D, link: Link) => {
    const sp = getRenderedPos(link.source.id, link.source.x, link.source.y)
    const tp = getRenderedPos(link.target.id, link.target.x, link.target.y)
    const startX = sp.x * renderScale.value + renderOffsetX.value + NODE_WIDTH * renderScale.value
    const startY =
      sp.y * renderScale.value + renderOffsetY.value + (NODE_HEIGHT / 2) * renderScale.value
    const endX = tp.x * renderScale.value + renderOffsetX.value
    const endY =
      tp.y * renderScale.value + renderOffsetY.value + (NODE_HEIGHT / 2) * renderScale.value

    const renderedTraffic = getRenderedTrafficTotal(link)
    const lineWidth = getRenderedLineWidth(renderedTraffic) * renderScale.value

    // 确定目标透明度
    let targetAlpha = 0.6
    let color = '#6366f1'
    if (hoveredNodeId.value) {
      const inSetSrc = relatedNodeIds.has(link.source.id)
      const inSetTgt = relatedNodeIds.has(link.target.id)
      if (inSetSrc && inSetTgt) {
        if (link.source.id === hoveredNodeId.value || link.target.id === hoveredNodeId.value) {
          targetAlpha = 0.9
          color = '#4f46e5'
        } else {
          targetAlpha = 0.75
        }
      } else {
        targetAlpha = 0.1
      }
    }

    const vis = linkVisual.value.get(getLinkId(link)) || { alpha: targetAlpha }
    vis.alpha += (targetAlpha - vis.alpha) * LERP
    linkVisual.value.set(getLinkId(link), vis)
    const alpha = vis.alpha

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.moveTo(startX, startY)

    // 使用贝塞尔曲线
    const controlPointX = (startX + endX) / 2
    ctx.bezierCurveTo(controlPointX, startY, controlPointX, endY, endX, endY)

    ctx.stroke()
    ctx.globalAlpha = 1
  }

  /**
   * 绘制粒子
   */
  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    const particles = getParticles()
    if (particles.length === 0) return

    // 构建链接查找表
    const linkMap = new Map<string, Link>()
    links.value.forEach((l) => linkMap.set(getLinkId(l), l))

    ctx.save()
    for (const p of particles) {
      const link = linkMap.get(p.linkId)
      if (!link) continue
      const sp = getRenderedPos(link.source.id, link.source.x, link.source.y)
      const tp = getRenderedPos(link.target.id, link.target.x, link.target.y)
      const sx = sp.x * renderScale.value + renderOffsetX.value + NODE_WIDTH * renderScale.value
      const sy =
        sp.y * renderScale.value + renderOffsetY.value + (NODE_HEIGHT / 2) * renderScale.value
      const ex = tp.x * renderScale.value + renderOffsetX.value
      const ey =
        tp.y * renderScale.value + renderOffsetY.value + (NODE_HEIGHT / 2) * renderScale.value
      const cx = (sx + ex) / 2

      // 车道偏移基于通道宽度
      const width = getRenderedLineWidth(getRenderedTrafficTotal(link)) * renderScale.value
      const laneOffset = Math.min(width * 0.25, 10)

      const pt = bezierPoint(sx, sy, cx, ex, ey, p.t)
      const tg = bezierTangent(sx, sy, cx, ex, ey, p.t)
      const len = Math.hypot(tg.x, tg.y) || 1
      // 法向量
      const nx = -tg.y / len
      const ny = tg.x / len
      const side = p.lane === 'up' ? 1 : -1
      const px = pt.x + nx * laneOffset * side
      const py = pt.y + ny * laneOffset * side

      // 根据高亮规则调整粒子透明度
      let targetAlpha = 0.9
      if (hoveredNodeId.value) {
        const highlightSrc = relatedNodeIds.has(link.source.id)
        const highlightTgt = relatedNodeIds.has(link.target.id)
        if (!(highlightSrc && highlightTgt)) {
          targetAlpha = 0.15
        }
      }

      // 简单方法：不对每个粒子进行平滑，复用 linkVisual alpha
      const linkVis = linkVisual.value.get(getLinkId(link))
      const alpha = linkVis ? linkVis.alpha : targetAlpha

      ctx.beginPath()
      ctx.arc(px, py, p.size * Math.max(1, Math.sqrt(renderScale.value)), 0, Math.PI * 2)
      ctx.fillStyle = p.lane === 'up' ? UL_COLOR : DL_COLOR
      ctx.globalAlpha = alpha
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  /**
   * 更新相关节点集合（用于高亮）
   */
  const updateRelatedNodes = () => {
    relatedNodeIds.clear()
    if (hoveredNodeId.value) {
      // 构建节点 ID 序列以匹配渲染 ID
      const makeSeq = (conn: Connection): string[] => {
        const seq: string[] = []
        seq.push(`client-${conn.metadata.sourceIP || 'inner'}`)
        if (!conn.chains?.length) return seq
        const reversed = [...conn.chains].reverse().map(normalizeName)
        const root = reversed[0]
        const matchingRule = rulesByProxyNormalized.value.get(root)
        if (matchingRule && hasRuleColumn.value) {
          seq.push(`rule-${matchingRule.type}-${matchingRule.payload}-${matchingRule.proxy}`)
        }
        reversed.forEach((name) => {
          if (groupNameSet.value.has(name)) seq.push(`group-${name}`)
        })
        // 叶子代理
        let leaf = ''
        for (let i = reversed.length - 1; i >= 0; i--) {
          const n = reversed[i]
          if (!groupNameSet.value.has(n)) {
            leaf = n
            break
          }
        }
        if (leaf) seq.push(`proxy-${leaf}`)
        return seq
      }

      activeConnections.value.forEach((conn) => {
        const seq = makeSeq(conn)
        if (seq.includes(hoveredNodeId.value!)) {
          seq.forEach((id) => relatedNodeIds.add(id))
        }
      })
    }
  }

  /**
   * 绘制整个画布
   */
  const draw = () => {
    const canvas = canvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 更新相关节点
    updateRelatedNodes()

    // 绘制连接通道（保留边缘）
    links.value.forEach((link) => drawLinkChannel(ctx, link))

    // 绘制粒子（双向）
    drawParticles(ctx)

    // 绘制节点
    nodes.value.forEach((node) => drawNode(ctx, node))
  }

  /**
   * 初始化视觉状态
   */
  const initializeVisualStates = () => {
    nodes.value.forEach((n) =>
      nodeVisual.value.set(n.id, { alpha: NORMAL_ALPHA, stroke: NORMAL_STROKE }),
    )
    links.value.forEach((l) => linkVisual.value.set(getLinkId(l), { alpha: 0.6 }))
  }

  return {
    nodeVisual,
    linkVisual,
    draw,
    getRenderedPos,
    getLinkId,
    getRenderedTrafficUp,
    getRenderedTrafficDown,
    getRenderedLineWidth,
    initializeVisualStates,
  }
}
