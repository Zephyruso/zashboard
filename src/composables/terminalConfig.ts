import { useStorage } from '@vueuse/core'

export interface TerminalConfig {
  lightThemeName: string
  darkThemeName: string
  fontFamily: string
  fontSize: number
}

export const DEFAULT_TERMINAL_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "DejaVu Sans Mono", monospace'

export const DEFAULT_TERMINAL_FONT_SIZE = 13
export const DEFAULT_LIGHT_THEME_NAME = 'Alabaster'
export const DEFAULT_DARK_THEME_NAME = 'Afterglow'

export const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32]

export const FONT_FAMILIES = [
  'Menlo',
  'Monaco',
  'SF Mono',
  'Consolas',
  'Cascadia Code',
  'Fira Code',
  'JetBrains Mono',
  'Source Code Pro',
  'IBM Plex Mono',
  'Roboto Mono',
  'Ubuntu Mono',
  'Courier New',
]

const DEFAULT_TERMINAL_CONFIG: TerminalConfig = {
  lightThemeName: DEFAULT_LIGHT_THEME_NAME,
  darkThemeName: DEFAULT_DARK_THEME_NAME,
  fontFamily: '',
  fontSize: DEFAULT_TERMINAL_FONT_SIZE,
}

export const terminalConfig = useStorage<TerminalConfig>('config/terminal', {
  ...DEFAULT_TERMINAL_CONFIG,
})

export const terminalFontFamily = (config: TerminalConfig): string => {
  const family = config.fontFamily.trim()
  if (!family) return DEFAULT_TERMINAL_FONT
  const quoted = /\s/.test(family) ? `"${family}"` : family
  return `${quoted}, ${DEFAULT_TERMINAL_FONT}`
}

export const terminalFontSize = (config: TerminalConfig): number =>
  config.fontSize > 0 ? config.fontSize : DEFAULT_TERMINAL_FONT_SIZE
