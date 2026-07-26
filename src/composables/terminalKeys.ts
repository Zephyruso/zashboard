// Auxiliary symbol bar for the mobile terminal — key model and ANSI encoding.
// Pure logic (no DOM) ported from sing-box-dashboard, which adapted it from the
// TerminalInputAccessoryView in sing-box-for-apple (Ghostty).

const ESC = '\x1b'

export type ModState = 'off' | 'armed' | 'locked'

export interface Modifiers {
  ctrl: ModState
  alt: ModState
}

export type ModKey = keyof Modifiers

export type SpecialKeyId = 'esc' | 'tab' | 'up' | 'down' | 'left' | 'right'

export type TerminalKey =
  | { kind: 'modifier'; mod: ModKey; label: string }
  | { kind: 'special'; id: SpecialKeyId; label: string }
  | { kind: 'text'; char: string }
  | { kind: 'paste' }
  | { kind: 'divider' }

// Three groups separated by dot dividers, mirroring the reference design.
export const DEFAULT_KEYS: readonly TerminalKey[] = [
  { kind: 'special', id: 'esc', label: 'esc' },
  { kind: 'special', id: 'tab', label: 'tab' },
  { kind: 'modifier', mod: 'ctrl', label: '⌃' },
  { kind: 'modifier', mod: 'alt', label: '⌥' },
  { kind: 'divider' },
  { kind: 'special', id: 'left', label: '←' },
  { kind: 'special', id: 'up', label: '↑' },
  { kind: 'special', id: 'down', label: '↓' },
  { kind: 'special', id: 'right', label: '→' },
  { kind: 'divider' },
  { kind: 'text', char: '|' },
  { kind: 'text', char: '/' },
  { kind: 'text', char: '~' },
  { kind: 'text', char: '-' },
  { kind: 'text', char: '_' },
  { kind: 'text', char: '`' },
  { kind: 'text', char: "'" },
  { kind: 'text', char: '"' },
  { kind: 'paste' },
]

// Ctrl + key → control byte (e.g. Ctrl+C → 0x03, Ctrl+[ → ESC). Returns null
// when the character has no control mapping, leaving it untransformed.
export const controlByte = (ch: string): string | null => {
  if (ch.length !== 1) return null
  if (ch === ' ') return '\x00'
  const code = ch.toUpperCase().charCodeAt(0)
  if (code >= 0x40 && code <= 0x5f) return String.fromCharCode(code & 0x1f)
  return null
}

// Encodes a printable character under the active sticky modifiers. Ctrl rewrites
// a single char to its control byte; Alt prefixes ESC (meta).
export const encodeText = (text: string, mods: Modifiers): string => {
  let out = text
  if (mods.ctrl !== 'off' && text.length === 1) {
    const byte = controlByte(text)
    if (byte !== null) out = byte
  }
  if (mods.alt !== 'off') out = ESC + out
  return out
}

const ARROW_FINAL: Record<'up' | 'down' | 'left' | 'right', string> = {
  up: 'A',
  down: 'B',
  right: 'C',
  left: 'D',
}

// Encodes a special key. Arrows gain a CSI modifier code when Ctrl/Alt are
// active (e.g. Ctrl+Up → ESC[1;5A); esc/tab get an ESC prefix under Alt.
export const encodeSpecial = (id: SpecialKeyId, mods: Modifiers): string => {
  if (id === 'esc') return mods.alt !== 'off' ? ESC + ESC : ESC
  if (id === 'tab') return mods.alt !== 'off' ? ESC + '\t' : '\t'
  const final = ARROW_FINAL[id]
  const modCode = 1 + (mods.alt !== 'off' ? 2 : 0) + (mods.ctrl !== 'off' ? 4 : 0)
  return modCode === 1 ? ESC + '[' + final : ESC + '[1;' + modCode + final
}

export const hasActiveModifier = (mods: Modifiers): boolean =>
  mods.ctrl !== 'off' || mods.alt !== 'off'

// Sticky modifier state machine: off → armed → (double-tap) locked → off.
// A plain tap on an armed modifier toggles it back off.
const nextModState = (current: ModState, doubleTap: boolean): ModState => {
  switch (current) {
    case 'off':
      return 'armed'
    case 'armed':
      return doubleTap ? 'locked' : 'off'
    case 'locked':
      return 'off'
  }
}

export const armModifier = (mods: Modifiers, which: ModKey, doubleTap: boolean): Modifiers => ({
  ...mods,
  [which]: nextModState(mods[which], doubleTap),
})

// Clears armed modifiers after a key is sent; locked modifiers persist.
export const consumeArmed = (mods: Modifiers): Modifiers => ({
  ctrl: mods.ctrl === 'armed' ? 'off' : mods.ctrl,
  alt: mods.alt === 'armed' ? 'off' : mods.alt,
})
