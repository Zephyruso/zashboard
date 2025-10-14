/**
 * 粒子系统管理器
 * 负责拓扑图中流量粒子的生成、移动和渲染
 * @module ParticleSystem
 */

import type { Connection } from '@/types'
import Konva from 'konva'
import { PARTICLE_CONSTANTS, STYLES } from './constants'
import type { EdgeView, NodeView, Particle, ParticleLane, PathTraffic } from './types'
import { bezierPoint, bezierTangent } from './utils'

/**
 * 粒子系统管理器类
 * 遵循单一职责原则：仅负责粒子动画的管理
 */
export class ParticleSystem {
  private particles: Particle[] = []
  private spawnResiduals = new Map<string, number>()
  private lastUpdateTime = performance.now()
  private animation: Konva.Animation | null = null

  /**
   * 构造函数
   *
   * @param particleLayer - Konva 粒子图层
   * @param getNodeViews - 获取节点视图的函数
   * @param getEdgeViews - 获取边视图的函数
   * @param makeNodeSequence - 从连接构建节点序列的函数
   */
  constructor(
    private particleLayer: Konva.Layer,
    private getNodeViews: () => Map<string, NodeView>,
    private getEdgeViews: () => Map<string, EdgeView>,
    private makeNodeSequence: (conn: Connection) => string[],
  ) {}

  /**
   * 启动粒子动画
   *
   * @param connections - 连接列表的 getter
   * @param edgeIds - 边 ID 集合的 getter
   */
  start(connections: () => Connection[], edgeIds: () => Set<string>): void {
    this.animation = new Konva.Animation(() => {
      this.pruneInvalidParticles(edgeIds())
      const now = performance.now()
      const isActive = this.advanceParticles(now, connections())
      if (isActive) {
        this.updateParticlePositions()
        this.particleLayer.batchDraw()
      }
    }, this.particleLayer)

    this.animation.start()
  }

  /**
   * 停止粒子动画
   */
  stop(): void {
    if (this.animation) {
      this.animation.stop()
      this.animation = null
    }
  }

  /**
   * 应用粒子悬停效果
   *
   * @param hoveredNodeId - 当前悬停的节点 ID
   * @param edgeAlphaMap - 边透明度映射表
   */
  applyHoverEffect(hoveredNodeId: string | null, edgeAlphaMap: Map<string, number>): void {
    for (const particle of this.particles) {
      const targetAlpha = edgeAlphaMap.get(particle.edgeId)
      const finalAlpha = targetAlpha !== undefined ? targetAlpha : hoveredNodeId ? 0.1 : 0.95

      particle.shape.to({ opacity: finalAlpha, duration: 0.18 })
    }

    this.particleLayer.batchDraw()
  }

  /**
   * 获取当前粒子数量
   *
   * @returns 粒子数量
   */
  getParticleCount(): number {
    return this.particles.length
  }

  /**
   * 销毁粒子系统
   * 清理所有粒子和资源
   */
  destroy(): void {
    this.stop()

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.removeParticleAt(i)
    }

    this.spawnResiduals.clear()
  }

  /**
   * 移除指定索引的粒子
   *
   * @param index - 粒子索引
   * @private
   */
  private removeParticleAt(index: number): void {
    const particle = this.particles[index]
    if (!particle) return

    particle.shape.destroy()
    this.particles.splice(index, 1)
  }

  /**
   * 清理无效粒子（对应的边已不存在）
   *
   * @param validEdgeIds - 有效的边 ID 集合
   * @private
   */
  private pruneInvalidParticles(validEdgeIds: Set<string>): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!validEdgeIds.has(this.particles[i].edgeId)) {
        this.removeParticleAt(i)
      }
    }
  }

  /**
   * 推进粒子位置和生成新粒子
   *
   * @param now - 当前时间戳
   * @param connections - 连接列表
   * @returns 是否有活跃粒子
   * @private
   */
  private advanceParticles(now: number, connections: Connection[]): boolean {
    const deltaTime = Math.max(0.001, (now - this.lastUpdateTime) / 1000)
    this.lastUpdateTime = now

    const edgeViews = this.getEdgeViews()
    if (edgeViews.size === 0) {
      if (this.particles.length > 0) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
          this.removeParticleAt(i)
        }
        return true
      }
      return false
    }

    // 聚合路径流量数据
    const pathTrafficList = this.aggregatePathTraffic(connections)
    const intensityMap = new Map(pathTrafficList.map((p) => [p.pathId, { up: p.up, down: p.down }]))

    // 移动现有粒子
    let hasActivity = this.moveParticles(deltaTime, intensityMap)

    // 生成新粒子
    hasActivity = this.spawnNewParticles(pathTrafficList, deltaTime) || hasActivity

    return hasActivity
  }

  /**
   * 移动现有粒子
   *
   * @param deltaTime - 时间增量（秒）
   * @param intensityMap - 路径流量强度映射
   * @returns 是否有粒子移动
   * @private
   */
  private moveParticles(
    deltaTime: number,
    intensityMap: Map<string, { up: number; down: number }>,
  ): boolean {
    let hasMoved = false

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      const intensity = intensityMap.get(particle.pathId)
      const laneIntensity = particle.lane === 'up' ? (intensity?.up ?? 0) : (intensity?.down ?? 0)
      const clampedIntensity = Math.max(0.25, laneIntensity)

      // 计算新速度（只增不减）
      const candidateSpeed =
        PARTICLE_CONSTANTS.MIN_SPEED +
        (PARTICLE_CONSTANTS.MAX_SPEED - PARTICLE_CONSTANTS.MIN_SPEED) *
          particle.speedFactor *
          clampedIntensity

      if (candidateSpeed > particle.speed) {
        particle.speed = candidateSpeed
      }

      // 更新位置
      particle.t += particle.speed * deltaTime * particle.dir

      // 处理跨段移动
      while (particle.t < 0 || particle.t > 1) {
        if (particle.dir > 0 && particle.t > 1) {
          particle.segIdx += 1
          particle.t -= 1
        } else if (particle.dir < 0 && particle.t < 0) {
          particle.segIdx -= 1
          particle.t += 1
        } else {
          break
        }

        // 粒子超出路径范围，移除
        if (particle.segIdx < 0 || particle.segIdx >= particle.segments.length) {
          this.removeParticleAt(i)
          hasMoved = true
          break
        }

        particle.edgeId = particle.segments[particle.segIdx]
      }

      if (this.particles[i] === particle) {
        hasMoved = true
      }
    }

    return hasMoved
  }

  /**
   * 生成新粒子
   *
   * @param pathTrafficList - 路径流量列表
   * @param deltaTime - 时间增量（秒）
   * @returns 是否生成了新粒子
   * @private
   */
  private spawnNewParticles(pathTrafficList: PathTraffic[], deltaTime: number): boolean {
    let hasSpawned = false

    for (const pathTraffic of pathTrafficList) {
      if (pathTraffic.up > 0.0001) {
        hasSpawned =
          this.spawnParticlesForLane(
            pathTraffic.pathId,
            pathTraffic.segments,
            'up',
            pathTraffic.up,
            1,
            PARTICLE_CONSTANTS.UL_COLOR,
            deltaTime,
          ) || hasSpawned
      }

      if (pathTraffic.down > 0.0001) {
        hasSpawned =
          this.spawnParticlesForLane(
            pathTraffic.pathId,
            pathTraffic.segments,
            'down',
            pathTraffic.down,
            -1,
            PARTICLE_CONSTANTS.DL_COLOR,
            deltaTime,
          ) || hasSpawned
      }
    }

    return hasSpawned
  }

  /**
   * 为指定通道生成粒子
   *
   * @param pathId - 路径 ID
   * @param segments - 边序列
   * @param lane - 通道类型
   * @param intensity - 流量强度
   * @param direction - 移动方向
   * @param color - 粒子颜色
   * @param deltaTime - 时间增量
   * @returns 是否生成了粒子
   * @private
   */
  private spawnParticlesForLane(
    pathId: string,
    segments: string[],
    lane: ParticleLane,
    intensity: number,
    direction: 1 | -1,
    color: string,
    deltaTime: number,
  ): boolean {
    if (!segments.length) return false

    const key = `${pathId}|${lane}`
    const particlesPerSecond = PARTICLE_CONSTANTS.BASE_PPS + PARTICLE_CONSTANTS.MAX_PPS * intensity
    const wantedCount = particlesPerSecond * deltaTime + (this.spawnResiduals.get(key) || 0)
    let spawnCount = Math.floor(wantedCount)

    this.spawnResiduals.set(key, wantedCount - spawnCount)
    spawnCount = Math.min(spawnCount, 10) // 限制每帧生成数量

    let spawned = false

    for (
      let i = 0;
      i < spawnCount && this.particles.length < PARTICLE_CONSTANTS.MAX_PARTICLES;
      i++
    ) {
      const speedFactor = 0.5 + 0.5 * Math.random()
      const speed =
        PARTICLE_CONSTANTS.MIN_SPEED +
        (PARTICLE_CONSTANTS.MAX_SPEED - PARTICLE_CONSTANTS.MIN_SPEED) *
          speedFactor *
          Math.max(0.25, intensity)

      const size = 1.2 + Math.random() * 1.8
      const segmentIndex = direction === 1 ? 0 : segments.length - 1
      const initialT = direction === 1 ? Math.random() * 0.08 : 1 - Math.random() * 0.08

      const shape = new Konva.Circle({
        x: 0,
        y: 0,
        radius: size,
        fill: color,
        opacity: 0.95,
        listening: false,
      })

      this.particleLayer.add(shape)

      this.particles.push({
        pathId,
        segments,
        segIdx: segmentIndex,
        edgeId: segments[segmentIndex],
        t: initialT,
        dir: direction,
        speed,
        speedFactor,
        size,
        lane,
        shape,
      })

      spawned = true
    }

    return spawned
  }

  /**
   * 更新所有粒子的渲染位置
   * @private
   */
  private updateParticlePositions(): void {
    const stage = this.particleLayer.getStage()
    const scale = stage?.scaleX() || 1

    for (const particle of this.particles) {
      const curveParams = this.getEdgeCurveParams(particle.edgeId)
      if (!curveParams) continue

      const { sx, sy, cx, ex, ey, width } = curveParams
      const laneOffset = Math.min((width || 1) * 0.25, 10)

      // 计算贝塞尔曲线上的点和切线
      const point = bezierPoint(sx, sy, cx, ex, ey, particle.t)
      const tangent = bezierTangent(sx, sy, cx, ex, ey, particle.t)

      // 计算法向量
      const length = Math.hypot(tangent.x, tangent.y) || 1
      const normalX = -tangent.y / length
      const normalY = tangent.x / length

      // 根据通道偏移粒子位置
      const side = particle.lane === 'up' ? 1 : -1
      particle.shape.x(point.x + normalX * laneOffset * side)
      particle.shape.y(point.y + normalY * laneOffset * side)
      particle.shape.radius(particle.size * Math.max(1, Math.sqrt(scale)))
    }
  }

  /**
   * 获取边的曲线参数
   *
   * @param edgeId - 边 ID
   * @returns 曲线参数对象或 null
   * @private
   */
  private getEdgeCurveParams(
    edgeId: string,
  ): { sx: number; sy: number; cx: number; ex: number; ey: number; width: number } | null {
    const edgeView = this.getEdgeViews().get(edgeId)
    if (!edgeView) return null

    const sourceNode = this.getNodeViews().get(edgeView.from)
    const targetNode = this.getNodeViews().get(edgeView.to)
    if (!sourceNode || !targetNode) return null

    const sx = sourceNode.group.x() + STYLES.nodeWidth
    const sy = sourceNode.group.y() + STYLES.nodeHeight / 2
    const ex = targetNode.group.x()
    const ey = targetNode.group.y() + STYLES.nodeHeight / 2
    const cx = (sx + ex) / 2
    const width = edgeView.line.strokeWidth()

    return { sx, sy, cx, ex, ey, width }
  }

  /**
   * 聚合路径流量数据
   * 将多个连接的流量按路径聚合，并归一化
   *
   * @param connections - 连接列表
   * @returns 路径流量数据列表
   * @private
   */
  private aggregatePathTraffic(connections: Connection[]): PathTraffic[] {
    if (!connections.length) return []

    // 找出最大上传和下载速度用于归一化
    let maxUpload = 0
    let maxDownload = 0

    for (const conn of connections) {
      if (conn.uploadSpeed > maxUpload) maxUpload = conn.uploadSpeed
      if (conn.downloadSpeed > maxDownload) maxDownload = conn.downloadSpeed
    }

    const uploadDenom = Math.max(1, maxUpload)
    const downloadDenom = Math.max(1, maxDownload)

    // 按路径聚合流量
    const pathMap = new Map<string, { segments: string[]; up: number; down: number }>()

    for (const conn of connections) {
      const nodeSeq = this.makeNodeSequence(conn)
      const edgeSeq = this.makeEdgeSequence(nodeSeq)

      if (!edgeSeq.length) continue

      const pathId = nodeSeq.join('->')
      const existing = pathMap.get(pathId) || { segments: edgeSeq, up: 0, down: 0 }

      existing.up += Math.max(0, conn.uploadSpeed / uploadDenom)
      existing.down += Math.max(0, conn.downloadSpeed / downloadDenom)

      pathMap.set(pathId, existing)
    }

    // 转换为数组并限制强度在 [0, 1]
    const result: PathTraffic[] = []
    for (const [pathId, data] of pathMap) {
      result.push({
        pathId,
        segments: data.segments,
        up: Math.min(1, data.up),
        down: Math.min(1, data.down),
      })
    }

    return result
  }

  /**
   * 从节点序列生成边序列
   *
   * @param nodeSeq - 节点 ID 序列
   * @returns 边 ID 序列
   * @private
   */
  private makeEdgeSequence(nodeSeq: string[]): string[] {
    const edgeIds = new Set(Array.from(this.getEdgeViews().keys()))
    const result: string[] = []

    for (let i = 0; i < nodeSeq.length - 1; i++) {
      const edgeId = `${nodeSeq[i]}->${nodeSeq[i + 1]}`
      if (edgeIds.has(edgeId)) {
        result.push(edgeId)
      }
    }

    return result
  }
}
