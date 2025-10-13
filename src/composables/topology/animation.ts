import { ref, type Ref } from 'vue'
import type {
  Link,
  LinkTrafficAnim,
  Node,
  NodeAnim,
  ViewAnim,
} from '../../composables/topology/types'

/**
 * 缓动函数
 */
export const easeInOutCubic = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/**
 * 动画系统 Hook
 */
export function useTopologyAnimation(
  renderScale: Ref<number>,
  renderOffsetX: Ref<number>,
  renderOffsetY: Ref<number>,
  renderNodePos: Ref<Map<string, { x: number; y: number }>>,
  renderLinkTraffic: Ref<Map<string, number>>,
  renderLinkUpTraffic: Ref<Map<string, number>>,
  renderLinkDownTraffic: Ref<Map<string, number>>,
  renderMaxTraffic: Ref<number>,
) {
  const viewAnim = ref<ViewAnim | null>(null)
  const nodeAnim = ref<NodeAnim | null>(null)
  const linkTrafficAnim = ref<LinkTrafficAnim | null>(null)

  let rafId: number | null = null

  /**
   * 获取链路 ID
   */
  const getLinkId = (link: Link) => `${link.source.id}->${link.target.id}`

  /**
   * 启动动画循环
   */
  const startAnimationLoop = (onStep: () => void, advanceParticles: (now: number) => boolean) => {
    if (rafId != null) return

    const step = (now: number) => {
      let active = false

      // 视图动画
      const va = viewAnim.value
      if (va) {
        const t = Math.min(1, (now - va.start) / va.duration)
        const e = easeInOutCubic(t)
        renderScale.value = va.fromScale + (va.toScale - va.fromScale) * e
        renderOffsetX.value = va.fromX + (va.toX - va.fromX) * e
        renderOffsetY.value = va.fromY + (va.toY - va.fromY) * e
        if (t >= 1) viewAnim.value = null
        else active = true
      }

      // 节点动画
      const na = nodeAnim.value
      if (na) {
        const t = Math.min(1, (now - na.start) / na.duration)
        const e = easeInOutCubic(t)
        const current = new Map<string, { x: number; y: number }>()
        na.to.forEach((toPos, id) => {
          const fromPos = na.from.get(id) || toPos
          current.set(id, {
            x: fromPos.x + (toPos.x - fromPos.x) * e,
            y: fromPos.y + (toPos.y - fromPos.y) * e,
          })
        })
        renderNodePos.value = current
        if (t >= 1) nodeAnim.value = null
        else active = true
      }

      // 连接线流量动画
      const lta = linkTrafficAnim.value
      if (lta) {
        const t = Math.min(1, (now - lta.start) / lta.duration)
        const e = easeInOutCubic(t)
        const currentTotal = new Map<string, number>()
        const currentUp = new Map<string, number>()
        const currentDown = new Map<string, number>()
        lta.toTotal.forEach((toTraffic, linkId) => {
          const fromTraffic = lta.fromTotal.get(linkId) ?? toTraffic
          currentTotal.set(linkId, fromTraffic + (toTraffic - fromTraffic) * e)
        })
        lta.toUp.forEach((toTraffic, linkId) => {
          const fromTraffic = lta.fromUp.get(linkId) ?? toTraffic
          currentUp.set(linkId, fromTraffic + (toTraffic - fromTraffic) * e)
        })
        lta.toDown.forEach((toTraffic, linkId) => {
          const fromTraffic = lta.fromDown.get(linkId) ?? toTraffic
          currentDown.set(linkId, fromTraffic + (toTraffic - fromTraffic) * e)
        })
        renderLinkTraffic.value = currentTotal
        renderLinkUpTraffic.value = currentUp
        renderLinkDownTraffic.value = currentDown
        renderMaxTraffic.value = lta.fromMax + (lta.toMax - lta.fromMax) * e
        if (t >= 1) linkTrafficAnim.value = null
        else active = true
      }

      // 粒子动画保持循环活跃
      if (advanceParticles(now)) active = true

      onStep()

      if (active) rafId = requestAnimationFrame(step)
      else rafId = null
    }
    rafId = requestAnimationFrame(step)
  }

  /**
   * 视图动画（缩放和平移）
   */
  const animateViewTo = (toScale: number, toX: number, toY: number, duration = 220) => {
    viewAnim.value = {
      start: performance.now(),
      duration,
      fromScale: renderScale.value,
      toScale,
      fromX: renderOffsetX.value,
      toX,
      fromY: renderOffsetY.value,
      toY,
    }
    return viewAnim
  }

  /**
   * 节点位置动画
   */
  const animateNodePositions = (nodes: Ref<Node[]>, duration = 320) => {
    const to = new Map<string, { x: number; y: number }>()
    nodes.value.forEach((n) => to.set(n.id, { x: n.x, y: n.y }))

    let changed = false
    to.forEach((p, id) => {
      const cur = renderNodePos.value.get(id)
      if (!cur || Math.abs(cur.x - p.x) > 0.5 || Math.abs(cur.y - p.y) > 0.5) changed = true
    })
    if (!changed) return

    const from = new Map<string, { x: number; y: number }>()
    to.forEach((p, id) => {
      const cur = renderNodePos.value.get(id) || p
      from.set(id, { x: cur.x, y: cur.y })
    })

    nodeAnim.value = { start: performance.now(), duration, from, to }
    return nodeAnim
  }

  /**
   * 链路流量动画
   */
  const animateLinkTraffic = (links: Ref<Link[]>, maxTraffic: Ref<number>, duration = 280) => {
    const toTotal = new Map<string, number>()
    const toUp = new Map<string, number>()
    const toDown = new Map<string, number>()
    links.value.forEach((l) => {
      const id = getLinkId(l)
      toTotal.set(id, l.traffic)
      toUp.set(id, l.upTraffic)
      toDown.set(id, l.downTraffic)
    })

    // 检测是否有变化（包括归一化上限）
    let changed = false
    toTotal.forEach((traffic, id) => {
      const cur = renderLinkTraffic.value.get(id)
      if (cur === undefined || Math.abs(cur - traffic) > 0.01) changed = true
    })
    toUp.forEach((traffic, id) => {
      const cur = renderLinkUpTraffic.value.get(id)
      if (cur === undefined || Math.abs(cur - traffic) > 0.01) changed = true
    })
    toDown.forEach((traffic, id) => {
      const cur = renderLinkDownTraffic.value.get(id)
      if (cur === undefined || Math.abs(cur - traffic) > 0.01) changed = true
    })
    if (Math.abs(renderMaxTraffic.value - maxTraffic.value) > 0.01) changed = true
    if (!changed) return

    const fromTotal = new Map<string, number>()
    const fromUp = new Map<string, number>()
    const fromDown = new Map<string, number>()
    toTotal.forEach((traffic, id) => {
      const cur = renderLinkTraffic.value.get(id)
      fromTotal.set(id, cur !== undefined ? cur : traffic)
    })
    toUp.forEach((traffic, id) => {
      const cur = renderLinkUpTraffic.value.get(id)
      fromUp.set(id, cur !== undefined ? cur : traffic)
    })
    toDown.forEach((traffic, id) => {
      const cur = renderLinkDownTraffic.value.get(id)
      fromDown.set(id, cur !== undefined ? cur : traffic)
    })

    linkTrafficAnim.value = {
      start: performance.now(),
      duration,
      fromTotal,
      toTotal,
      fromUp,
      toUp,
      fromDown,
      toDown,
      fromMax: renderMaxTraffic.value,
      toMax: maxTraffic.value,
    }
    return linkTrafficAnim
  }

  /**
   * 停止动画循环
   */
  const stopAnimationLoop = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  return {
    viewAnim,
    nodeAnim,
    linkTrafficAnim,
    startAnimationLoop,
    animateViewTo,
    animateNodePositions,
    animateLinkTraffic,
    stopAnimationLoop,
  }
}
