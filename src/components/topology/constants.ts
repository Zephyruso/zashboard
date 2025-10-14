/**
 * 拓扑图常量配置模块
 * @module TopologyConstants
 */

import type { NodeType, ParticleConfig, StyleConfig, VisualConfig } from './types'

/**
 * 样式配置常量
 * 定义节点、边、布局等视觉样式参数
 */
export const STYLES: StyleConfig = {
  nodeWidth: 168,
  nodeHeight: 40,
  colSpacing: 120,
  rowSpacingMin: 26,
  sidePadding: 16,
  topPadding: 16,
  edgeMin: 1,
  edgeMax: 12,
}

/**
 * 节点类型颜色映射表
 * 为不同类型的节点定义专属颜色
 */
export const NODE_COLORS: Record<NodeType, string> = {
  client: '#3b82f6', // 蓝色 - 客户端
  rule: '#8b5cf6', // 紫色 - 规则
  group: '#10b981', // 绿色 - 代理组
  proxy: '#f59e0b', // 琥珀色 - 代理节点
}

/**
 * 视觉效果配置
 * 定义悬停、高亮等交互状态的视觉参数
 */
export const VISUAL: VisualConfig = {
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

/**
 * 粒子系统配置
 * 定义粒子动画相关参数
 */
export const PARTICLE_CONSTANTS: ParticleConfig = {
  MAX_PARTICLES: 1500,
  BASE_PPS: 2,
  MAX_PPS: 40,
  MIN_SPEED: 0.35,
  MAX_SPEED: 1.5,
  UL_COLOR: '#fb7185', // 粉红色 - 上传流量
  DL_COLOR: '#38bdf8', // 天蓝色 - 下载流量
}
