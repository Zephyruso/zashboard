import { NOT_CONNECTED } from '@/constant'
import { lowLatency, mediumLatency } from '@/store/settings'
import {
  clamp01,
  DURATION,
  easeOut,
  easeOutExpo,
  startTween,
  tweenDone,
  tweenValue,
  type Tween,
} from './animations'
import { getProxyIconImage } from './icons'
import {
  BOTTOM_ROW_HEIGHT,
  CARD_RADIUS,
  cardRect,
  ICON_MARGIN,
  ICON_SIZE,
  NAME_LINE_HEIGHT,
  nameAreaWidth,
  rowAtOrAfter,
  tagRect,
  truncateText,
  type GridLayout,
} from './layout'
import { canvasColor, canvasRgb, type CanvasColorToken } from './theme'

export type NodeView = {
  name: string
  typeText: string
  icon?: string
  active: boolean
  latency: number
  testing: boolean
}

type TagState = 'loading' | 'empty' | 'value'

/*
 * 卡片上会动的东西的状态。只为「画到过的节点」建条目 —— 屏外的节点没有动画可言,
 * 等它滚进来时直接落到当前值,和 DOM 版卡片重新挂载的表现一样。
 */
type NodeAnim = {
  shownLatency: number
  latencyTween: Tween | null
  state: TagState
  prevState: TagState | null
  stateSince: number
  colorToken: CanvasColorToken
  colorFrom: CanvasColorToken | null
  colorSince: number
}

const latencyToken = (latency: number): CanvasColorToken => {
  if (latency === NOT_CONNECTED) return 'base-content'
  if (latency < lowLatency.value) return 'low-latency'
  if (latency < mediumLatency.value) return 'medium-latency'

  return 'high-latency'
}

const tagStateOf = (node: NodeView): TagState => {
  if (node.testing) return 'loading'
  if (node.latency === NOT_CONNECTED || !node.latency) return 'empty'

  return 'value'
}

// heroicons v2 outline 的 bolt,LatencyTag 空态用的就是它。
const BOLT_PATH = new Path2D('M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z')

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius)
  } else {
    const r = Math.min(radius, width / 2, height / 2)

    ctx.moveTo(x + r, y)
    ctx.arcTo(x + width, y, x + width, y + height, r)
    ctx.arcTo(x + width, y + height, x, y + height, r)
    ctx.arcTo(x, y + height, x, y, r)
    ctx.arcTo(x, y, x + width, y, r)
    ctx.closePath()
  }
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t

const mixColor = (from: CanvasColorToken, to: CanvasColorToken, t: number, alpha: number) => {
  const a = canvasRgb(from)
  const b = canvasRgb(to)

  return `rgba(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(
    lerp(a[2], b[2], t),
  )},${alpha})`
}

export type PaintOptions = {
  ctx: CanvasRenderingContext2D
  layout: GridLayout
  nodes: NodeView[]
  /** 内容坐标 → 画布坐标的偏移(画布被 sticky 钉住,内容在它下面滚) */
  offsetY: number
  viewHeight: number
  width: number
  hoverIndex: number
  hoverEnabled: boolean
  fontFamily: string
  reducedMotion: boolean
  highlightName: string
  highlightStart: number
  /** 声明这一帧之后还得继续画 */
  markAnimating: () => void
}

export class GridPainter {
  private anim = new Map<string, NodeAnim>()
  private pendingIcons = false

  /** 数据整体换掉(切组 / 重排)时清理,避免同名节点带着上一批的动画状态。 */
  reset() {
    this.anim.clear()
  }

  private syncAnim(node: NodeView, now: number, reducedMotion: boolean): NodeAnim {
    const state = tagStateOf(node)
    const token = latencyToken(node.latency)
    let entry = this.anim.get(node.name)

    if (!entry) {
      // 第一次画到:直接落在当前值,不做入场动画。
      entry = {
        shownLatency: node.latency === NOT_CONNECTED ? 0 : node.latency,
        latencyTween: null,
        state,
        prevState: null,
        stateSince: now,
        colorToken: token,
        colorFrom: null,
        colorSince: now,
      }
      this.anim.set(node.name, entry)

      return entry
    }

    if (entry.state !== state) {
      entry.prevState = reducedMotion ? null : entry.state
      entry.state = state
      entry.stateSince = now
    }

    if (entry.colorToken !== token) {
      entry.colorFrom = reducedMotion ? null : entry.colorToken
      entry.colorToken = token
      entry.colorSince = now
    }

    // 测速中不改数字 —— 那会儿标签显示的是 loading,滚到一半的数没人看得见。
    if (state === 'value') {
      const target = entry.latencyTween?.to ?? entry.shownLatency

      if (target !== node.latency) {
        entry.latencyTween = reducedMotion
          ? null
          : startTween(entry.shownLatency, node.latency, DURATION.countUp, easeOutExpo)
        if (reducedMotion) entry.shownLatency = node.latency
      }
    }

    return entry
  }

  draw(options: PaintOptions) {
    const { ctx, layout, nodes, offsetY, viewHeight, width } = options
    const now = performance.now()

    this.pendingIcons = false
    const nameFont = `${14}px ${options.fontFamily}`
    const typeFont = `${12}px ${options.fontFamily}`

    ctx.clearRect(0, 0, width, viewHeight)

    if (!nodes.length || layout.rowCount === 0) return

    const first = rowAtOrAfter(layout, offsetY)

    for (let row = first; row < layout.rowCount; row++) {
      if (layout.rowTops[row] >= offsetY + viewHeight) break

      for (let col = 0; col < layout.columns; col++) {
        const index = row * layout.columns + col

        if (index >= nodes.length) break

        this.drawCard(options, index, offsetY, now, nameFont, typeFont)
      }
    }

    // 高亮描边画在所有卡片之上,免得被相邻卡片的底色盖住。
    this.drawHighlight(options, offsetY, now)
  }

  private drawCard(
    options: PaintOptions,
    index: number,
    offsetY: number,
    now: number,
    nameFont: string,
    typeFont: string,
  ) {
    const { ctx, layout, nodes, hoverIndex, hoverEnabled, reducedMotion } = options
    const node = nodes[index]
    const rect = cardRect(layout, index)
    const y = rect.y - offsetY
    const hovered = hoverEnabled && hoverIndex === index
    const { padding } = layout.metrics

    ctx.save()

    // 底色分支与 ProxyNodeCard 的 cardClass 一一对应。
    if (hovered) {
      ctx.shadowColor = 'rgba(0,0,0,0.08)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetY = 1
    }

    roundRect(ctx, rect.x, y, rect.width, rect.height, CARD_RADIUS)
    ctx.fillStyle = node.active
      ? canvasColor('primary', hovered ? 0.95 : 0.85)
      : hovered
        ? canvasColor('base-300', 0.5)
        : canvasColor('base-200')
    ctx.fill()
    ctx.restore()

    const contentColor: CanvasColorToken = node.active ? 'primary-content' : 'base-content'
    const innerWidth = rect.width - padding * 2

    /* 名称行 */
    ctx.font = nameFont
    ctx.textBaseline = 'middle'
    ctx.fillStyle = canvasColor(contentColor)

    let textX = rect.x + padding

    if (node.icon) {
      const image = getProxyIconImage(node.icon, canvasColor(contentColor))

      if (image) {
        // -mt-[2px] align-middle:图标比文字基线略高一点。
        ctx.drawImage(
          image,
          textX,
          y + padding + (NAME_LINE_HEIGHT - ICON_SIZE) / 2 - 2,
          ICON_SIZE,
          ICON_SIZE,
        )
      } else {
        this.pendingIcons = true
      }

      textX += ICON_SIZE + ICON_MARGIN
    }

    const nameWidth = nameAreaWidth(rect.width, layout.metrics, Boolean(node.icon))
    const lines = layout.nameLines?.[index] ?? [truncateText(ctx, node.name, nameWidth)]

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], textX, y + padding + i * NAME_LINE_HEIGHT + NAME_LINE_HEIGHT / 2)
    }

    /* 底行:类型描述 + 延迟标签 */
    const bottomTop = y + rect.height - padding - BOTTOM_ROW_HEIGHT
    const bottomMiddle = bottomTop + BOTTOM_ROW_HEIGHT / 2

    ctx.font = typeFont
    ctx.fillStyle = node.active ? canvasColor('primary-content') : canvasColor('base-content', 0.6)
    // tracking-tight
    if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.3px'
    ctx.fillText(
      truncateText(ctx, node.typeText, Math.max(0, innerWidth - layout.metrics.tagWidth - 4)),
      rect.x + padding,
      bottomMiddle,
    )
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'

    this.drawLatencyTag(options, node, tagRect(layout, { ...rect, y }), now, reducedMotion)
  }

  private drawLatencyTag(
    options: PaintOptions,
    node: NodeView,
    tag: { x: number; y: number; width: number; height: number },
    now: number,
    reducedMotion: boolean,
  ) {
    const { ctx, layout, fontFamily, markAnimating } = options
    const entry = this.syncAnim(node, now, reducedMotion)

    roundRect(ctx, tag.x, tag.y, tag.width, tag.height, layout.metrics.tagRadius)
    ctx.fillStyle = canvasColor('base-100')
    ctx.fill()

    // 标签配色 0.35s 过渡,对齐 .latency-tag 的 transition。
    let color = canvasColor(entry.colorToken)

    if (entry.colorFrom) {
      const t = clamp01((now - entry.colorSince) / DURATION.tagColor)

      color = mixColor(entry.colorFrom, entry.colorToken, easeOut(t), 1)
      if (t < 1) markAnimating()
      else entry.colorFrom = null
    }

    const centerX = tag.x + tag.width / 2
    const centerY = tag.y + tag.height / 2
    const stateT = reducedMotion ? 1 : clamp01((now - entry.stateSince) / DURATION.tagState)

    if (entry.prevState && stateT < 1) {
      // 旧态淡出、新态淡入,和 .latency-state-enter/leave 的 opacity + scale 一致。
      this.drawTagState(ctx, entry.prevState, entry, centerX, centerY, color, fontFamily, {
        opacity: 1 - stateT,
        scale: 1 - 0.4 * stateT,
        now,
      })
      markAnimating()
    } else if (entry.prevState) {
      entry.prevState = null
    }

    this.drawTagState(ctx, entry.state, entry, centerX, centerY, color, fontFamily, {
      opacity: entry.prevState ? stateT : 1,
      scale: entry.prevState ? 0.6 + 0.4 * stateT : 1,
      now,
    })

    if (entry.state === 'loading') markAnimating()
  }

  private drawTagState(
    ctx: CanvasRenderingContext2D,
    state: TagState,
    entry: NodeAnim,
    centerX: number,
    centerY: number,
    color: string,
    fontFamily: string,
    view: { opacity: number; scale: number; now: number },
  ) {
    if (view.opacity <= 0.01) return

    ctx.save()
    ctx.globalAlpha = view.opacity
    ctx.translate(centerX, centerY)
    ctx.scale(view.scale, view.scale)

    if (state === 'loading') {
      // daisyUI loading-dots 的三点脉冲
      ctx.fillStyle = canvasColor('base-content', 0.8)
      for (let i = 0; i < 3; i++) {
        const phase = ((view.now / DURATION.loadingDots + i / 3) % 1) * Math.PI * 2
        const scale = 0.6 + 0.4 * (Math.sin(phase) * 0.5 + 0.5)

        ctx.beginPath()
        ctx.arc((i - 1) * 5, 0, 1.6 * scale, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (state === 'empty') {
      // BoltIcon,h-3 w-3 的描边图标
      ctx.save()
      ctx.scale(0.5, 0.5)
      ctx.translate(-12, -12)
      ctx.strokeStyle = canvasColor('base-content')
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke(BOLT_PATH)
      ctx.restore()
    } else {
      const tween = entry.latencyTween

      if (tween) {
        entry.shownLatency = tweenValue(tween, view.now)
        if (tweenDone(tween, view.now)) {
          entry.shownLatency = tween.to
          entry.latencyTween = null
        }
      }

      ctx.font = `12px ${fontFamily}`
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(Math.round(entry.shownLatency)), 0, 0)
      ctx.textAlign = 'left'
    }

    ctx.restore()
  }

  /** 测速后的定位提示,复刻 motion.css 里的 highlightFlash(0.6s ease-out 跑两遍)。 */
  private drawHighlight(options: PaintOptions, offsetY: number, now: number) {
    const { ctx, layout, nodes, highlightName, highlightStart, reducedMotion, markAnimating } =
      options

    if (!highlightName || reducedMotion) return

    const index = nodes.findIndex((node) => node.name === highlightName)

    if (index < 0) return

    const elapsed = now - highlightStart

    if (elapsed >= DURATION.highlight) return

    markAnimating()

    const rect = cardRect(layout, index)
    const y = rect.y - offsetY

    if (y + rect.height < 0 || y > options.viewHeight) return

    // 0% → 0px/100%,50% → 4px/30%,100% → 0px/0%
    const u = (elapsed % (DURATION.highlight / 2)) / (DURATION.highlight / 2)
    const half = u < 0.5 ? u / 0.5 : (u - 0.5) / 0.5
    const spread = u < 0.5 ? lerp(0, 4, half) : lerp(4, 0, half)
    const alpha = u < 0.5 ? lerp(1, 0.3, half) : lerp(0.3, 0, half)

    if (spread <= 0.1) return

    ctx.save()
    ctx.strokeStyle = canvasColor('primary', alpha)
    ctx.lineWidth = spread
    roundRect(
      ctx,
      rect.x - spread / 2,
      y - spread / 2,
      rect.width + spread,
      rect.height + spread,
      CARD_RADIUS + spread / 2,
    )
    ctx.stroke()
    ctx.restore()
  }

  /** 有图标还没加载完就返回 true,组件据此在加载完成后重绘。 */
  get hasPendingIcons() {
    return this.pendingIcons
  }
}
