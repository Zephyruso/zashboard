export type SearchMatcher = {
  test: (value: string) => boolean
  testAny: (values: string[]) => boolean
}

export type SearchTextPart = {
  text: string
  matched: boolean
}

// 按 filter 串记忆化:同一关键字在每行/每 cell 的调用里反复 new RegExp 是纯浪费
// (虚拟列表滚动 + 每键全量过滤时每秒数百上千次编译)。'i' 正则无状态,可安全复用。
const CACHE_LIMIT = 64
const regexesCache = new Map<string, RegExp[] | null>()
const matcherCache = new Map<string, SearchMatcher | null>()

const buildSearchRegexes = (filter: string): RegExp[] | null => {
  const normalizedFilter = filter.trim()

  if (!normalizedFilter) {
    return null
  }

  const tokens = normalizedFilter.split(/\s+/).filter(Boolean)
  const regexes: RegExp[] = []

  for (const token of tokens) {
    try {
      regexes.push(new RegExp(token, 'i'))
    } catch {
      return null
    }
  }

  if (!regexes.length) {
    return null
  }

  return regexes
}

export const toSearchRegexes = (filter: string): RegExp[] | null => {
  if (regexesCache.has(filter)) {
    return regexesCache.get(filter)!
  }

  const regexes = buildSearchRegexes(filter)

  if (regexesCache.size >= CACHE_LIMIT) {
    regexesCache.clear()
  }
  regexesCache.set(filter, regexes)

  return regexes
}

export const toSearchRegex = (filter: string): SearchMatcher | null => {
  if (matcherCache.has(filter)) {
    return matcherCache.get(filter)!
  }

  const regexes = toSearchRegexes(filter)
  const matcher: SearchMatcher | null = regexes
    ? {
        test: (value) => regexes.every((r) => r.test(value)),
        testAny: (values) => regexes.every((r) => values.some((v) => r.test(v))),
      }
    : null

  if (matcherCache.size >= CACHE_LIMIT) {
    matcherCache.clear()
  }
  matcherCache.set(filter, matcher)

  return matcher
}

export const getSearchTextParts = (value: string, filter: string): SearchTextPart[] => {
  const regexes = toSearchRegexes(filter)

  if (!regexes || !value) {
    return [{ text: value, matched: false }]
  }

  const ranges: [number, number][] = []

  regexes.forEach((regex) => {
    const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`
    const globalRegex = new RegExp(regex.source, flags)
    let match: RegExpExecArray | null

    while ((match = globalRegex.exec(value))) {
      const start = match.index
      const end = start + match[0].length

      if (end > start) {
        ranges.push([start, end])
      }

      if (match[0].length === 0) {
        globalRegex.lastIndex += 1
      }
    }
  })

  if (!ranges.length) {
    return [{ text: value, matched: false }]
  }

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1])

  const merged = ranges.reduce<[number, number][]>((acc, range) => {
    const last = acc.at(-1)

    if (!last || range[0] > last[1]) {
      acc.push([...range])
    } else {
      last[1] = Math.max(last[1], range[1])
    }

    return acc
  }, [])

  const parts: SearchTextPart[] = []
  let cursor = 0

  merged.forEach(([start, end]) => {
    if (start > cursor) {
      parts.push({ text: value.slice(cursor, start), matched: false })
    }
    parts.push({ text: value.slice(start, end), matched: true })
    cursor = end
  })

  if (cursor < value.length) {
    parts.push({ text: value.slice(cursor), matched: false })
  }

  return parts
}
