import DOMPurify from 'dompurify'

export const ICON_DOM_STARTS_WITH = 'data:image/svg+xml,'

export const isInlineSvgIcon = (icon: string) => icon.startsWith(ICON_DOM_STARTS_WITH)

/*
 * 同一个图标在一页里会重复出现几十次(整组节点常常共用一个),而 sanitize 是要解析一遍
 * DOM 的。按原始字符串缓存,展开一个大组时只在第一张卡片上真跑一次。
 *
 * DOM 与 Canvas 两条渲染路线共用这一份缓存 —— 切换渲染方式不该让图标重新 sanitize 一遍。
 */
const sanitizedCache = new Map<string, string>()

export const sanitizeInlineSvgIcon = (icon: string) => {
  const raw = icon.slice(ICON_DOM_STARTS_WITH.length)
  const cached = sanitizedCache.get(raw)

  if (cached !== undefined) return cached

  const pure = DOMPurify.sanitize(raw)

  sanitizedCache.set(raw, pure)

  return pure
}
