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
      :class="[!cardHidden && 'invisible', closing && 'pointer-events-none']"
      style="opacity: 0"
      ref="backdropRef"
    />
    <div
      class="base-container absolute inset-0 flex flex-col p-2"
      :class="cardHidden && 'invisible'"
      @contextmenu.prevent.stop="handlerLatencyTest"
      ref="cardRef"
    >
      <ProxyGroupHeaderForMobile
        :name="name"
        :proxies-count="proxiesCount"
        :is-latency-testing="isLatencyTesting"
        :display-content="false"
        :animate-latency="!cardHidden"
        @latency-test="handlerLatencyTest"
      />
    </div>
    <!-- Fixed final layout; only compositor transforms/opacity change during the spring.
         Four translated rounded clips keep every corner and the text at their original size.
         Both surfaces stay below the controls and dock; their dim layers share our timeline. -->
    <div
      v-if="panelMounted"
      class="pointer-events-none fixed inset-x-0 z-[25] flex items-center justify-center"
      :class="!cardHidden && 'invisible'"
      :style="{ top: `${panelBounds.top}px`, bottom: `${panelBounds.bottom}px` }"
    >
      <div
        class="proxy-group-panel relative flex origin-top-left flex-col rounded-xl"
        :class="[
          closing ? 'pointer-events-none' : 'pointer-events-auto',
          isAnimating && 'proxy-group-panel-moving',
        ]"
        :style="panelStyle"
        @contextmenu.prevent.stop="handlerLatencyTest"
        ref="panelRef"
      >
        <div
          class="proxy-group-shadow pointer-events-none absolute inset-0 origin-top-left rounded-[inherit] shadow-xl"
          ref="shadowRef"
        />
        <div
          class="proxy-group-glass base-container overlay-glass pointer-events-none absolute inset-0"
          ref="glassRef"
        />
        <div
          class="proxy-group-panel-clip relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
        >
          <div
            class="proxy-group-panel-clip"
            ref="topRightClipRef"
          >
            <div
              class="proxy-group-panel-clip"
              ref="bottomRightClipRef"
            >
              <div
                class="proxy-group-panel-clip"
                ref="bottomLeftClipRef"
              >
                <div
                  class="proxy-group-motion-surface pointer-events-none absolute inset-0 rounded-[inherit]"
                  ref="surfaceRef"
                />
                <div
                  class="proxy-group-panel-content relative flex min-h-0 flex-1 origin-top-left flex-col p-2"
                  ref="panelContentRef"
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
                      ref="panelListRef"
                    >
                      <Component
                        :is="groupProxiesByProvider ? ProxiesByProvider : ProxiesContent"
                        :name="name"
                        :now="proxyGroup.now"
                        :render-proxies="renderProxies"
                        :initial-width="initialListSize.width"
                        :initial-height="initialListSize.height"
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
                      :animate-latency="false"
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { proxyGroupLatencyTest, proxyMap } from '@/assembly/proxies'
import { useBounceOnVisible } from '@/composables/use-bounce-on-visible'
import { provideCollapseTransition } from '@/composables/use-collapse-transition'
import { useOverlayDimState } from '@/composables/use-dialog-state'
import { useRenderProxyList } from '@/composables/use-render-proxy-list'
import { ctrlsBottom, dockTop, proxyFolderBarBottom } from '@/helper/padding-views'
import { animatePageDim, clearPageDim, setPageDim } from '@/helper/page-dim'
import { disableProxiesPageScroll } from '@/helper/proxies'
import { animationTime, createSpringMotion, type SpringMotion } from '@/helper/spring-motion'
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import {
  customCSS,
  groupProxiesByProvider,
  minProxyCardWidth,
  proxyCardSize,
  truncateProxyName,
} from '@/store/settings'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import ProxiesByProvider from './ProxiesByProvider.vue'
import ProxiesContent from './ProxiesContent.vue'
import ProxyGroupHeaderForMobile from './ProxyGroupHeaderForMobile.vue'
import ProxyIcon from './ProxyIcon.vue'

const props = defineProps<{ name: string }>()
const proxyGroup = computed(() => proxyMap.value[props.name])
const allProxies = computed(() => proxyGroup.value.all ?? [])
const { proxiesCount, renderProxies } = useRenderProxyList(allProxies, props.name)
const isLatencyTesting = ref(false)
const modalMode = ref(false)
const panelMounted = ref(false)
const isAnimating = ref(false)
const closing = ref(false)
const cardHidden = ref(false)
let preparing = false
let pendingClose = false
let prepareToken = 0
const dimOwner = {}

useOverlayDimState(modalMode)
provideCollapseTransition(isAnimating)

const cardWrapperRef = ref<HTMLElement>()
const cardRef = ref<HTMLElement>()
const backdropRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const panelContentRef = ref<HTMLElement>()
const topRightClipRef = ref<HTMLElement>()
const bottomRightClipRef = ref<HTMLElement>()
const bottomLeftClipRef = ref<HTMLElement>()
const shadowRef = ref<HTMLElement>()
const panelBodyRef = ref<HTMLElement>()
const panelListRef = ref<HTMLElement>()
const sourceCopyRef = ref<HTMLElement>()
const sharedIconRef = ref<HTMLElement>()
const glassRef = ref<HTMLElement>()
const surfaceRef = ref<HTMLElement>()
const panelStyle = ref<Record<string, string>>({})
const panelBounds = ref({ top: 0, bottom: 0 })
const initialListSize = ref({ width: 0, height: 0 })

const PANEL_MARGIN = 16
const PANEL_MAX_HEIGHT = 520

type Geometry = { dx: number; dy: number; dw: number; dh: number; width: number; height: number }
let geometry: Geometry | null = null
let position = 0
let target = 0
let running: { motion: SpringMotion; start: number } | null = null
let animations: Animation[] = []
let cachedHeight: { key: string; height: number } | undefined
let sizeKey = ''

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve))

// Width/viewport seeds avoid the virtualizer's initial one-column, empty-viewport pass.
// Wrapped names and provider sections still need real measurements before the shell moves.
const waitForStableHeight = async (panel: HTMLElement, list: HTMLElement | undefined) => {
  const read = () => `${panel.offsetHeight}:${list?.scrollHeight ?? 0}`
  let size = read()
  let stable = 0
  for (let i = 0; i < 12; i++) {
    await nextFrame()
    if (!panel.isConnected) return
    const next = read()
    if (next === size) {
      if (++stable >= 2) return
    } else {
      stable = 0
      size = next
    }
  }
}

const measureGeometry = (panel: HTMLElement, wrapper: HTMLElement): Geometry => {
  const source = wrapper.getBoundingClientRect()
  const final = panel.getBoundingClientRect()
  panel.style.height = `${final.height}px`
  if (sourceCopyRef.value) {
    sourceCopyRef.value.style.width = `${source.width}px`
    sourceCopyRef.value.style.height = `${source.height}px`
  }
  return {
    dx: source.left - final.left,
    dy: source.top - final.top,
    dw: final.width - source.width,
    dh: final.height - source.height,
    width: final.width,
    height: final.height,
  }
}

// Intersect four full-size rounded rectangles, one for each corner. Their translations
// move the right/bottom edges without ever scaling the radius or repainting a clip path.
const stylesAt = (progress: number) => {
  const { dx, dy, dw, dh, width, height } = geometry!
  const rest = 1 - progress
  const clipRest = Math.max(0, rest)
  const sx = Math.max(0.01, (width - dw * clipRest) / width)
  const sy = Math.max(0.01, (height - dh * clipRest) / height)
  return {
    panel: `translate3d(${dx * rest}px, ${dy * rest}px, 0)`,
    topRight: `translate3d(${-dw * clipRest}px, 0, 0)`,
    bottomRight: `translate3d(0, ${-dh * clipRest}px, 0)`,
    bottomLeft: `translate3d(${dw * clipRest}px, 0, 0)`,
    content: `translate3d(0, ${dh * clipRest}px, 0)`,
    shadow: `scale(${sx}, ${sy})`,
    icon: `translate3d(${-dw * clipRest}px, 0, 0)`,
    body: clamp01((progress - 0.05) / 0.35),
    source: 1 - clamp01(progress / 0.25),
    backdrop: clamp01(progress),
  }
}

const render = (progress: number) => {
  if (!panelRef.value || !geometry) return
  const style = stylesAt(progress)
  panelRef.value.style.transform = style.panel
  if (topRightClipRef.value) topRightClipRef.value.style.transform = style.topRight
  if (bottomRightClipRef.value) bottomRightClipRef.value.style.transform = style.bottomRight
  if (bottomLeftClipRef.value) bottomLeftClipRef.value.style.transform = style.bottomLeft
  if (shadowRef.value) shadowRef.value.style.transform = style.shadow
  if (panelContentRef.value) panelContentRef.value.style.transform = style.content
  if (sharedIconRef.value) sharedIconRef.value.style.transform = style.icon
  if (panelBodyRef.value) panelBodyRef.value.style.opacity = String(style.body)
  if (sourceCopyRef.value) sourceCopyRef.value.style.opacity = String(style.source)
  if (backdropRef.value) backdropRef.value.style.opacity = String(style.backdrop)
}

const cancelAnimations = () => {
  for (const animation of animations) {
    animation.onfinish = null
    animation.cancel()
  }
  animations = []
}

const settle = () => {
  position = target
  running = null
  render(position)
  cancelAnimations()
  if (target === 1) {
    const panel = panelRef.value
    if (panel) {
      if (sizeKey) cachedHeight = { key: sizeKey, height: panel.offsetHeight }
      delete panelStyle.value.height
      panel.style.height = ''
    }
    // Reveal fully opaque glass UNDER the solid surface. Cross-fading both surfaces
    // would make their combined coverage dip in the middle, flashing the background.
    if (glassRef.value) glassRef.value.style.opacity = '1'
    if (surfaceRef.value) surfaceRef.value.style.opacity = '0'
    if (!prefersReducedMotion()) {
      if (surfaceRef.value) animations.push(surfaceRef.value.animate({ opacity: [1, 0] }, 120))
    }
    setPageDim(dimOwner, 1, handlerGroupClick)
    isAnimating.value = false
    return
  }

  clearPageDim(dimOwner)
  geometry = null
  panelMounted.value = false
  cardHidden.value = false
  closing.value = false
  isAnimating.value = false
}

/** Keep position AND velocity when reversing; all native effects share one start time. */
const animateTo = (value: number) => {
  const now = animationTime()
  const state = running ? running.motion.sample(now - running.start) : { position, velocity: 0 }
  cancelAnimations()
  target = value
  isAnimating.value = true
  if (glassRef.value) glassRef.value.style.opacity = '0'
  if (surfaceRef.value) surfaceRef.value.style.opacity = '1'
  if (prefersReducedMotion()) {
    settle()
    return
  }

  const motion = createSpringMotion(state, target)
  running = { motion, start: now }
  render(state.position)
  const frames = motion.points.map(({ offset, position }) => ({ offset, ...stylesAt(position) }))
  const animate = (el: HTMLElement | undefined, keyframes: Keyframe[]) => {
    if (!el) return
    const animation = el.animate(keyframes, {
      duration: motion.duration,
      fill: 'both',
      easing: 'linear',
    })
    animation.startTime = now
    animations.push(animation)
    return animation
  }
  const primary = animate(
    panelRef.value,
    frames.map((frame) => ({ offset: frame.offset, transform: frame.panel })),
  )
  animate(
    topRightClipRef.value,
    frames.map((frame) => ({ offset: frame.offset, transform: frame.topRight })),
  )
  animate(
    bottomRightClipRef.value,
    frames.map((frame) => ({ offset: frame.offset, transform: frame.bottomRight })),
  )
  animate(
    bottomLeftClipRef.value,
    frames.map((frame) => ({ offset: frame.offset, transform: frame.bottomLeft })),
  )
  animate(
    shadowRef.value,
    frames.map((frame) => ({ offset: frame.offset, transform: frame.shadow })),
  )
  animate(
    panelContentRef.value,
    frames.map((frame) => ({ offset: frame.offset, transform: frame.content })),
  )
  animate(
    sharedIconRef.value,
    frames.map((frame) => ({ offset: frame.offset, transform: frame.icon })),
  )
  animate(
    panelBodyRef.value,
    frames.map((frame) => ({ offset: frame.offset, opacity: frame.body })),
  )
  animate(
    sourceCopyRef.value,
    frames.map((frame) => ({ offset: frame.offset, opacity: frame.source })),
  )
  animate(
    backdropRef.value,
    frames.map((frame) => ({ offset: frame.offset, opacity: frame.backdrop })),
  )
  animatePageDim(dimOwner, motion, now, closing.value ? null : handlerGroupClick)
  if (primary) primary.onfinish = settle
  else settle()
}

const openPanel = async () => {
  const wrapper = cardWrapperRef.value
  if (!wrapper) return
  const token = ++prepareToken
  preparing = true
  pendingClose = false
  isAnimating.value = true
  disableProxiesPageScroll.value = true
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const width = Math.min(window.innerWidth - 2 * rem, 32 * rem)
  // Snapshot the whole top chrome, including the folder bar, before measuring the spring.
  // Its sticky-padding transition must not move the panel's coordinate space mid-flight.
  panelBounds.value = {
    top: Math.max(ctrlsBottom.value, proxyFolderBarBottom.value),
    bottom: dockTop.value,
  }
  const available =
    window.innerHeight - panelBounds.value.top - panelBounds.value.bottom - PANEL_MARGIN * 2
  const maxHeight = Math.max(1, Math.round(Math.min(available, PANEL_MAX_HEIGHT)))
  initialListSize.value = { width: width - rem, height: Math.max(0, maxHeight - 6 * rem) }
  // Only reuse known fixed-row layouts. Wrapping/provider layout keeps the measurement path.
  sizeKey =
    truncateProxyName.value && !groupProxiesByProvider.value && document.fonts.status === 'loaded'
      ? [
          width,
          maxHeight,
          rem,
          getComputedStyle(wrapper).font,
          proxyCardSize.value,
          minProxyCardWidth.value,
          renderProxies.value.length,
          customCSS.value,
        ].join('|')
      : ''
  const cached = sizeKey && cachedHeight?.key === sizeKey ? cachedHeight.height : undefined
  panelStyle.value = {
    width: 'min(calc(100vw - 2rem), 32rem)',
    maxHeight: `${maxHeight}px`,
    ...(cached ? { height: `${cached}px` } : {}),
  }
  panelMounted.value = true
  await nextTick()
  if (!cached && panelRef.value) await waitForStableHeight(panelRef.value, panelListRef.value)
  if (token !== prepareToken || !panelRef.value) return
  preparing = false
  if (pendingClose) {
    pendingClose = false
    disableProxiesPageScroll.value = false
    target = 0
    settle()
    return
  }

  geometry = measureGeometry(panelRef.value, wrapper)
  position = 0
  render(0)
  cardHidden.value = true
  modalMode.value = true
  animateTo(1)
}

const reopenPanel = () => {
  closing.value = false
  modalMode.value = true
  disableProxiesPageScroll.value = true
  animateTo(1)
}

const closePanel = () => {
  closing.value = true
  modalMode.value = false
  disableProxiesPageScroll.value = false
  if (!running && panelRef.value && cardWrapperRef.value) {
    geometry = measureGeometry(panelRef.value, cardWrapperRef.value)
  }
  animateTo(0)
}

const handlerGroupClick = () => {
  if (preparing) {
    pendingClose = !pendingClose
  } else if (closing.value) {
    reopenPanel()
  } else if (!panelMounted.value) {
    void openPanel()
  } else {
    closePanel()
  }
}

const handlerLatencyTest = async () => {
  if (isLatencyTesting.value) return
  isLatencyTesting.value = true
  try {
    await proxyGroupLatencyTest(props.name)
  } catch {
    // The latency test reports backend errors itself.
  } finally {
    isLatencyTesting.value = false
  }
}

onBeforeUnmount(() => {
  prepareToken++
  cancelAnimations()
  clearPageDim(dimOwner)
  if (modalMode.value || preparing) disableProxiesPageScroll.value = false
})

useBounceOnVisible(cardRef)
</script>

<style scoped>
.proxy-group-motion-surface {
  background: var(--color-base-100);
}

.proxy-group-panel-clip {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-radius: inherit;
  /* A stationary mask preserves the rounded overflow when WebKit changes layers at rest.
     Glass lives outside this mask so its backdrop can still sample the page. */
  -webkit-mask-image: linear-gradient(white, white);
  mask-image: linear-gradient(white, white);
}

.proxy-group-panel-moving > .proxy-group-glass {
  visibility: hidden;
}

.proxy-group-panel-moving,
.proxy-group-panel-moving .proxy-group-panel-clip,
.proxy-group-panel-moving .proxy-group-panel-content {
  will-change: transform;
}
</style>
