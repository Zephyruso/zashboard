import { ref } from 'vue'

/*
 * 画布拿不到 CSS 类,只能自己把设计令牌解析成能塞进 fillStyle 的颜色。
 *
 * 不直接把 var() 的原值丢给 canvas:daisyUI 的主题写的是 oklch(),而 canvas 的
 * CSS Color 4 支持比 CSS 本身晚一截,赋值失败时 fillStyle 会静默保留上一个颜色 ——
 * 画错色比报错更难查。这里统一归一化成 rgba() 字符串。
 *
 * 取值一律经过一个挂在 document.body 里的探针元素,而不是直接读某个元素上的自定义属性:
 *   - 主题挂在 <body> 上(App.vue 的 setAttribute('data-theme', …)),读 documentElement
 *     会整套落空,拿到的是 daisyUI 的默认调色板而不是当前主题;
 *   - 延迟三色压根没有作为 CSS 变量声明过 —— 只有 tailwind.config.ts 里
 *     `var(--color-low-latency, …)` 那份兜底值(仅中性主题在 tokens.css 里覆盖它),
 *     所以必须带着同一份兜底一起求值;
 *   - 顺带让浏览器把 #hex / 具名色 / hsl()(自定义主题里什么写法都有)折算成 rgb(),
 *     只剩它原样保留的 oklch() 需要自己换算。
 */

/** 节点网格用到的设计令牌,对应 CSS 上的 --color-<token>。 */
export type CanvasColorToken =
  | 'primary'
  | 'primary-content'
  | 'base-100'
  | 'base-200'
  | 'base-300'
  | 'base-content'
  | 'low-latency'
  | 'medium-latency'
  | 'high-latency'

type Rgb = [number, number, number]

// 主题一变这个数就加一,组件 watch 它来重新取色并重绘。
export const canvasThemeVersion = ref(0)

const resolved = new Map<CanvasColorToken, Rgb>()
const stringCache = new Map<string, string>()

const clamp255 = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

const linearToSrgb = (value: number) =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055

// oklch → oklab → LMS → 线性 sRGB → sRGB,系数取自 Björn Ottosson 的 Oklab 定义。
const oklchToRgb = (l: number, c: number, hDeg: number): Rgb => {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)

  const lm = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sm = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    clamp255(linearToSrgb(4.0767416621 * lm - 3.3077115913 * mm + 0.2309699292 * sm) * 255),
    clamp255(linearToSrgb(-1.2684380046 * lm + 2.6097574011 * mm - 0.3413193965 * sm) * 255),
    clamp255(linearToSrgb(-0.0041960863 * lm - 0.7034186147 * mm + 1.707614701 * sm) * 255),
  ]
}

const numberAt = (parts: string[], index: number, percentBase: number) => {
  const raw = parts[index]

  if (!raw || raw === 'none') return 0
  if (raw.endsWith('%')) return (parseFloat(raw) / 100) * percentBase

  return parseFloat(raw) || 0
}

const parseColor = (value: string): Rgb | null => {
  const text = value.trim()

  if (text.startsWith('oklch')) {
    // oklch(L C H) / oklch(L C H / A),alpha 这里不要 —— 令牌本身都是不透明的。
    const parts = text
      .slice(text.indexOf('(') + 1, text.lastIndexOf(')'))
      .split('/')[0]
      .trim()
      .split(/[\s,]+/)

    return oklchToRgb(numberAt(parts, 0, 1), numberAt(parts, 1, 0.4), numberAt(parts, 2, 1))
  }

  const rgbMatch = text.match(/^rgba?\(([^)]+)\)$/)

  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split('/')[0]
      .trim()
      .split(/[\s,]+/)

    return [
      clamp255(numberAt(parts, 0, 255)),
      clamp255(numberAt(parts, 1, 255)),
      clamp255(numberAt(parts, 2, 255)),
    ]
  }

  return null
}

/*
 * 每个令牌求值时用的表达式。延迟三色的兜底必须和 tailwind.config.ts 里那份逐字一致 ——
 * 它们只在中性主题下才真的有 --color-*-latency,其余主题全靠这个 fallback。
 */
const EXPRESSION: Record<CanvasColorToken, string> = {
  primary: 'var(--color-primary)',
  'primary-content': 'var(--color-primary-content)',
  'base-100': 'var(--color-base-100)',
  'base-200': 'var(--color-base-200)',
  'base-300': 'var(--color-base-300)',
  'base-content': 'var(--color-base-content)',
  'low-latency': 'var(--color-low-latency, oklch(0.66 0.1 160))',
  'medium-latency': 'var(--color-medium-latency, rgb(255, 197, 4))',
  'high-latency': 'var(--color-high-latency, rgb(244, 96, 108))',
}

let probe: HTMLElement | null = null

// 探针挂在 body 里,才能继承到 body 上的 data-theme。
const probeColor = (expression: string) => {
  if (!probe) {
    probe = document.createElement('span')
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;pointer-events:none'
    document.body.appendChild(probe)
  }

  probe.style.color = ''
  probe.style.color = expression

  return getComputedStyle(probe).color
}

const FALLBACK: Rgb = [128, 128, 128]

const resolveToken = (token: CanvasColorToken): Rgb => {
  const cached = resolved.get(token)

  if (cached) return cached

  const value = parseColor(probeColor(EXPRESSION[token])) ?? FALLBACK

  resolved.set(token, value)

  return value
}

/** 令牌的 sRGB 分量,给需要在两个颜色之间插值的地方(延迟标签换色)用。 */
export const canvasRgb = (token: CanvasColorToken) => resolveToken(token)

/** 令牌 + 不透明度 → canvas 能用的 rgba()。对应 Tailwind 的 `bg-primary/85` 这类写法。 */
export const canvasColor = (token: CanvasColorToken, alpha = 1) => {
  const key = alpha === 1 ? token : `${token}/${alpha}`
  const cached = stringCache.get(key)

  if (cached) return cached

  const [r, g, b] = resolveToken(token)
  const value = alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`

  stringCache.set(key, value)

  return value
}

const invalidate = () => {
  resolved.clear()
  stringCache.clear()
  canvasThemeVersion.value++
}

let watching = false

/*
 * 主题的来源有三处:<body> 上的 data-theme / class / style(App.vue 写在 body 上,
 * 不是 <html>)、自定义主题注入 <head> 的 <style>(切主题时 data-theme 可能不变、
 * 只是那段 CSS 换了)、以及跟随系统的深浅色。
 */
export const watchCanvasTheme = () => {
  if (watching) return

  watching = true

  const attributes = { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] }

  new MutationObserver(invalidate).observe(document.body, attributes)
  new MutationObserver(invalidate).observe(document.documentElement, attributes)
  new MutationObserver(invalidate).observe(document.head, { childList: true })
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', invalidate)
}
