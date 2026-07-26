<template>
  <div
    class="flex min-h-0 flex-1 flex-col"
    v-show="active"
  >
    <div
      ref="terminalEl"
      class="min-h-0 flex-1 overflow-hidden rounded p-1"
      :style="hostStyle"
    ></div>

    <TerminalSymbolBar
      v-if="barVisible"
      :modifiers="modifiers"
      @modifier="handleModifier"
      @key="handleKey"
      @paste="handlePaste"
    />
  </div>
</template>

<script setup lang="ts">
import { GrpcWebSocketStream } from '@/assembly/tools'
import TerminalSymbolBar from '@/components/tools/TerminalSymbolBar.vue'
import {
  armModifier,
  consumeArmed,
  encodeSpecial,
  encodeText,
  hasActiveModifier,
  type ModKey,
  type Modifiers,
  type TerminalKey,
} from '@/composables/terminalKeys'
import type { SSHSessionOptions } from '@/composables/tailscaleSSH'
import { terminalConfig, terminalFontFamily, terminalFontSize } from '@/composables/terminalConfig'
import { resolveTheme as resolveTerminalTheme } from '@/composables/terminalThemes'
import { useKeyboardInset } from '@/composables/useKeyboardInset'
import {
  TailscaleSSHClientMessageSchema,
  TailscaleSSHServerMessageSchema,
} from '@/gen/daemon/started_service_pb'
import { getSingboxSecret, getSingboxUrlFromBackend } from '@/helper/utils'
import { activeBackend } from '@/store/setup'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal, type ITheme } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{ session: SSHSessionOptions; active: boolean }>()
const emit = defineEmits<{
  titleChange: [title: string]
  statusChange: [status: string]
  exit: [clean: boolean]
}>()

const terminalBg = ref('#000000')
const modifiers = ref<Modifiers>({ ctrl: 'off', alt: 'off' })
const keyboardInset = useKeyboardInset()

// Mobile symbol bar: only while this session is active and the soft keyboard is
// up (desktop keeps the inset at 0). TerminalPanel tracks the visual viewport
// (useViewportHeight), so this container's bottom sits just above the keyboard;
// the bar is a flex child that takes its own space and the terminal flexes into
// what remains, so they never overlap.
const barVisible = computed(() => props.active && keyboardInset.value > 100)
const hostStyle = computed(() => ({ background: terminalBg.value }))

const terminalEl = useTemplateRef<HTMLDivElement>('terminalEl')
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null
let stream: GrpcWebSocketStream<
  typeof TailscaleSSHClientMessageSchema,
  typeof TailscaleSSHServerMessageSchema
> | null = null

const encoder = new TextEncoder()
const armedAt: Record<ModKey, number> = { ctrl: 0, alt: 0 }

const setStatus = (status: string) => emit('statusChange', status)

// Pick a terminal theme matching the app's current light/dark appearance.
const isDarkAppearance = (): boolean => {
  const bg = getComputedStyle(document.body).backgroundColor
  const m = bg.match(/\d+(\.\d+)?/g)
  if (!m || m.length < 3) return true
  const [r, g, b] = m.map(Number)
  return 0.299 * r + 0.587 * g + 0.114 * b < 128
}

const resolveTheme = (): ITheme => {
  const theme = resolveTerminalTheme(terminalConfig.value, isDarkAppearance())
  terminalBg.value = theme.background ?? '#000000'
  return theme
}

// Apply the current config (theme + font) to the live terminal without
// recreating it, so SSH sessions survive theme/font changes.
const applyConfig = () => {
  if (!terminal) return
  terminal.options.theme = resolveTheme()
  terminal.options.fontFamily = terminalFontFamily(terminalConfig.value)
  terminal.options.fontSize = terminalFontSize(terminalConfig.value)
  fitAddon?.fit()
}

const sendRaw = (text: string) => {
  stream?.send({ message: { case: 'input', value: { data: encoder.encode(text) } } })
}

const handleModifier = (mod: ModKey) => {
  const now = Date.now()
  const doubleTap = now - armedAt[mod] < 300
  armedAt[mod] = now
  modifiers.value = armModifier(modifiers.value, mod, doubleTap)
  terminal?.focus()
}

const handleKey = (key: TerminalKey) => {
  let seq: string | null = null
  if (key.kind === 'special') seq = encodeSpecial(key.id, modifiers.value)
  else if (key.kind === 'text') seq = encodeText(key.char, modifiers.value)
  if (seq !== null) sendRaw(seq)
  modifiers.value = consumeArmed(modifiers.value)
  terminal?.focus()
}

const handlePaste = () => {
  navigator.clipboard?.readText?.().then(
    (text) => {
      if (text) sendRaw(text)
    },
    () => {},
  )
  modifiers.value = consumeArmed(modifiers.value)
  terminal?.focus()
}

// xterm.js has no built-in touch scrolling, so a one-finger drag inside the
// terminal would otherwise scroll the page. Translate vertical drags into
// terminal scrolling (or arrow keys on the alternate screen, e.g. vim/less) and
// swallow the gesture so it never bubbles to the document.
let touchY = 0
let touchAccum = 0

const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length !== 1) return
  touchY = e.touches[0].clientY
  touchAccum = 0
}

const onTouchMove = (e: TouchEvent) => {
  if (e.touches.length !== 1 || !terminal || !terminalEl.value) return
  const y = e.touches[0].clientY
  touchAccum += touchY - y
  touchY = y
  const cellHeight = terminalEl.value.clientHeight / terminal.rows || 20
  const lines = Math.trunc(touchAccum / cellHeight)
  if (lines !== 0) {
    touchAccum -= lines * cellHeight
    if (terminal.buffer.active.type === 'alternate') {
      sendRaw((lines > 0 ? '\x1b[B' : '\x1b[A').repeat(Math.abs(lines)))
    } else {
      terminal.scrollLines(lines)
    }
  }
  e.preventDefault()
}

const connect = () => {
  const backend = activeBackend.value
  const baseUrl = backend ? getSingboxUrlFromBackend(backend) : ''
  if (!baseUrl || !terminalEl.value) return

  setStatus(t('connecting'))

  terminal = new Terminal({
    fontSize: terminalFontSize(terminalConfig.value),
    fontFamily: terminalFontFamily(terminalConfig.value),
    cursorBlink: true,
    theme: resolveTheme(),
  })
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(terminalEl.value)
  fitAddon.fit()
  terminal.focus()

  terminalEl.value.addEventListener('touchstart', onTouchStart, { passive: true })
  terminalEl.value.addEventListener('touchmove', onTouchMove, { passive: false })

  resizeObserver = new ResizeObserver(() => {
    if (terminalEl.value && terminalEl.value.clientWidth > 0 && terminalEl.value.clientHeight > 0) {
      fitAddon?.fit()
    }
  })
  resizeObserver.observe(terminalEl.value)

  themeObserver = new MutationObserver(applyConfig)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  let ready = false
  let lastStatus: string | null = null

  stream = new GrpcWebSocketStream({
    baseUrl,
    secret: backend ? getSingboxSecret(backend) : '',
    service: 'daemon.StartedService',
    method: 'StartTailscaleSSHSession',
    requestSchema: TailscaleSSHClientMessageSchema,
    responseSchema: TailscaleSSHServerMessageSchema,
    onMessage: (msg) => {
      const m = msg.message
      switch (m.case) {
        case 'authBanner':
          terminal?.write(m.value.message.replaceAll('\n', '\r\n'))
          break
        case 'ready':
          ready = true
          lastStatus = null
          setStatus('')
          break
        case 'output':
          terminal?.write(m.value.data)
          break
        case 'exit': {
          const exit = m.value
          let text = t('sessionExited', { code: exit.exitCode })
          if (exit.signal !== '') text += ` ${t('signalSuffix', { signal: exit.signal })}`
          if (exit.errorMessage !== '') text += `: ${exit.errorMessage}`
          lastStatus = text
          setStatus(text)
          emit('exit', exit.exitCode === 0 && exit.errorMessage === '')
          break
        }
        case 'error':
          lastStatus = m.value.message
          setStatus(m.value.message)
          break
      }
    },
    onEnd: (status, error) => {
      if (status && status.code !== 0) {
        setStatus(status.message || t('streamEnded', { code: status.code }))
      } else if (error && !ready) {
        setStatus(error)
      } else {
        setStatus(lastStatus ?? t('sessionClosed'))
      }
      if (terminal) terminal.options.cursorBlink = false
    },
  })

  stream.send({
    message: {
      case: 'start',
      value: {
        endpointTag: props.session.endpointTag,
        peerAddress: props.session.peerAddress,
        username: props.session.username,
        terminalType: props.session.terminalType,
        columns: terminal.cols,
        rows: terminal.rows,
        hostKeys: props.session.hostKeys,
      },
    },
  })

  terminal.onData((data) => {
    const mods = modifiers.value
    if (hasActiveModifier(mods)) {
      sendRaw(encodeText(data, mods))
      modifiers.value = consumeArmed(mods)
    } else {
      sendRaw(data)
    }
  })
  terminal.onResize(({ cols, rows }) => {
    stream?.send({ message: { case: 'resize', value: { columns: cols, rows } } })
  })
  terminal.onTitleChange((title) => {
    if (title) emit('titleChange', title)
  })
}

// Apply font/theme changes from the settings dialog to the live terminal.
watch(terminalConfig, applyConfig, { deep: true })

// Re-fit when the soft keyboard opens/closes so the prompt stays above it.
// The host's bottom padding changes with the inset; refit after the DOM
// updates instead of relying on the ResizeObserver alone.
watch(keyboardInset, () => {
  nextTick(() => {
    if (terminalEl.value && terminalEl.value.clientWidth > 0 && terminalEl.value.clientHeight > 0) {
      fitAddon?.fit()
    }
  })
})

// Re-fit and refocus when this session becomes the active one.
watch(
  () => props.active,
  (active) => {
    if (!active) return
    if (terminalEl.value && terminalEl.value.clientWidth > 0 && terminalEl.value.clientHeight > 0) {
      fitAddon?.fit()
    }
    terminal?.focus()
  },
)

const teardown = () => {
  terminalEl.value?.removeEventListener('touchstart', onTouchStart)
  terminalEl.value?.removeEventListener('touchmove', onTouchMove)
  resizeObserver?.disconnect()
  resizeObserver = null
  themeObserver?.disconnect()
  themeObserver = null
  stream?.close()
  stream = null
  terminal?.dispose()
  terminal = null
  fitAddon = null
}

onMounted(connect)
onBeforeUnmount(teardown)
</script>
