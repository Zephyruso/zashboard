import type { CSSProperties } from 'vue'

export type AnsiTextSegment = {
  text: string
  style?: CSSProperties
}

type AnsiState = {
  color?: string
  backgroundColor?: string
  fontWeight?: CSSProperties['fontWeight']
  fontStyle?: CSSProperties['fontStyle']
  textDecoration?: CSSProperties['textDecoration']
  opacity?: CSSProperties['opacity']
}

const ANSI_PATTERN = /\x1b\[([0-9;]*)m/g

const NORMAL_COLORS = [
  '#000000',
  '#cd3131',
  '#0dbc79',
  '#e5e510',
  '#2472c8',
  '#bc3fbc',
  '#11a8cd',
  '#e5e5e5',
]

const BRIGHT_COLORS = [
  '#666666',
  '#f14c4c',
  '#23d18b',
  '#f5f543',
  '#3b8eea',
  '#d670d6',
  '#29b8db',
  '#ffffff',
]

const colorFrom256 = (value: number) => {
  if (value < 0 || value > 255) return undefined
  if (value < 8) return NORMAL_COLORS[value]
  if (value < 16) return BRIGHT_COLORS[value - 8]

  if (value < 232) {
    const index = value - 16
    const red = Math.floor(index / 36)
    const green = Math.floor((index % 36) / 6)
    const blue = index % 6
    const toChannel = (channel: number) => (channel === 0 ? 0 : channel * 40 + 55)

    return `rgb(${toChannel(red)}, ${toChannel(green)}, ${toChannel(blue)})`
  }

  const gray = (value - 232) * 10 + 8

  return `rgb(${gray}, ${gray}, ${gray})`
}

const stateToStyle = (state: AnsiState): CSSProperties | undefined => {
  const style: CSSProperties = {}

  if (state.color) style.color = state.color
  if (state.backgroundColor) style.backgroundColor = state.backgroundColor
  if (state.fontWeight) style.fontWeight = state.fontWeight
  if (state.fontStyle) style.fontStyle = state.fontStyle
  if (state.textDecoration) style.textDecoration = state.textDecoration
  if (state.opacity) style.opacity = state.opacity

  return Object.keys(style).length ? style : undefined
}

const applyAnsiCodes = (state: AnsiState, codes: number[]) => {
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]

    if (code === 0) {
      state.color = undefined
      state.backgroundColor = undefined
      state.fontWeight = undefined
      state.fontStyle = undefined
      state.textDecoration = undefined
      state.opacity = undefined
    } else if (code === 1) {
      state.fontWeight = 700
    } else if (code === 2) {
      state.opacity = 0.7
    } else if (code === 3) {
      state.fontStyle = 'italic'
    } else if (code === 4) {
      state.textDecoration = 'underline'
    } else if (code === 22) {
      state.fontWeight = undefined
      state.opacity = undefined
    } else if (code === 23) {
      state.fontStyle = undefined
    } else if (code === 24) {
      state.textDecoration = undefined
    } else if (code >= 30 && code <= 37) {
      state.color = NORMAL_COLORS[code - 30]
    } else if (code === 39) {
      state.color = undefined
    } else if (code >= 40 && code <= 47) {
      state.backgroundColor = NORMAL_COLORS[code - 40]
    } else if (code === 49) {
      state.backgroundColor = undefined
    } else if (code >= 90 && code <= 97) {
      state.color = BRIGHT_COLORS[code - 90]
    } else if (code >= 100 && code <= 107) {
      state.backgroundColor = BRIGHT_COLORS[code - 100]
    } else if ((code === 38 || code === 48) && codes[i + 1] === 5) {
      const color = colorFrom256(codes[i + 2])
      if (color && code === 38) state.color = color
      if (color && code === 48) state.backgroundColor = color
      i += 2
    } else if ((code === 38 || code === 48) && codes[i + 1] === 2) {
      const [red, green, blue] = codes.slice(i + 2, i + 5)
      const color = `rgb(${red}, ${green}, ${blue})`
      if (code === 38) state.color = color
      if (code === 48) state.backgroundColor = color
      i += 4
    }
  }
}

export const stripAnsi = (value: string) => value.replace(ANSI_PATTERN, '')

export const parseAnsiText = (value: string): AnsiTextSegment[] => {
  const segments: AnsiTextSegment[] = []
  const state: AnsiState = {}
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = ANSI_PATTERN.exec(value))) {
    if (match.index > cursor) {
      segments.push({ text: value.slice(cursor, match.index), style: stateToStyle(state) })
    }

    const codes = match[1] ? match[1].split(';').map((code) => Number(code || 0)) : [0]
    applyAnsiCodes(state, codes)
    cursor = match.index + match[0].length
  }

  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor), style: stateToStyle(state) })
  }

  return segments.length ? segments : [{ text: value }]
}
