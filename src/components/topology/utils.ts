/**
 * 拓扑图工具函数模块
 * @module TopologyUtils
 */

import Konva from 'konva'
import { NODE_COLORS, STYLES } from './constants'
import type { NodeColors, NodeType } from './types'

/**
 * 标准化名称
 * 去除字符串首尾空格
 *
 * @param s - 待标准化的字符串
 * @returns 标准化后的字符串
 */
export function normalizeName(s: string): string {
  return (s || '').trim()
}

/**
 * 将十六进制颜色转换为 RGBA 格式
 *
 * @param hex - 十六进制颜色值（如 #3b82f6）
 * @param alpha - 透明度值 (0-1)
 * @returns RGBA 颜色字符串
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = Konva.Util.getRGB(hex)
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/**
 * 获取节点颜色配置
 * 根据节点类型返回对应的填充色和描边色
 *
 * @param type - 节点类型
 * @returns 包含填充色和描边色的对象
 */
export function getNodeColors(type: NodeType): NodeColors {
  const stroke = NODE_COLORS[type]
  return {
    fill: hexToRgba(stroke, 0.12),
    stroke,
  }
}

/**
 * 计算边的宽度
 * 根据权重和最大权重值按比例缩放边的宽度
 *
 * @param weight - 边的权重值
 * @param maxWeight - 最大权重值
 * @returns 计算后的边宽度
 */
export function scaleEdgeWidth(weight: number, maxWeight: number): number {
  if (maxWeight <= 0) return STYLES.edgeMin
  const normalized = Math.max(0, Math.min(1, weight / maxWeight))
  return STYLES.edgeMin + (STYLES.edgeMax - STYLES.edgeMin) * normalized
}

/**
 * 计算贝塞尔曲线上的点坐标
 * 使用三次贝塞尔曲线公式计算参数 t 处的坐标
 *
 * @param sx - 起点 X 坐标
 * @param sy - 起点 Y 坐标
 * @param cx - 控制点 X 坐标
 * @param ex - 终点 X 坐标
 * @param ey - 终点 Y 坐标
 * @param t - 曲线参数 (0-1)
 * @returns 包含 x 和 y 坐标的对象
 */
export function bezierPoint(
  sx: number,
  sy: number,
  cx: number,
  ex: number,
  ey: number,
  t: number,
): { x: number; y: number } {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  const x = uuu * sx + 3 * uu * t * cx + 3 * u * tt * cx + ttt * ex
  const y = uuu * sy + 3 * uu * t * sy + 3 * u * tt * ey + ttt * ey
  return { x, y }
}

/**
 * 计算贝塞尔曲线的切线向量
 * 用于确定粒子在曲线上的移动方向
 *
 * @param sx - 起点 X 坐标
 * @param sy - 起点 Y 坐标
 * @param cx - 控制点 X 坐标
 * @param ex - 终点 X 坐标
 * @param ey - 终点 Y 坐标
 * @param t - 曲线参数 (0-1)
 * @returns 包含 x 和 y 分量的切线向量
 */
export function bezierTangent(
  sx: number,
  sy: number,
  cx: number,
  ex: number,
  ey: number,
  t: number,
): { x: number; y: number } {
  const u = 1 - t
  const dx = 3 * u * u * (cx - sx) + 3 * t * t * (ex - cx)
  const dy = 6 * u * t * (ey - sy)
  return { x: dx, y: dy }
}

/**
 * 获取容器背景色
 * 从 DOM 元素获取实际背景色，用于节点背景适配
 *
 * @param element - DOM 元素或 undefined
 * @returns 背景颜色值
 */
export function getBackgroundColor(element?: HTMLElement): string {
  const el = element || document.documentElement
  const style = window.getComputedStyle(el)
  const bg = style.backgroundColor

  if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
    const root = window.getComputedStyle(document.documentElement)
    const value = root.getPropertyValue('--color-base-100').trim()
    return value || '#ffffff'
  }

  return bg
}
