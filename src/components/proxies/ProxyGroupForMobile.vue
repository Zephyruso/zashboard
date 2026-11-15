<template>
  <div
    class="group relative h-22 cursor-pointer select-none [-webkit-tap-highlight-color:transparent]"
    :data-group-name="proxyGroup.name"
    :data-page-swipe-ignore="panelMounted || undefined"
    ref="cardWrapperRef"
    @click="handlerGroupClick"
  >
    <div
      v-if="panelMounted"
      class="fixed inset-0 z-[24] overflow-hidden bg-black/40"
      :class="!cardHidden && 'invisible'"
      style="opacity: 0"
      ref="backdropRef"
    />
    <div
      class="base-container absolute inset-0 flex flex-col p-2 will-change-transform"
      :class="cardHidden && 'invisible'"
      @contextmenu.prevent.stop="handlerLatencyTest"
      ref="cardRef"
    >
      <ProxyGroupHeaderForMobile
        :name="name"
        :proxies-count="proxiesCount"
        :is-latency-testing="isLatencyTesting"
        :display-content="false"
        @latency-test="handlerLatencyTest"
      />
    </div>
    <!--
      Like PharosPro's policy card: the panel is laid out at its final, centered size, so the
      proxy list never reflows while animating. One spring value drives the surface offset, its
      clip, the shared icon and every fade in the same frame, so no edge can drift out of sync.
      The backdrop and panel stay below the controls bar and the mobile dock (z-30), as the
      in-list card does, so a card under the dock doesn't pop over it. Those bars dim through
      their own PageDimLayer, driven by setPageDim() with the same spring value.
    -->
    <div
      v-if="panelMounted"
      class="pointer-events-none fixed inset-x-0 z-[25] flex items-center justify-center"
      :class="!cardHidden && 'invisible'"
      :style="{ top: `${ctrlsBottom}px`, bottom: `${dockTop}px` }"
    >
      <div
        class="base-container overlay-glass relative flex flex-col overflow-hidden p-2 shadow-xl"
        :class="closing ? 'pointer-events-none' : 'pointer-events-auto'"
        :style="panelStyle"
        @contextmenu.prevent.stop="handlerLatencyTest"
        ref="panelRef"
      >
        <div
          class="flex min-h-0 flex-1 flex-col gap-2"
          ref="panelBodyRef"
        >
          <ProxyGroupHeaderForMobile
            :name="name"
            :proxies-count="proxiesCount"
            :is-latency-testing="isLatencyTesting"
            :display-content="true"
            :hide-icon="true"
            @latency-test="handlerLatencyTest"
          />
          <div
            class="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain"
            :class="[PROXIES_PARENT_CLASS]"
            :style="{ contain: 'layout style paint' }"
          >
            <Component
              :is="groupProxiesByProvider ? ProxiesByProvider : ProxiesContent"
              :name="name"
              :now="proxyGroup.now"
              :render-proxies="renderProxies"
            />
          </div>
        </div>
        <div
          class="pointer-events-none absolute top-0 left-0 flex flex-col p-2"
          aria-hidden="true"
          ref="sourceCopyRef"
        >
          <ProxyGroupHeaderForMobile
            :name="name"
            :proxies-count="proxiesCount"
            :is-latency-testing="isLatencyTesting"
            :display-content="false"
            :hide-icon="true"
          />
        </div>
        <div
          v-if="proxyGroup.icon"
          class="pointer-events-none absolute top-2 right-2"
          aria-hidden="true"
          ref="sharedIconRef"
        >
          <ProxyIcon
            :icon="proxyGroup.icon"
            :size="40"
            :margin="0"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBounceOnVisible } from '@/composables/use-bounce-on-visible'
import { provideCollapseTransition } from '@/composables/use-collapse-transition'
import { useOverlayDimState } from '@/composables/use-dialog-state'
import { ctrlsBottom, dockTop } from '@/helper/padding-views'
import { setPageDim, setPageDimDismissHandler } from '@/helper/page-dim'
import { disableProxiesPageScroll } from '@/helper/proxies'
import { useRenderProxyList } from '@/composables/use-render-proxy-list'
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import { proxyGroupLatencyTest } from '@/assembly/proxies'
import { proxyMap } from '@/assembly/proxies'
import { groupProxiesByProvider } from '@/store/settings'
import { computed, nextTick, onUnmounted, ref } from 'vue'
import ProxiesByProvider from './ProxiesByProvider.vue'
import ProxiesContent from './ProxiesContent.vue'
import ProxyGroupHeaderForMobile from './ProxyGroupHeaderForMobile.vue'
import ProxyIcon from './ProxyIcon.vue'

const props = defineProps<{
  name: string
}>()
const proxyGroup = computed(() => proxyMap.value[props.name])
const allProxies = computed(() => proxyGroup.value.all ?? [])
const { proxiesCount, renderProxies } = useRenderProxyList(allProxies, props.name)
const isLatencyTesting = ref(false)

/**
 * Spring matching SwiftUI's `.spring(duration: 0.4, bounce: 0.2)`: unit mass, stiffness from
 * the perceptual duration, damping from the bounce.
 */
const SPRING_DURATION = 0.4
const SPRING_BOUNCE = 0.2
const SPRING_STIFFNESS = ((2 * Math.PI) / SPRING_DURATION) ** 2
const SPRING_DAMPING = (2 * (1 - SPRING_BOUNCE) * (2 * Math.PI)) / SPRING_DURATION
const SPRING_SUBSTEPS = 4
const SETTLE_POSITION = 0.001
const SETTLE_VELOCITY = 0.01

/** Logical open state: drives the page dim and scroll lock. */
const modalMode = ref(false)
/** The panel stays mounted for the whole closing animation. */
const panelMounted = ref(false)
const isAnimating = ref(false)
const closing = ref(false)
/** Swaps the in-list card for the panel only once the panel is ready to animate. */
const cardHidden = ref(false)
let preparing = false

useOverlayDimState(modalMode)
// Lets the proxy list skip overscan rows and defer scroll alignment until the motion settles.
provideCollapseTransition(isAnimating)

const cardWrapperRef = ref()
const cardRef = ref()
const backdropRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const panelBodyRef = ref<HTMLElement>()
const sourceCopyRef = ref<HTMLElement>()
const sharedIconRef = ref<HTMLElement>()

const panelStyle = ref<Record<string, string>>({})

/** Breathing room between the panel and the controls bar / dock. */
const PANEL_MARGIN = 16
const PANEL_MAX_HEIGHT = 520

type Geometry = {
  /** Offset from the panel's final top-left corner to the card's. */
  dx: number
  dy: number
  /** How much wider / taller the panel is than the card. */
  dw: number
  dh: number
  radius: string
}

let geometry: Geometry | null = null
let position = 0
let velocity = 0
let target = 0
let frameId = 0
let lastTime = 0

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve))

/**
 * The virtual proxy list learns its width from a ResizeObserver and measures rows afterwards,
 * so the panel's height changes over the first few frames. Wait for it to settle before
 * measuring, otherwise the centered panel moves away from the measured geometry.
 */
const waitForStableHeight = async (panel: HTMLElement, maxFrames = 4) => {
  let height = panel.offsetHeight

  for (let i = 0; i < maxFrames; i++) {
    await nextFrame()
    if (!panel.isConnected) return

    const next = panel.offsetHeight
    if (next === height) return
    height = next
  }
}

const lockPanelHeight = (panel: HTMLElement) => {
  panel.style.height = `${panel.offsetHeight}px`
}

/** Must run while the panel is at rest in its open position (no offset applied). */
const measureGeometry = (panel: HTMLElement, wrapper: HTMLElement): Geometry => {
  const source = wrapper.getBoundingClientRect()
  const final = panel.getBoundingClientRect()

  if (sourceCopyRef.value) {
    sourceCopyRef.value.style.width = `${source.width}px`
    sourceCopyRef.value.style.height = `${source.height}px`
  }

  return {
    dx: source.left - final.left,
    dy: source.top - final.top,
    dw: final.width - source.width,
    dh: final.height - source.height,
    radius: getComputedStyle(panel).borderTopLeftRadius,
  }
}

/** 0 = collapsed onto the card, 1 = open in the center. Overshoot past 1 is the bounce. */
const render = (progress: number) => {
  const panel = panelRef.value
  if (!panel || !geometry) return

  const { dx, dy, dw, dh, radius } = geometry
  const rest = 1 - progress

  panel.style.transform = `translate3d(${dx * rest}px, ${dy * rest}px, 0)`
  panel.style.clipPath = `inset(0px ${dw * rest}px ${dh * rest}px 0px round ${radius})`

  if (sharedIconRef.value) {
    sharedIconRef.value.style.transform = `translate3d(${-dw * rest}px, 0, 0)`
  }
  if (panelBodyRef.value) {
    panelBodyRef.value.style.opacity = `${clamp01((progress - 0.05) / 0.35)}`
  }
  if (sourceCopyRef.value) {
    sourceCopyRef.value.style.opacity = `${1 - clamp01(progress / 0.25)}`
  }
  if (backdropRef.value) {
    backdropRef.value.style.opacity = `${clamp01(progress)}`
  }
  setPageDim(progress)
}

const settle = () => {
  frameId = 0
  position = target
  velocity = 0
  render(position)

  if (target === 1) {
    if (panelRef.value) {
      panelRef.value.style.height = ''
      panelRef.value.style.clipPath = ''
    }
    isAnimating.value = false
    return
  }

  geometry = null
  setPageDimDismissHandler(null)
  panelMounted.value = false
  cardHidden.value = false
  closing.value = false
  isAnimating.value = false
}

const step = (now: number) => {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30) / SPRING_SUBSTEPS
  lastTime = now

  for (let i = 0; i < SPRING_SUBSTEPS; i++) {
    const acceleration = -SPRING_STIFFNESS * (position - target) - SPRING_DAMPING * velocity
    velocity += acceleration * dt
    position += velocity * dt
  }

  if (Math.abs(position - target) < SETTLE_POSITION && Math.abs(velocity) < SETTLE_VELOCITY) {
    settle()
    return
  }

  render(position)
  frameId = requestAnimationFrame(step)
}

/** Retargets the spring, keeping its current position and velocity, so motion can reverse. */
const animateTo = (value: number) => {
  target = value
  isAnimating.value = true

  if (prefersReducedMotion()) {
    cancelAnimationFrame(frameId)
    settle()
    return
  }

  if (!frameId) {
    lastTime = performance.now()
    frameId = requestAnimationFrame(step)
  }
}

const openPanel = async () => {
  const wrapper = cardWrapperRef.value as HTMLElement | undefined
  if (!wrapper) return

  preparing = true
  isAnimating.value = true
  disableProxiesPageScroll.value = true
  // Center between the controls bar and the dock instead of the whole viewport.
  const available = window.innerHeight - ctrlsBottom.value - dockTop.value - PANEL_MARGIN * 2
  panelStyle.value = {
    width: 'min(calc(100vw - 2rem), 32rem)',
    maxHeight: `${Math.round(Math.min(available, PANEL_MAX_HEIGHT))}px`,
  }
  setPageDimDismissHandler(handlerGroupClick)
  panelMounted.value = true

  await nextTick()
  // The panel is mounted invisibly while the list settles; the card stays in place meanwhile.
  if (panelRef.value) await waitForStableHeight(panelRef.value)
  preparing = false
  if (!panelRef.value) return

  lockPanelHeight(panelRef.value)
  geometry = measureGeometry(panelRef.value, wrapper)
  position = 0
  velocity = 0
  // Collapse onto the card before revealing; both land in the same frame.
  render(0)
  cardHidden.value = true
  modalMode.value = true
  animateTo(1)
}

const closePanel = () => {
  const wrapper = cardWrapperRef.value as HTMLElement | undefined

  closing.value = true
  modalMode.value = false
  disableProxiesPageScroll.value = false

  // At rest the panel may have resized while open; measure again and hold it for the motion.
  if (!frameId && panelRef.value && wrapper) {
    lockPanelHeight(panelRef.value)
    geometry = measureGeometry(panelRef.value, wrapper)
  }

  animateTo(0)
}

const handlerGroupClick = () => {
  if (preparing || closing.value) return

  if (!panelMounted.value) {
    openPanel()
  } else {
    closePanel()
  }
}

const handlerLatencyTest = async () => {
  if (isLatencyTesting.value) return

  isLatencyTesting.value = true
  try {
    await proxyGroupLatencyTest(props.name)
    isLatencyTesting.value = false
  } catch {
    isLatencyTesting.value = false
  }
}

onUnmounted(() => {
  cancelAnimationFrame(frameId)
  if (panelMounted.value) {
    setPageDim(0)
    setPageDimDismissHandler(null)
  }
  if (modalMode.value) {
    disableProxiesPageScroll.value = false
  }
})

useBounceOnVisible(cardRef)
</script>
