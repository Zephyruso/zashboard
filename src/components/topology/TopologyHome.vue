<template>
  <div
    class="size-full overflow-hidden"
    ref="containerRef"
  >
    <div
      class="h-full w-full"
      ref="stageHostRef"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { activeConnections } from '@/store/connections'
import { proxyGroupList, proxyMap } from '@/store/proxies'
import { rules as allRules } from '@/store/rules'
import { topologyAlign } from '@/store/settings'
import type { Connection, Rule } from '@/types'
import { useElementSize } from '@vueuse/core'
import Konva from 'konva'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type NodeType = 'client' | 'rule' | 'group' | 'proxy'

type GraphNode = {
  id: string
  label: string
  type: NodeType
  col: number
  x: number
  y: number
}

type GraphEdge = {
  id: string
  from: string
  to: string
  weight: number
  up: number
  down: number
}

const containerRef = ref<HTMLDivElement>()
const stageHostRef = ref<HTMLDivElement>()
const { width: hostW, height: hostH } = useElementSize(stageHostRef)

const STYLES = {
  nodeWidth: 168,
  nodeHeight: 40,
  colSpacing: 120,
  rowSpacingMin: 26,
  sidePadding: 16,
  topPadding: 16,
  edgeMin: 1,
  edgeMax: 12,
}

const normalizeName = (s: string) => (s || '').trim()

// Palette consistent with old topology
const NODE_COLORS: Record<NodeType, string> = {
  client: '#3b82f6', // blue
  rule: '#8b5cf6', // purple
  group: '#10b981', // green
  proxy: '#f59e0b', // amber
}

// Use Konva.Util.getRGB for color conversion
const hexToRgba = (hex: string, alpha: number) => {
  const rgb = Konva.Util.getRGB(hex)
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

// Visual constants for hover highlight/fade
const VISUAL: {
  NODE_FADED_OPACITY: number
  NODE_NORMAL_OPACITY: number
  NODE_HIGHLIGHT_STROKE: number
  NODE_NORMAL_STROKE: number
  EDGE_DEFAULT_COLOR: string
  EDGE_HIGHLIGHT_COLOR: string
  EDGE_UNRELATED_OPACITY: number
  EDGE_RELATED_OPACITY: number
  EDGE_HIGHLIGHT_OPACITY: number
  EDGE_NORMAL_OPACITY: number
} = {
  NODE_FADED_OPACITY: 0.35,
  NODE_NORMAL_OPACITY: 1,
  NODE_HIGHLIGHT_STROKE: 2.6,
  NODE_NORMAL_STROKE: 1.5,
  EDGE_DEFAULT_COLOR: '#6366f1',
  EDGE_HIGHLIGHT_COLOR: '#4f46e5',
  EDGE_UNRELATED_OPACITY: 0.1,
  EDGE_RELATED_OPACITY: 0.75,
  EDGE_HIGHLIGHT_OPACITY: 0.9,
  EDGE_NORMAL_OPACITY: 0.8,
}

const mapRulesByProxy = computed(() => {
  const map = new Map<string, Rule>()
  for (const r of allRules.value) {
    map.set(normalizeName(r.proxy), r)
  }
  return map
})

const graph = computed(() => buildGraph(activeConnections.value))

// group name lookup for relation detection
const groupNameSet = computed(() => new Set(proxyGroupList.value.map((n) => normalizeName(n))))

function buildGraph(conns: Connection[]) {
  const nodesById = new Map<string, GraphNode>()
  const edgesById = new Map<string, GraphEdge>()
  let maxCol = 0

  const addNode = (id: string, label: string, type: NodeType, col: number) => {
    let node = nodesById.get(id)
    if (!node) {
      node = { id, label, type, col, x: 0, y: 0 }
      nodesById.set(id, node)
    }
    if (col > node.col) node.col = col
    if (label && node.label !== label) node.label = label
    if (col > maxCol) maxCol = col
    return node
  }

  const addEdge = (from: string, to: string, w: number, up: number, down: number) => {
    const id = `${from}->${to}`
    const e = edgesById.get(id)
    if (e) {
      e.weight += w
      e.up += up
      e.down += down
    } else {
      edgesById.set(id, { id, from, to, weight: w, up, down })
    }
  }

  // determine group depth to fix a single proxy column
  const groupSetGlobal = new Set(proxyGroupList.value.map((n) => normalizeName(n)))
  let maxGroupDepth = 0
  for (const conn of conns) {
    const chainReversed = [...(conn.chains || [])].reverse().map(normalizeName)
    let depth = 0
    for (const name of chainReversed) {
      if (!name) continue
      if (groupSetGlobal.has(name)) depth++
      else break
    }
    if (depth > maxGroupDepth) maxGroupDepth = depth
  }
  const proxyColFixed = 2 + maxGroupDepth // clients=0, rules=1, groups=2.., proxies at last fixed column

  for (const conn of conns) {
    const up = Math.max(0, conn.uploadSpeed || 0)
    const down = Math.max(0, conn.downloadSpeed || 0)
    const traffic = up + down
    const clientKey = `client:${conn.metadata.sourceIP || 'inner'}`
    addNode(clientKey, conn.metadata.sourceIP || 'inner', 'client', 0)

    // rule node — try find by root proxy name; fallback to connection.rule/connection.rulePayload
    const chainReversed = [...(conn.chains || [])].reverse().map(normalizeName)
    const root = chainReversed[0]
    let ruleLabel = ''
    let ruleKey = ''
    if (root && mapRulesByProxy.value.has(root)) {
      const r = mapRulesByProxy.value.get(root)!
      ruleLabel = `[${r.type}] ${r.payload}`
      ruleKey = `rule:${r.type}:${r.payload}:${normalizeName(r.proxy)}`
    } else {
      ruleLabel = `[${conn.rule}] ${conn.rulePayload || ''}`.trim()
      ruleKey = `rule:${conn.rule}:${conn.rulePayload || ''}`
    }
    addNode(ruleKey, ruleLabel, 'rule', 1)
    addEdge(clientKey, ruleKey, traffic, up, down)

    // traverse chain elements: groups then final proxy
    let prev = ruleKey
    let leafName: string | null = null
    const groupSet = groupSetGlobal
    for (let i = 0; i < chainReversed.length; i++) {
      const name = chainReversed[i]
      if (!name) continue
      if (groupSet.has(name)) {
        const id = `group:${name}`
        const col = 2 + i
        addNode(id, name, 'group', col)
        addEdge(prev, id, traffic, up, down)
        prev = id
      } else {
        leafName = name
        break
      }
    }
    if (!leafName) {
      // find last non-group as leaf from original chains
      for (let j = conn.chains.length - 1; j >= 0; j--) {
        const n = normalizeName(conn.chains[j])
        if (!groupSet.has(n)) {
          leafName = n
          break
        }
      }
    }
    if (leafName) {
      const leafId = `proxy:${leafName}`
      const col = proxyColFixed
      addNode(leafId, leafName, 'proxy', col)
      addEdge(prev, leafId, traffic, up, down)
      if (col > maxCol) maxCol = col
    }
  }

  // layout positions by columns
  const columns = new Map<number, GraphNode[]>()
  for (const node of nodesById.values()) {
    const arr = columns.get(node.col) || []
    arr.push(node)
    columns.set(node.col, arr)
  }
  for (const [, arr] of columns) {
    arr.sort((a, b) => a.label.localeCompare(b.label))
  }

  maxCol = Math.max(maxCol, proxyColFixed)
  const width = Math.max(
    600,
    (maxCol + 1) * (STYLES.nodeWidth + STYLES.colSpacing) + STYLES.sidePadding * 2,
  )
  const approxRows = Math.max(1, Math.max(...Array.from(columns.values(), (arr) => arr.length)))
  const heightNeeded = Math.max(
    400,
    approxRows * (STYLES.nodeHeight + STYLES.rowSpacingMin) + STYLES.topPadding * 2,
  )

  for (const [col, arr] of columns) {
    const colX = STYLES.sidePadding + col * (STYLES.nodeWidth + STYLES.colSpacing)
    const fixed = STYLES.nodeHeight + STYLES.rowSpacingMin
    const totalHeight = arr.length > 0 ? (arr.length - 1) * fixed + STYLES.nodeHeight : 0
    const colTopOffset =
      topologyAlign.value === 'center'
        ? Math.max(0, (heightNeeded - totalHeight) / 2)
        : STYLES.topPadding
    arr.forEach((node, idx) => {
      node.x = colX
      node.y = colTopOffset + idx * fixed
    })
  }

  const nodes = Array.from(nodesById.values())
  const edges = Array.from(edgesById.values())
  const maxWeight = edges.reduce((m, e) => Math.max(m, e.weight), 0)
  return { width, height: heightNeeded, nodes, edges, maxWeight }
}

let stage: Konva.Stage | null = null
let edgeLayer: Konva.Layer | null = null
let nodeLayer: Konva.Layer | null = null
let particleLayer: Konva.Layer | null = null

type NodeView = {
  baseRect: Konva.Rect
  group: Konva.Group
  rect: Konva.Rect
  text: Konva.Text
  type: NodeType
  label: string
}

type EdgeView = {
  line: Konva.Line
  from: string
  to: string
}

const nodeViews = new Map<string, NodeView>()
const edgeViews = new Map<string, EdgeView>()

let edgeFollowAnim: Konva.Animation | null = null
let particleAnim: Konva.Animation | null = null
let isStageDragging = false

// =============== Hover state ===============
const hoveredNodeId = ref<string | null>(null)
const relatedNodeIds = new Set<string>()

const makeSeqForConn = (conn: Connection): string[] => {
  const seq: string[] = []
  const clientId = `client:${conn.metadata.sourceIP || 'inner'}`
  seq.push(clientId)

  const reversed = [...(conn.chains || [])].reverse().map(normalizeName)
  const root = reversed[0]
  if (root && mapRulesByProxy.value.has(root)) {
    const r = mapRulesByProxy.value.get(root) as Rule
    seq.push(`rule:${r.type}:${r.payload}:${normalizeName(r.proxy)}`)
  } else {
    const ruleType = conn.rule || ''
    const rulePayload = conn.rulePayload || ''
    seq.push(`rule:${ruleType}:${rulePayload}`)
  }

  // groups along the chain
  for (const name of reversed) {
    if (groupNameSet.value.has(name)) seq.push(`group:${name}`)
  }

  // leaf proxy (last non-group)
  let leafName: string | null = null
  for (let i = (conn.chains?.length || 0) - 1; i >= 0; i--) {
    const n = normalizeName(conn.chains![i])
    if (!groupNameSet.value.has(n)) {
      leafName = n
      break
    }
  }
  if (leafName) seq.push(`proxy:${leafName}`)
  return seq
}

const updateRelatedNodes = () => {
  relatedNodeIds.clear()
  const hid = hoveredNodeId.value
  if (!hid) return
  for (const conn of activeConnections.value) {
    const seq = makeSeqForConn(conn)
    if (seq.includes(hid)) {
      for (const id of seq) relatedNodeIds.add(id)
    }
  }
}

const applyHoverVisuals = () => {
  // nodes
  for (const [id, v] of nodeViews) {
    const isHovered = hoveredNodeId.value === id
    const isRelated = relatedNodeIds.has(id)
    let targetOpacity = VISUAL.NODE_NORMAL_OPACITY
    if (hoveredNodeId.value) {
      if (!(isHovered || isRelated)) targetOpacity = VISUAL.NODE_FADED_OPACITY
    }
    const strokeTarget = isHovered ? VISUAL.NODE_HIGHLIGHT_STROKE : VISUAL.NODE_NORMAL_STROKE
    v.group.to({ opacity: targetOpacity, duration: 0.18 })
    v.rect.to({ strokeWidth: strokeTarget, duration: 0.18 })
    if (isHovered) v.group.moveToTop()
  }

  // edges and particle opacity map
  const edgeAlphaTarget = new Map<string, number>()
  for (const [id, v] of edgeViews) {
    let alpha = VISUAL.EDGE_NORMAL_OPACITY
    let color = VISUAL.EDGE_DEFAULT_COLOR
    if (hoveredNodeId.value) {
      const inSrc = relatedNodeIds.has(v.from)
      const inTgt = relatedNodeIds.has(v.to)
      if (inSrc && inTgt) {
        const isDirect = v.from === hoveredNodeId.value || v.to === hoveredNodeId.value
        alpha = isDirect ? VISUAL.EDGE_HIGHLIGHT_OPACITY : VISUAL.EDGE_RELATED_OPACITY
        color = isDirect ? VISUAL.EDGE_HIGHLIGHT_COLOR : VISUAL.EDGE_DEFAULT_COLOR
      } else {
        alpha = VISUAL.EDGE_UNRELATED_OPACITY
      }
    }
    v.line.to({ opacity: alpha, stroke: color, duration: 0.18 })
    edgeAlphaTarget.set(id, alpha)
  }

  // particles follow link alpha
  for (const p of particles) {
    const a = edgeAlphaTarget.get(p.edgeId)
    const target = a !== undefined ? a : hoveredNodeId.value ? VISUAL.EDGE_UNRELATED_OPACITY : 0.95
    p.shape.to({ opacity: target, duration: 0.18 })
  }

  nodeLayer?.batchDraw()
  edgeLayer?.batchDraw()
  particleLayer?.batchDraw()
}

const setHover = (id: string | null) => {
  hoveredNodeId.value = id
  updateRelatedNodes()
  applyHoverVisuals()
}

// ================= Particle System (Konva) =================
type ParticleLane = 'up' | 'down'
type Particle = {
  // path-based flow: particles traverse multiple edges sequentially
  pathId: string
  segments: string[]
  segIdx: number
  edgeId: string
  t: number
  dir: 1 | -1
  speed: number
  speedFactor: number
  size: number
  lane: ParticleLane
  shape: Konva.Circle
}

const PARTICLE_CONSTANTS = {
  MAX_PARTICLES: 1500,
  BASE_PPS: 2,
  MAX_PPS: 40,
  // Slightly higher initial and max speeds for better visual responsiveness
  MIN_SPEED: 0.35,
  MAX_SPEED: 1.5,
  UL_COLOR: '#fb7185',
  DL_COLOR: '#38bdf8',
} as const

const particles: Particle[] = []
// residuals for Poisson-like spawn per path lane: key = pathId|lane
const spawnResidual = new Map<string, number>()
let lastParticleNow = performance.now()

const removeParticleAt = (idx: number) => {
  const p = particles[idx]
  if (!p) return
  p.shape.destroy()
  particles.splice(idx, 1)
}

const pruneParticles = () => {
  const valid = new Set<string>()
  for (const [id] of edgeViews) valid.add(id)
  for (let i = particles.length - 1; i >= 0; i--) {
    if (!valid.has(particles[i].edgeId)) removeParticleAt(i)
  }
}

const getEdgeCurveParams = (edgeId: string) => {
  const ev = edgeViews.get(edgeId)
  if (!ev) return null
  const s = nodeViews.get(ev.from)
  const t = nodeViews.get(ev.to)
  if (!s || !t) return null
  const sx = s.group.x() + STYLES.nodeWidth
  const sy = s.group.y() + STYLES.nodeHeight / 2
  const ex = t.group.x()
  const ey = t.group.y() + STYLES.nodeHeight / 2
  const cx = (sx + ex) / 2
  const width = ev.line.strokeWidth()
  return { sx, sy, cx, ex, ey, width }
}

const bezierPoint = (sx: number, sy: number, cx: number, ex: number, ey: number, t: number) => {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  const x = uuu * sx + 3 * uu * t * cx + 3 * u * tt * cx + ttt * ex
  const y = uuu * sy + 3 * uu * t * sy + 3 * u * tt * ey + ttt * ey
  return { x, y }
}

const bezierTangent = (sx: number, sy: number, cx: number, ex: number, ey: number, t: number) => {
  const u = 1 - t
  const dx = 3 * u * u * (cx - sx) + 3 * t * t * (ex - cx)
  const dy = 6 * u * t * (ey - sy)
  return { x: dx, y: dy }
}

const updateParticlePositions = () => {
  if (!particleLayer) return
  const scale = stage?.scaleX() || 1
  for (const p of particles) {
    const params = getEdgeCurveParams(p.edgeId)
    if (!params) continue
    const { sx, sy, cx, ex, ey, width } = params
    const laneOffset = Math.min((width || 1) * 0.25, 10)
    const pt = bezierPoint(sx, sy, cx, ex, ey, p.t)
    const tg = bezierTangent(sx, sy, cx, ex, ey, p.t)
    const len = Math.hypot(tg.x, tg.y) || 1
    const nx = -tg.y / len
    const ny = tg.x / len
    const side = p.lane === 'up' ? 1 : -1
    p.shape.x(pt.x + nx * laneOffset * side)
    p.shape.y(pt.y + ny * laneOffset * side)
    p.shape.radius(p.size * Math.max(1, Math.sqrt(scale)))
  }
}

const makeEdgeSeqFromNodeSeq = (seq: string[]) => {
  const edges = new Set(graph.value.edges.map((e) => e.id))
  const res: string[] = []
  for (let i = 0; i < seq.length - 1; i++) {
    const id = seq[i] + '->' + seq[i + 1]
    if (edges.has(id)) res.push(id)
  }
  return res
}

const aggregatePathsForSpawn = () => {
  const conns = activeConnections.value
  if (!conns.length) return [] as { pathId: string; segments: string[]; up: number; down: number }[]

  let maxUp = 0
  let maxDown = 0
  for (const c of conns) {
    if (c.uploadSpeed > maxUp) maxUp = c.uploadSpeed
    if (c.downloadSpeed > maxDown) maxDown = c.downloadSpeed
  }
  const denomUp = Math.max(1, maxUp)
  const denomDown = Math.max(1, maxDown)

  const map = new Map<string, { segments: string[]; up: number; down: number }>()
  for (const c of conns) {
    const nodeSeq = makeSeqForConn(c)
    const segments = makeEdgeSeqFromNodeSeq(nodeSeq)
    if (!segments.length) continue
    const pathId = nodeSeq.join('->')
    const e = map.get(pathId) || { segments, up: 0, down: 0 }
    e.up += Math.max(0, c.uploadSpeed / denomUp)
    e.down += Math.max(0, c.downloadSpeed / denomDown)
    map.set(pathId, e)
  }

  const arr: { pathId: string; segments: string[]; up: number; down: number }[] = []
  for (const [pathId, v] of map) {
    arr.push({ pathId, segments: v.segments, up: Math.min(1, v.up), down: Math.min(1, v.down) })
  }
  return arr
}

const advanceParticles = (now: number) => {
  const dt = Math.max(0.001, (now - lastParticleNow) / 1000)
  lastParticleNow = now
  if (!graph.value.edges.length) {
    if (particles.length) {
      // clear all
      for (let i = particles.length - 1; i >= 0; i--) removeParticleAt(i)
      return true
    }
    return false
  }

  // compute current intensities per path (normalized 0..1)
  const pathAgg = aggregatePathsForSpawn()
  const intensityByPath = new Map<string, { up: number; down: number }>()
  for (const p of pathAgg) {
    intensityByPath.set(p.pathId, { up: p.up, down: p.down })
  }

  // move particles; ensure speed is non-decreasing (can only speed up)
  let moved = false
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    const intens = intensityByPath.get(p.pathId)
    const laneIntensity = p.lane === 'up' ? (intens?.up ?? 0) : (intens?.down ?? 0)
    const clamped = Math.max(0.25, laneIntensity)
    const candidate =
      PARTICLE_CONSTANTS.MIN_SPEED +
      (PARTICLE_CONSTANTS.MAX_SPEED - PARTICLE_CONSTANTS.MIN_SPEED) * p.speedFactor * clamped
    if (candidate > p.speed) p.speed = candidate

    p.t += p.speed * dt * p.dir
    // progress across path segments
    while (p.t < 0 || p.t > 1) {
      if (p.dir > 0 && p.t > 1) {
        p.segIdx += 1
        p.t -= 1
      } else if (p.dir < 0 && p.t < 0) {
        p.segIdx -= 1
        p.t += 1
      } else {
        break
      }
      if (p.segIdx < 0 || p.segIdx >= p.segments.length) {
        removeParticleAt(i)
        moved = true
        break
      }
      p.edgeId = p.segments[p.segIdx]
    }
    if (particles[i] === p) moved = true
  }

  // spawn per aggregated path; particles traverse entire route and auto-merge visually
  const spawnForPath = (
    pathId: string,
    segments: string[],
    lane: ParticleLane,
    intensity: number,
    dir: 1 | -1,
    color: string,
  ) => {
    if (!segments.length) return
    const key = pathId + '|' + lane
    const pps = PARTICLE_CONSTANTS.BASE_PPS + PARTICLE_CONSTANTS.MAX_PPS * intensity
    const want = pps * dt + (spawnResidual.get(key) || 0)
    let n = Math.floor(want)
    spawnResidual.set(key, want - n)
    n = Math.min(n, 10)
    for (let k = 0; k < n && particles.length < PARTICLE_CONSTANTS.MAX_PARTICLES; k++) {
      const speedFactor = 0.5 + 0.5 * Math.random()
      const speed =
        PARTICLE_CONSTANTS.MIN_SPEED +
        (PARTICLE_CONSTANTS.MAX_SPEED - PARTICLE_CONSTANTS.MIN_SPEED) *
          speedFactor *
          Math.max(0.25, intensity)
      const size = 1.2 + Math.random() * 1.8
      const segIdx = dir === 1 ? 0 : segments.length - 1
      const t0 = dir === 1 ? Math.random() * 0.08 : 1 - Math.random() * 0.08
      const shape = new Konva.Circle({
        x: 0,
        y: 0,
        radius: size,
        fill: color,
        opacity: 0.95,
        listening: false,
      })
      particleLayer!.add(shape)
      particles.push({
        pathId,
        segments,
        segIdx,
        edgeId: segments[segIdx],
        t: t0,
        dir,
        speed,
        speedFactor,
        size,
        lane,
        shape,
      })
    }
    if (n > 0) moved = true
  }

  for (const p of pathAgg) {
    if (p.up > 0.0001)
      spawnForPath(p.pathId, p.segments, 'up', p.up, 1, PARTICLE_CONSTANTS.UL_COLOR)
    if (p.down > 0.0001)
      spawnForPath(p.pathId, p.segments, 'down', p.down, -1, PARTICLE_CONSTANTS.DL_COLOR)
  }

  return moved || particles.length > 0
}

const getStageSize = () => {
  const gv = graph.value
  const stageWidth = Math.max(hostW.value || gv.width, gv.width)
  const stageHeight = Math.max(hostH.value || gv.height, gv.height)
  return { stageWidth, stageHeight }
}

const getOffsets = () => {
  if (!stage) return { offsetX: 0, offsetY: 0 }
  const gv = graph.value
  const { stageWidth, stageHeight } = getStageSize()
  const offsetX = Math.max(0, (stageWidth - gv.width) / 2)
  const offsetY = Math.max(0, (stageHeight - gv.height) / 2)
  return { offsetX, offsetY }
}

const ensureStageSize = () => {
  if (!stage) return
  const { stageWidth, stageHeight } = getStageSize()
  stage.size({ width: stageWidth, height: stageHeight })
}

const createNodeView = (n: GraphNode, baseFill: string) => {
  const { offsetX, offsetY } = getOffsets()
  const group = new Konva.Group({ x: offsetX + n.x, y: offsetY + n.y, opacity: 0 })

  // Shared rect config
  const commonRectConfig = {
    width: STYLES.nodeWidth,
    height: STYLES.nodeHeight,
    cornerRadius: 8,
  }

  const baseRect = new Konva.Rect({
    ...commonRectConfig,
    fill: baseFill,
    listening: false,
  })

  const colors = getNodeColors(n.type)
  const rect = new Konva.Rect({
    ...commonRectConfig,
    fill: colors.fill,
    stroke: colors.stroke,
    strokeWidth: 1.5,
  })

  const text = new Konva.Text({
    text: n.label,
    fontSize: 14,
    fill: colors.stroke,
    width: STYLES.nodeWidth - 16,
    height: STYLES.nodeHeight,
    align: 'center',
    verticalAlign: 'middle',
    x: 8,
  })

  group.add(baseRect, rect, text)
  nodeLayer!.add(group)

  group.to({ opacity: 1, duration: 0.22 })

  const view: NodeView = { group, baseRect, rect, text, type: n.type, label: n.label }
  nodeViews.set(n.id, view)

  // hover interactions
  group.on('mouseenter', () => {
    if (isStageDragging) return
    if (stage?.container()) stage.container().style.cursor = 'pointer'
    setHover(n.id)
  })
  group.on('mouseleave', () => {
    if (stage?.container()) stage.container().style.cursor = 'default'
    setHover(null)
  })
}

const updateNodeView = (n: GraphNode, baseFill: string) => {
  const v = nodeViews.get(n.id)
  if (!v) return createNodeView(n, baseFill)

  const { offsetX, offsetY } = getOffsets()
  const tx = offsetX + n.x
  const ty = offsetY + n.y

  if (v.label !== n.label) {
    v.text.text(n.label)
    v.label = n.label
  }

  if (v.type !== n.type) {
    const colors = getNodeColors(n.type)
    v.rect.to({ fill: colors.fill, stroke: colors.stroke, duration: 0.28 })
    v.text.to({ fill: colors.stroke, duration: 0.28 })
    v.type = n.type
  }

  v.group.to({ x: tx, y: ty, duration: 0.32 })
  v.baseRect.fill(baseFill)
}

const removeNodeView = (id: string) => {
  const v = nodeViews.get(id)
  if (!v) return
  v.group.to({
    opacity: 0,
    duration: 0.2,
    onFinish: () => v.group.destroy(),
  })
  nodeViews.delete(id)
}

const createEdgeView = (e: GraphEdge) => {
  const line = new Konva.Line({
    points: [0, 0, 0, 0, 0, 0, 0, 0],
    stroke: '#6366f1',
    strokeWidth: 0.1,
    lineCap: 'round',
    lineJoin: 'round',
    bezier: true,
    opacity: 0,
  })
  edgeLayer!.add(line)
  const view: EdgeView = { line, from: e.from, to: e.to }
  edgeViews.set(e.id, view)
}

const updateEdgeView = (e: GraphEdge, maxWeight: number) => {
  let v = edgeViews.get(e.id)
  if (!v) {
    createEdgeView(e)
    v = edgeViews.get(e.id)!
  }
  const targetWidth = scaleEdgeWidth(e.weight, maxWeight)
  v.line.to({ strokeWidth: targetWidth, opacity: 0.8, duration: 0.28 })
}

const removeEdgeView = (id: string) => {
  const v = edgeViews.get(id)
  if (!v) return
  v.line.to({
    opacity: 0,
    strokeWidth: 0.05,
    duration: 0.18,
    onFinish: () => v.line.destroy(),
  })
  edgeViews.delete(id)
}

const updateAllEdgePoints = () => {
  for (const [, v] of edgeViews) {
    const s = nodeViews.get(v.from)
    const t = nodeViews.get(v.to)
    if (!s || !t) continue
    const sx = s.group.x() + STYLES.nodeWidth
    const sy = s.group.y() + STYLES.nodeHeight / 2
    const tx = t.group.x()
    const ty = t.group.y() + STYLES.nodeHeight / 2
    const mid = (sx + tx) / 2
    const pts = [sx, sy, mid, sy, mid, ty, tx, ty]
    v.line.points(pts)
  }
  // keep particle positions glued to curves
  updateParticlePositions()
}

const syncGraph = () => {
  if (!stage || !edgeLayer || !nodeLayer) return
  ensureStageSize()

  const gv = graph.value
  // Removed getBaseFillColor – no longer needed after background rect removal

  const desiredNodeIds = new Set(gv.nodes.map((n) => n.id))
  const desiredEdgeIds = new Set(gv.edges.map((e) => e.id))

  for (const n of gv.nodes) updateNodeView(n, getBaseFillColor())
  for (const [id] of nodeViews) if (!desiredNodeIds.has(id)) removeNodeView(id)

  for (const e of gv.edges) updateEdgeView(e, gv.maxWeight)
  for (const [id] of edgeViews) if (!desiredEdgeIds.has(id)) removeEdgeView(id)

  updateAllEdgePoints()
  nodeLayer.batchDraw()
  edgeLayer.batchDraw()

  // re-apply hover visuals after graph changes
  updateRelatedNodes()
  applyHoverVisuals()
}

// Node color helper
const getNodeColors = (t: NodeType) => {
  const stroke = NODE_COLORS[t]
  return {
    fill: hexToRgba(stroke, 0.12),
    stroke,
  }
}

const scaleEdgeWidth = (w: number, maxW: number) => {
  if (maxW <= 0) return STYLES.edgeMin
  const n = Math.max(0, Math.min(1, w / maxW))
  return STYLES.edgeMin + (STYLES.edgeMax - STYLES.edgeMin) * n
}

const initStage = () => {
  if (!stageHostRef.value) return
  const { stageWidth, stageHeight } = getStageSize()
  stage = new Konva.Stage({
    container: stageHostRef.value,
    width: stageWidth,
    height: stageHeight,
    draggable: true,
  })
  edgeLayer = new Konva.Layer()
  particleLayer = new Konva.Layer()
  nodeLayer = new Konva.Layer()
  stage.add(edgeLayer, particleLayer, nodeLayer)

  // wheel zoom
  stage.on('wheel', (e) => {
    e.evt.preventDefault()
    const oldScale = stage!.scaleX()
    const pointer = stage!.getPointerPosition()
    if (!pointer) return
    const scaleBy = 1.06
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
    const clamp = Math.max(0.4, Math.min(3, newScale))
    const mousePointTo = {
      x: (pointer.x - stage!.x()) / oldScale,
      y: (pointer.y - stage!.y()) / oldScale,
    }
    stage!.scale({ x: clamp, y: clamp })
    const newPos = {
      x: pointer.x - mousePointTo.x * clamp,
      y: pointer.y - mousePointTo.y * clamp,
    }
    stage!.position(newPos)
    stage!.batchDraw()
  })

  // track dragging to avoid hover flicker
  stage.on('dragstart', () => {
    isStageDragging = true
  })
  stage.on('dragend', () => {
    isStageDragging = false
  })

  // follow node positions to keep edges connected during node tweens
  edgeFollowAnim = new Konva.Animation(() => {
    updateAllEdgePoints()
  }, edgeLayer)
  edgeFollowAnim.start()

  // particle animation loop
  particleAnim = new Konva.Animation(() => {
    pruneParticles()
    const now = performance.now()
    const active = advanceParticles(now)
    if (active) {
      updateParticlePositions()
      particleLayer!.batchDraw()
    }
  }, particleLayer)
  particleAnim.start()

  syncGraph()
}

onMounted(() => {
  initStage()
})

onBeforeUnmount(() => {
  stage?.destroy()
  stage = null
  edgeLayer = null
  nodeLayer = null
  spawnResidual.clear()
  if (edgeFollowAnim) {
    edgeFollowAnim.stop()
    edgeFollowAnim = null
  }
  if (particleAnim) {
    particleAnim.stop()
    particleAnim = null
  }
  // cleanup particles
  for (let i = particles.length - 1; i >= 0; i--) removeParticleAt(i)
})

watch(
  () => [
    graph.value.width,
    graph.value.height,
    activeConnections.value.length,
    allRules.value.length,
    proxyMap.value,
    hostW.value,
    hostH.value,
    topologyAlign.value,
  ],
  () => syncGraph(),
  { deep: true },
)

const getBaseFillColor = () => {
  const el = stageHostRef.value || containerRef.value || document.documentElement
  const st = window.getComputedStyle(el as Element)
  const bg = st.backgroundColor
  if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
    const root = window.getComputedStyle(document.documentElement)
    const v = root.getPropertyValue('--color-base-100').trim()
    return v || '#ffffff'
  }
  return bg
}
</script>
