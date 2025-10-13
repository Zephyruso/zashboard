import { type Ref } from 'vue'
import { PARTICLE_CONSTANTS, type Link, type Particle, type ParticleLane } from './types'

const { MAX_PARTICLES, BASE_PPS, MAX_PPS, MIN_SPEED, MAX_SPEED } = PARTICLE_CONSTANTS

/**
 * 贝塞尔曲线上的点
 */
export const bezierPoint = (
  sx: number,
  sy: number,
  cx: number,
  ex: number,
  ey: number,
  t: number,
) => {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  // P0(sx,sy), P1(cx,sy), P2(cx,ey), P3(ex,ey)
  const x = uuu * sx + 3 * uu * t * cx + 3 * u * tt * cx + ttt * ex
  const y = uuu * sy + 3 * uu * t * sy + 3 * u * tt * ey + ttt * ey
  return { x, y }
}

/**
 * 贝塞尔曲线的切线
 */
export const bezierTangent = (
  sx: number,
  sy: number,
  cx: number,
  ex: number,
  ey: number,
  t: number,
) => {
  const u = 1 - t
  // Simplified derivative using P1=(cx,sy), P2=(cx,ey)
  const dxS = 3 * u * u * (cx - sx) + 3 * t * t * (ex - cx)
  const dyS = 6 * u * t * (ey - sy)
  return { x: dxS, y: dyS }
}

/**
 * 粒子系统 Hook
 */
export function useParticleSystem(
  links: Ref<Link[]>,
  renderMaxTraffic: Ref<number>,
  getRenderedTrafficUp: (link: Link) => number,
  getRenderedTrafficDown: (link: Link) => number,
  getLinkId: (link: Link) => string,
) {
  const particles: Particle[] = []
  const spawnResidual = new Map<string, number>() // key: `${linkId}|${lane}`
  let lastFrameTime = performance.now()

  /**
   * 推进粒子动画
   */
  const advanceParticles = (now: number): boolean => {
    const dt = Math.max(0.001, (now - lastFrameTime) / 1000)
    lastFrameTime = now

    if (links.value.length === 0) {
      if (particles.length > 0) {
        particles.length = 0
        return true
      }
      return false
    }

    const activeLinkIds = new Set<string>()
    for (const l of links.value) activeLinkIds.add(getLinkId(l))

    // 移除已消失链接的粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      if (!activeLinkIds.has(particles[i].linkId)) particles.splice(i, 1)
    }

    // 推进粒子
    let moved = false
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.t += p.speed * dt * p.dir
      if (p.t < 0 || p.t > 1) {
        particles.splice(i, 1)
        moved = true
        continue
      }
      moved = true
    }

    // 根据车道强度生成新粒子
    const maxDenom = renderMaxTraffic.value > 0 ? renderMaxTraffic.value : 1
    for (const link of links.value) {
      const id = getLinkId(link)
      const up = getRenderedTrafficUp(link)
      const down = getRenderedTrafficDown(link)
      const upIntensity = Math.max(0, up / maxDenom)
      const downIntensity = Math.max(0, down / maxDenom)

      const spawnForLane = (lane: ParticleLane, intensity: number, dir: 1 | -1) => {
        const key = id + '|' + lane
        const pps = BASE_PPS + MAX_PPS * intensity
        const want = pps * dt + (spawnResidual.get(key) || 0)
        let n = Math.floor(want)
        spawnResidual.set(key, want - n)
        n = Math.min(n, 8) // cap bursts
        for (let k = 0; k < n && particles.length < MAX_PARTICLES; k++) {
          const speed =
            MIN_SPEED +
            (MAX_SPEED - MIN_SPEED) * (0.5 + 0.5 * Math.random()) * Math.max(0.25, intensity)
          const size = 1.2 + Math.random() * 1.8
          const t0 = dir === 1 ? Math.random() * 0.08 : 1 - Math.random() * 0.08
          particles.push({ linkId: id, t: t0, dir, speed, size, lane })
        }
        if (n > 0) moved = true
      }

      if (upIntensity > 0.0001) spawnForLane('up', upIntensity, 1)
      if (downIntensity > 0.0001) spawnForLane('down', downIntensity, -1)
    }

    return moved || particles.length > 0
  }

  /**
   * 获取所有粒子
   */
  const getParticles = () => particles

  /**
   * 清空粒子
   */
  const clearParticles = () => {
    particles.length = 0
  }

  return {
    particles,
    advanceParticles,
    getParticles,
    clearParticles,
  }
}
