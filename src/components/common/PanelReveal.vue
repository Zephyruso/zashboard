<template>
  <template v-if="active">
    <div
      class="fixed inset-0 z-40 overflow-hidden bg-black/40"
      :class="!ready && 'invisible'"
      style="opacity: 0"
      ref="backdropRef"
      @click.stop="open = !open"
    />
    <div
      class="panel-reveal-panel fixed z-50 flex flex-col rounded-xl"
      :class="[!ready && 'invisible', animating && 'panel-reveal-moving']"
      :style="panelStyle"
      ref="panelRef"
      @click.stop="open = !open"
    >
      <div
        class="pointer-events-none absolute inset-0 origin-top-left rounded-[inherit] shadow-xs"
        ref="shadowRef"
      />
      <RoundedClip>
        <div
          class="base-container overlay-glass pointer-events-none absolute inset-0 rounded-none shadow-none"
        />
        <div
          class="panel-reveal-content relative flex min-h-0 flex-1 flex-col gap-2 p-2"
          ref="contentRef"
        >
          <div
            v-if="$slots.header"
            class="panel-reveal-header relative z-10 shrink-0"
            ref="headerRef"
          >
            <slot name="header" />
          </div>
          <div
            class="panel-reveal-body flex min-h-0 flex-col"
            ref="bodyRef"
          >
            <slot />
          </div>
        </div>
      </RoundedClip>
    </div>
  </template>
</template>

<script setup lang="ts">
import { provideCollapseTransition } from '@/composables/use-collapse-transition'
import { useOverlayDimState } from '@/composables/use-dialog-state'
import type { OverlayDimState } from '@/helper/dialog'
import { animationTime, createPanelMotion } from '@/helper/panel-motion'
import {
  h,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
  type CSSProperties,
  type FunctionalComponent,
} from 'vue'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  source?: HTMLElement
  getPanelStyle: (source: DOMRect) => CSSProperties
}>()
const emit = defineEmits<{ 'active-change': [active: boolean] }>()

const active = ref(false)
const ready = ref(false)
const animating = ref(false)
const dimState = shallowRef<OverlayDimState>(0)
const backdropRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const shadowRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()
const headerRef = ref<HTMLElement>()
const bodyRef = ref<HTMLElement>()
const panelStyle = ref<CSSProperties>({})
const clips: (HTMLElement | null)[] = []

const RoundedClip: FunctionalComponent = (_, { slots }) =>
  [0, 1, 2, 3].reduceRight(
    (children, index) => [
      h(
        'div',
        {
          class: 'panel-reveal-clip',
          ref: (element) => {
            clips[index] = element as HTMLElement | null
          },
        },
        children,
      ),
    ],
    slots.default?.() ?? [],
  )

useOverlayDimState(active, dimState)
provideCollapseTransition(animating)
watch(active, (value) => emit('active-change', value), { flush: 'sync' })

let sourceElement: HTMLElement | undefined
let sourceStyle = { opacity: '', pointerEvents: '', zIndex: '' }
let geometry = { dx: 0, dy: 0, dw: 0, dh: 0, width: 0, height: 0 }
let animations: Animation[] = []
let operation = 0

const measureGeometry = () => {
  const panel = panelRef.value!
  const source = sourceElement!.getBoundingClientRect()
  const final = panel.getBoundingClientRect()
  panel.style.height = `${final.height}px`
  geometry = {
    dx: source.left - final.left,
    dy: source.top - final.top,
    dw: final.width - source.width,
    dh: final.height - source.height,
    width: final.width,
    height: final.height,
  }
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const translate = (x: number, y: number) => `translate3d(${x}px, ${y}px, 0)`
const effectsAt = (progress: number) => {
  const { dx, dy, dw, dh, width, height } = geometry
  const rest = 1 - progress
  const clipped = Math.max(0, rest)
  const x = dx * rest
  const y = dy * rest
  return [
    [clips[0], { transform: translate(x, y) }],
    [clips[1], { transform: translate(-dw * clipped, 0) }],
    [clips[2], { transform: translate(0, -dh * clipped) }],
    [clips[3], { transform: translate(dw * clipped, 0) }],
    [contentRef.value, { transform: translate(-x, dh * clipped - y) }],
    [
      headerRef.value,
      {
        transform: translate(x, y),
        opacity: String(clamp01((progress - 0.05) / 0.35)),
      },
    ],
    [
      bodyRef.value,
      {
        opacity: String(clamp01(progress)),
        clipPath: `inset(${Math.max(0, y)}px 0px 0px 0px)`,
      },
    ],
    [
      shadowRef.value,
      {
        transform: `${translate(x, y)} scale(${(width - dw * clipped) / width}, ${(height - dh * clipped) / height})`,
      },
    ],
    [sourceElement, { opacity: String(1 - clamp01(progress / 0.25)) }],
    [backdropRef.value, { opacity: String(clamp01(progress)) }],
  ] as const
}

const render = (progress: number) => {
  for (const [element, style] of effectsAt(progress)) {
    if (element) Object.assign(element.style, style)
  }
}

const cancelAnimations = () => {
  for (const animation of animations) {
    animation.onfinish = null
    animation.cancel()
  }
  animations = []
}

const reset = () => {
  operation++
  cancelAnimations()
  if (sourceElement) Object.assign(sourceElement.style, sourceStyle)
  sourceElement = undefined
  dimState.value = 0
  ready.value = false
  animating.value = false
  active.value = false
}

const settle = (target: number) => {
  if (target === 0) {
    reset()
    return
  }
  dimState.value = target
  render(target)
  cancelAnimations()
  animating.value = false
  panelRef.value!.style.height = ''
  if (bodyRef.value) bodyRef.value.style.clipPath = ''
}

const animateTo = (target: number) => {
  const start = animationTime()
  const current = dimState.value
  const state = typeof current === 'number' ? current : current.motion.sample(start - current.start)
  cancelAnimations()
  if (state === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    settle(target)
    return
  }

  const motion = createPanelMotion(state, target)
  dimState.value = { motion, start }
  animating.value = true
  render(state)
  const frames = motion.points.map(({ offset, position }) => ({
    offset,
    effects: effectsAt(position),
  }))
  effectsAt(state).forEach(([element], index) => {
    if (!element) return
    const animation = element.animate(
      frames.map(({ offset, effects }) => ({ offset, ...effects[index][1] })),
      { duration: motion.duration, fill: 'both', easing: 'linear' },
    )
    animation.startTime = start
    animations.push(animation)
  })
  animations[0].onfinish = () => settle(target)
}

const prepare = async (source: HTMLElement) => {
  const token = ++operation
  sourceElement = source
  const { opacity, pointerEvents, zIndex } = source.style
  sourceStyle = { opacity, pointerEvents, zIndex }
  panelStyle.value = props.getPanelStyle(source.getBoundingClientRect())
  Object.assign(source.style, { pointerEvents: 'none', zIndex: '51' })
  active.value = true
  animating.value = true
  await nextTick()

  let previousSize = ''
  let stable = 0
  for (let i = 0; i < 12; i++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (token !== operation) return
    const size = `${panelRef.value!.offsetHeight}:${contentRef.value!.scrollHeight}`
    stable = size === previousSize ? stable + 1 : 0
    previousSize = size
    if (stable >= 2) break
  }
  if (!open.value) {
    reset()
    return
  }
  measureGeometry()
  ready.value = true
  animateTo(1)
}

watch(
  [open, () => props.source],
  ([opened, source]) => {
    if (sourceElement && sourceElement !== source) reset()
    if (opened && !active.value && source) {
      void prepare(source)
    } else if (ready.value) {
      if (typeof dimState.value === 'number') measureGeometry()
      animateTo(opened ? 1 : 0)
    }
  },
  { immediate: true, flush: 'post' },
)

onBeforeUnmount(reset)
</script>

<style scoped>
.panel-reveal-panel :deep(.panel-reveal-clip) {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-radius: inherit;
}

.panel-reveal-moving :deep(.panel-reveal-clip),
.panel-reveal-moving .panel-reveal-content,
.panel-reveal-moving .panel-reveal-header {
  will-change: transform;
}
</style>
