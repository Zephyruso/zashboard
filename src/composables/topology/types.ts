import type { Connection } from '@/types'

// 节点类型
export type NodeType = 'client' | 'rule' | 'group' | 'proxy'

// 节点数据结构
export interface Node {
  id: string
  label: string
  x: number
  y: number
  type: NodeType
  connections: number
  traffic: number
}

// 连接线数据结构
export interface Link {
  source: Node
  target: Node
  upTraffic: number
  downTraffic: number
  traffic: number
  connections: Connection[]
}

// 节点层级信息
export interface NodeLevel {
  name: string
  type: 'rule' | 'group' | 'proxy'
  level: number
  isGroup: boolean
}

// 视图动画状态
export interface ViewAnim {
  start: number
  duration: number
  fromScale: number
  toScale: number
  fromX: number
  toX: number
  fromY: number
  toY: number
}

// 节点动画状态
export interface NodeAnim {
  start: number
  duration: number
  from: Map<string, { x: number; y: number }>
  to: Map<string, { x: number; y: number }>
}

// 连接线流量动画状态
export interface LinkTrafficAnim {
  start: number
  duration: number
  fromTotal: Map<string, number>
  toTotal: Map<string, number>
  fromUp: Map<string, number>
  toUp: Map<string, number>
  fromDown: Map<string, number>
  toDown: Map<string, number>
  fromMax: number
  toMax: number
}

// 粒子类型
export type ParticleLane = 'up' | 'down'

// 粒子数据结构
export interface Particle {
  linkId: string
  t: number
  dir: 1 | -1 // 1: source->target (upload), -1: target->source (download)
  speed: number // in t per second
  size: number
  lane: ParticleLane
}

// 视觉状态
export interface NodeVisual {
  alpha: number
  stroke: number
}

export interface LinkVisual {
  alpha: number
}

// 布局常量
export const LAYOUT_CONSTANTS = {
  NODE_WIDTH: 180,
  NODE_HEIGHT: 50,
  COLUMN_SPACING: 300,
  ROW_SPACING: 80,
  PADDING: 50,
} as const

// 视觉常量
export const VISUAL_CONSTANTS = {
  LERP: 0.18,
  FADED_ALPHA: 0.15,
  NORMAL_ALPHA: 1,
  NORMAL_STROKE: 2,
  HIGHLIGHT_STROKE: 4,
} as const

// 粒子常量
export const PARTICLE_CONSTANTS = {
  MAX_PARTICLES: 2500,
  BASE_PPS: 2,
  MAX_PPS: 40,
  MIN_SPEED: 0.25,
  MAX_SPEED: 1.2,
  UL_COLOR: '#fb7185',
  DL_COLOR: '#38bdf8',
} as const

// 节点颜色配置
export const NODE_COLORS = {
  client: '#3b82f6', // blue
  rule: '#8b5cf6', // purple
  group: '#10b981', // green
  proxy: '#f59e0b', // amber
} as const
