/*
 * 画布这边没有 CSS transition 可用,卡片上那几处运动只能自己推。
 *
 * 调度器是「按需」的:没有脏标记也没有在跑的动画时完全不占 rAF。这点很重要 ——
 * 一页上可能同时挂着上百个展开的组,常驻的空转循环会把省下来的 DOM 开销又还回去。
 */

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** countup.js 的默认缓动,换数字时的手感要和 DOM 版一致。 */
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : ((-Math.pow(2, -10 * t) + 1) * 1024) / 1023)

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

/* ---------- 单值补间 ---------- */

export type Tween = {
  from: number
  to: number
  start: number
  duration: number
  ease: (t: number) => number
}

export const startTween = (
  from: number,
  to: number,
  duration: number,
  ease: (t: number) => number = easeOutExpo,
): Tween => ({ from, to, start: performance.now(), duration, ease })

export const tweenValue = (tween: Tween, now: number) => {
  if (tween.duration <= 0) return tween.to

  const t = clamp01((now - tween.start) / tween.duration)

  return tween.from + (tween.to - tween.from) * tween.ease(t)
}

export const tweenDone = (tween: Tween, now: number) => now - tween.start >= tween.duration

/* ---------- 时长(对齐 DOM 版的 CSS) ---------- */

export const DURATION = {
  /** LatencyTag 的 CountUp:duration 1 */
  countUp: 1000,
  /** .latency-state-enter/leave-active:0.2s */
  tagState: 200,
  /** .latency-tag 的 color / background-color:0.35s */
  tagColor: 350,
  /** highlightFlash 0.6s 跑两遍 */
  highlight: 1200,
  /** daisyUI loading-dots 的一个周期 */
  loadingDots: 1000,
}

/* ---------- rAF 调度 ---------- */

export class RenderLoop {
  private frame = 0
  private animating = false

  constructor(private readonly draw: () => void) {}

  private readonly tick = () => {
    this.frame = 0
    this.animating = false
    this.draw()
    // draw 期间若有人报告动画还没停,就继续排下一帧。
    if (this.animating) this.requestFrame()
  }

  /** 内容变了,下一帧重绘一次。 */
  requestFrame() {
    if (this.frame) return

    this.frame = requestAnimationFrame(this.tick)
  }

  /** 由 draw 调用,声明这一帧画出来的东西还没停。 */
  markAnimating() {
    this.animating = true
  }

  /** 立刻同步重绘 —— 滚动事件里用,避免画布位置与内容不同步。 */
  drawNow() {
    if (this.frame) cancelAnimationFrame(this.frame)

    this.tick()
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0
  }
}
