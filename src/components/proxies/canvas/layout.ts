import { PROXY_CARD_SIZE } from '@/constant'

/*
 * 节点网格的几何。全部解析式算出来 —— 画布上没有可测量的元素,反过来也就不再需要
 * DOM 版那套 measureElement / scrollMargin 对账 / 逐帧校正。
 *
 * 数值逐条对着 ProxyNodeCard 的 Tailwind 类抄:
 *   卡片 rounded-md(6) / 小卡 p-1 gap-1 / 大卡 p-2 gap-2
 *   名称行 text-sm(14px, 行高 20) / 底行固定 h-4(16) 且 text-xs(12)
 *   延迟标签 大卡 h-5 w-10 rounded-xl,小卡 h-4! w-8! rounded-md!
 *   图标 16px + 右边距 4px(ProxyIcon 的默认值)
 * 于是折叠高度 = 大卡 60 / 小卡 48,和 DOM 版的 estimatedRowHeight 对得上。
 */

export const GAP = 8
export const CARD_RADIUS = 6
export const NAME_FONT_SIZE = 14
export const NAME_LINE_HEIGHT = 20
export const TYPE_FONT_SIZE = 12
export const BOTTOM_ROW_HEIGHT = 16
export const ICON_SIZE = 16
export const ICON_MARGIN = 4

export type CardMetrics = {
  padding: number
  gap: number
  tagWidth: number
  tagHeight: number
  tagRadius: number
}

export const cardMetrics = (size: PROXY_CARD_SIZE): CardMetrics =>
  size === PROXY_CARD_SIZE.SMALL
    ? { padding: 4, gap: 4, tagWidth: 32, tagHeight: 16, tagRadius: 6 }
    : { padding: 8, gap: 8, tagWidth: 40, tagHeight: 20, tagRadius: 10 }

/* ---------- 文本测量 ---------- */

/*
 * measureText 不便宜,而同一批节点名会在每次悬停 / 每帧动画里被反复量。缓存的 key 带上
 * 字体,主题或字体加载完成换了 font 串,旧结果自然失效,不必手动清。
 */
const widthCache = new Map<string, number>()
const truncateCache = new Map<string, string>()
const wrapCache = new Map<string, string[]>()

const CACHE_LIMIT = 20000

const capped = <K, V>(cache: Map<K, V>, key: K, value: V) => {
  if (cache.size > CACHE_LIMIT) cache.clear()
  cache.set(key, value)

  return value
}

/*
 * 字体文件加载完成会改变同一个 font 串下的文本宽度,量过的结果必须整份作废 ——
 * key 里的 font 串这时候是不变的,靠它自然失效指望不上。
 */
export const clearTextMeasureCaches = () => {
  widthCache.clear()
  truncateCache.clear()
  wrapCache.clear()
}

export const measureWidth = (ctx: CanvasRenderingContext2D, text: string) => {
  const key = `${ctx.font} ${text}`
  const cached = widthCache.get(key)

  if (cached !== undefined) return cached

  return capped(widthCache, key, ctx.measureText(text).width)
}

/** 超宽就截断并补省略号,对应 Tailwind 的 `truncate`。 */
export const truncateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (!text) return text

  const key = `${ctx.font} ${maxWidth} ${text}`
  const cached = truncateCache.get(key)

  if (cached !== undefined) return cached

  if (measureWidth(ctx, text) <= maxWidth) return capped(truncateCache, key, text)

  const ellipsis = '…'
  const budget = maxWidth - measureWidth(ctx, ellipsis)

  if (budget <= 0) return capped(truncateCache, key, ellipsis)

  // 二分找能塞下的最长前缀,比逐字回退少量几十次。
  let low = 0
  let high = text.length

  while (low < high) {
    const mid = Math.ceil((low + high) / 2)

    if (measureWidth(ctx, text.slice(0, mid)) <= budget) low = mid
    else high = mid - 1
  }

  return capped(truncateCache, key, text.slice(0, low) + ellipsis)
}

// CJK / 全角标点之间可以随意断行,拉丁词只在空格与连字符后断 —— 复刻浏览器的默认换行。
const BREAK_ANYWHERE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿︰-﹏＀-￯]/

const canBreakBefore = (text: string, index: number) => {
  if (index <= 0 || index >= text.length) return false

  const prev = text[index - 1]
  const next = text[index]

  if (prev === ' ' || prev === '-' || prev === '/') return true

  return BREAK_ANYWHERE.test(prev) || BREAK_ANYWHERE.test(next)
}

/** 名称不截断时按可用宽度折行,返回每一行的文本。 */
export const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (!text) return ['']

  const key = `${ctx.font} ${maxWidth} ${text}`
  const cached = wrapCache.get(key)

  if (cached !== undefined) return cached

  if (maxWidth <= 0 || measureWidth(ctx, text) <= maxWidth) return capped(wrapCache, key, [text])

  const lines: string[] = []
  let lineStart = 0
  let lastBreak = -1

  for (let i = 1; i <= text.length; i++) {
    if (measureWidth(ctx, text.slice(lineStart, i)) <= maxWidth) {
      if (canBreakBefore(text, i)) lastBreak = i
      continue
    }

    // 放不下了:优先退回最近的可断点,一个都没有就在这里硬断。
    const breakAt = lastBreak > lineStart ? lastBreak : Math.max(lineStart + 1, i - 1)

    lines.push(text.slice(lineStart, breakAt).trimEnd())
    lineStart = breakAt
    lastBreak = -1
    i = lineStart
  }

  if (lineStart < text.length) lines.push(text.slice(lineStart))

  return capped(wrapCache, key, lines.length ? lines : [text])
}

/* ---------- 网格布局 ---------- */

export type GridLayout = {
  columns: number
  columnWidth: number
  rowCount: number
  rowHeights: number[]
  /** 长度 rowCount + 1,最后一项即总高 */
  rowTops: number[]
  totalHeight: number
  /** 名称不截断时才有:每个节点折行后的文本 */
  nameLines: string[][] | null
  metrics: CardMetrics
}

export const columnCount = (width: number, minCardWidth: number) =>
  width > 0 ? Math.max(1, Math.floor((width + GAP) / (minCardWidth + GAP))) : 1

export const nameAreaWidth = (columnWidth: number, metrics: CardMetrics, hasIcon: boolean) =>
  columnWidth - metrics.padding * 2 - (hasIcon ? ICON_SIZE + ICON_MARGIN : 0)

export const computeLayout = (options: {
  ctx: CanvasRenderingContext2D
  width: number
  names: string[]
  minCardWidth: number
  cardSize: PROXY_CARD_SIZE
  truncateName: boolean
  nameFont: string
  hasIcon: (name: string) => boolean
}): GridLayout => {
  const { ctx, width, names, minCardWidth, cardSize, truncateName, nameFont, hasIcon } = options
  const metrics = cardMetrics(cardSize)
  const columns = columnCount(width, minCardWidth)
  const columnWidth = Math.max(1, (width - (columns - 1) * GAP) / columns)
  const rowCount = Math.ceil(names.length / columns)
  const baseHeight = metrics.padding * 2 + metrics.gap + BOTTOM_ROW_HEIGHT

  const rowHeights: number[] = new Array(rowCount)
  const rowTops: number[] = new Array(rowCount + 1)
  let nameLines: string[][] | null = null

  if (truncateName) {
    // 名称永远一行,所有行等高 —— 不必为屏外的节点量任何文本。
    rowHeights.fill(baseHeight + NAME_LINE_HEIGHT)
  } else {
    // 行高取决于折行数,只能把所有节点都折一遍;结果进缓存,只在宽度 / 字体 / 列表变化时重算。
    ctx.font = nameFont
    nameLines = new Array(names.length)

    for (let row = 0; row < rowCount; row++) {
      let maxLines = 1

      for (let col = 0; col < columns; col++) {
        const index = row * columns + col

        if (index >= names.length) break

        const lines = wrapText(
          ctx,
          names[index],
          nameAreaWidth(columnWidth, metrics, hasIcon(names[index])),
        )

        nameLines[index] = lines
        maxLines = Math.max(maxLines, lines.length)
      }

      rowHeights[row] = baseHeight + maxLines * NAME_LINE_HEIGHT
    }
  }

  let top = 0

  for (let row = 0; row < rowCount; row++) {
    rowTops[row] = top
    top += rowHeights[row] + GAP
  }

  // 最后一行后面不留行距,和 DOM 版根节点的 -mb-2 抵掉尾部 pb-2 是一回事。
  rowTops[rowCount] = Math.max(0, top - GAP)

  return {
    columns,
    columnWidth,
    rowCount,
    rowHeights,
    rowTops,
    totalHeight: rowTops[rowCount],
    nameLines,
    metrics,
  }
}

export const rowAt = (layout: GridLayout, y: number) => {
  const { rowTops, rowCount } = layout

  if (rowCount === 0 || y < 0) return -1

  let low = 0
  let high = rowCount - 1

  while (low <= high) {
    const mid = (low + high) >> 1

    if (y < rowTops[mid]) high = mid - 1
    else if (y > rowTops[mid] + layout.rowHeights[mid]) low = mid + 1
    else return mid
  }

  return -1
}

/** 第一个底边越过 y 的行,用来定位可视区起点(y 落在行距里时也有答案)。 */
export const rowAtOrAfter = (layout: GridLayout, y: number) => {
  let low = 0
  let high = layout.rowCount - 1
  let found = layout.rowCount

  while (low <= high) {
    const mid = (low + high) >> 1

    if (layout.rowTops[mid] + layout.rowHeights[mid] >= y) {
      found = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  return found
}

export type CardRect = { x: number; y: number; width: number; height: number }

export const cardRect = (layout: GridLayout, index: number): CardRect => {
  const row = Math.floor(index / layout.columns)
  const col = index % layout.columns

  return {
    x: col * (layout.columnWidth + GAP),
    y: layout.rowTops[row],
    width: layout.columnWidth,
    height: layout.rowHeights[row],
  }
}

/** 延迟标签在卡片里的位置:底行最右侧。 */
export const tagRect = (layout: GridLayout, rect: CardRect): CardRect => {
  const { padding, tagWidth, tagHeight } = layout.metrics

  return {
    x: rect.x + rect.width - padding - tagWidth,
    y: rect.y + rect.height - padding - BOTTOM_ROW_HEIGHT + (BOTTOM_ROW_HEIGHT - tagHeight) / 2,
    width: tagWidth,
    height: tagHeight,
  }
}

export type HitRegion = 'card' | 'latency' | 'name' | 'type'

export type Hit = { index: number; region: HitRegion; rect: CardRect }

export const hitTest = (layout: GridLayout, count: number, x: number, y: number): Hit | null => {
  const row = rowAt(layout, y)

  if (row < 0) return null

  const col = Math.floor(x / (layout.columnWidth + GAP))

  if (col < 0 || col >= layout.columns) return null

  const index = row * layout.columns + col

  if (index >= count) return null

  const rect = cardRect(layout, index)

  // 落在列之间的间隙里不算命中。
  if (x > rect.x + rect.width) return null

  const tag = tagRect(layout, rect)

  if (x >= tag.x && x <= tag.x + tag.width && y >= tag.y && y <= tag.y + tag.height) {
    return { index, region: 'latency', rect: tag }
  }

  const { padding, gap } = layout.metrics
  const nameBottom = rect.y + rect.height - padding - BOTTOM_ROW_HEIGHT - gap

  if (y <= nameBottom) {
    return {
      index,
      region: 'name',
      rect: {
        x: rect.x + padding,
        y: rect.y + padding,
        width: rect.width - padding * 2,
        height: nameBottom - rect.y - padding,
      },
    }
  }

  return {
    index,
    region: 'type',
    rect: {
      x: rect.x + padding,
      y: rect.y + rect.height - padding - BOTTOM_ROW_HEIGHT,
      width: rect.width - padding * 2 - layout.metrics.tagWidth,
      height: BOTTOM_ROW_HEIGHT,
    },
  }
}
