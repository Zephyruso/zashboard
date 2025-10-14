/**
 * 拓扑图类型定义模块
 * @module TopologyTypes
 */

import type Konva from 'konva'

/**
 * 节点类型枚举
 * @typedef {'client' | 'rule' | 'group' | 'proxy'} NodeType
 */
export type NodeType = 'client' | 'rule' | 'group' | 'proxy'

/**
 * 粒子流向类型
 * @typedef {'up' | 'down'} ParticleLane
 */
export type ParticleLane = 'up' | 'down'

/**
 * 图形节点数据结构
 * @interface GraphNode
 */
export interface GraphNode {
  /** 节点唯一标识符 */
  id: string
  /** 节点显示标签 */
  label: string
  /** 节点类型 */
  type: NodeType
  /** 节点所在列 */
  col: number
  /** 节点 X 坐标 */
  x: number
  /** 节点 Y 坐标 */
  y: number
}

/**
 * 图形边数据结构
 * @interface GraphEdge
 */
export interface GraphEdge {
  /** 边唯一标识符 */
  id: string
  /** 起始节点 ID */
  from: string
  /** 目标节点 ID */
  to: string
  /** 边的权重（流量总和） */
  weight: number
  /** 上传流量 */
  up: number
  /** 下载流量 */
  down: number
}

/**
 * 完整图形数据结构
 * @interface GraphData
 */
export interface GraphData {
  /** 图形总宽度 */
  width: number
  /** 图形总高度 */
  height: number
  /** 所有节点 */
  nodes: GraphNode[]
  /** 所有边 */
  edges: GraphEdge[]
  /** 最大权重值 */
  maxWeight: number
}

/**
 * 节点视图对象
 * @interface NodeView
 */
export interface NodeView {
  /** 背景矩形 */
  baseRect: Konva.Rect
  /** 节点组容器 */
  group: Konva.Group
  /** 前景矩形 */
  rect: Konva.Rect
  /** 文本对象 */
  text: Konva.Text
  /** 节点类型 */
  type: NodeType
  /** 节点标签 */
  label: string
}

/**
 * 边视图对象
 * @interface EdgeView
 */
export interface EdgeView {
  /** 线条对象 */
  line: Konva.Line
  /** 起始节点 ID */
  from: string
  /** 目标节点 ID */
  to: string
}

/**
 * 粒子对象
 * @interface Particle
 */
export interface Particle {
  /** 粒子所属路径 ID */
  pathId: string
  /** 路径包含的边序列 */
  segments: string[]
  /** 当前所在边的索引 */
  segIdx: number
  /** 当前所在边的 ID */
  edgeId: string
  /** 当前在边上的位置参数 (0-1) */
  t: number
  /** 移动方向 (1: 正向, -1: 反向) */
  dir: 1 | -1
  /** 当前速度 */
  speed: number
  /** 速度因子 */
  speedFactor: number
  /** 粒子大小 */
  size: number
  /** 粒子通道（上传/下载） */
  lane: ParticleLane
  /** Konva 圆形对象 */
  shape: Konva.Circle
}

/**
 * 路径流量数据
 * @interface PathTraffic
 */
export interface PathTraffic {
  /** 路径 ID */
  pathId: string
  /** 路径包含的边序列 */
  segments: string[]
  /** 上传流量强度 (0-1) */
  up: number
  /** 下载流量强度 (0-1) */
  down: number
}

/**
 * 样式配置常量
 * @interface StyleConfig
 */
export interface StyleConfig {
  /** 节点宽度 */
  nodeWidth: number
  /** 节点高度 */
  nodeHeight: number
  /** 列间距 */
  colSpacing: number
  /** 最小行间距 */
  rowSpacingMin: number
  /** 侧边内边距 */
  sidePadding: number
  /** 顶部内边距 */
  topPadding: number
  /** 边最小宽度 */
  edgeMin: number
  /** 边最大宽度 */
  edgeMax: number
}

/**
 * 视觉效果配置
 * @interface VisualConfig
 */
export interface VisualConfig {
  /** 节点淡化透明度 */
  NODE_FADED_OPACITY: number
  /** 节点正常透明度 */
  NODE_NORMAL_OPACITY: number
  /** 节点高亮描边宽度 */
  NODE_HIGHLIGHT_STROKE: number
  /** 节点正常描边宽度 */
  NODE_NORMAL_STROKE: number
  /** 边默认颜色 */
  EDGE_DEFAULT_COLOR: string
  /** 边高亮颜色 */
  EDGE_HIGHLIGHT_COLOR: string
  /** 边无关透明度 */
  EDGE_UNRELATED_OPACITY: number
  /** 边相关透明度 */
  EDGE_RELATED_OPACITY: number
  /** 边高亮透明度 */
  EDGE_HIGHLIGHT_OPACITY: number
  /** 边正常透明度 */
  EDGE_NORMAL_OPACITY: number
}

/**
 * 粒子系统配置
 * @interface ParticleConfig
 */
export interface ParticleConfig {
  /** 最大粒子数量 */
  MAX_PARTICLES: number
  /** 基础粒子生成速率（个/秒） */
  BASE_PPS: number
  /** 最大粒子生成速率（个/秒） */
  MAX_PPS: number
  /** 最小移动速度 */
  MIN_SPEED: number
  /** 最大移动速度 */
  MAX_SPEED: number
  /** 上传流量颜色 */
  UL_COLOR: string
  /** 下载流量颜色 */
  DL_COLOR: string
}

/**
 * 节点颜色配置
 * @interface NodeColors
 */
export interface NodeColors {
  /** 填充色 */
  fill: string
  /** 描边色 */
  stroke: string
}
