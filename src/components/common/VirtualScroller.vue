<template>
  <div
    ref="parentRef"
    class="smooth-scroll-container virtual-scroller-scroll flex h-full w-full flex-col overflow-y-auto overscroll-contain"
  >
    <slot name="before" />
    <div
      :style="{
        height: `${totalSize}px`,
      }"
      class="relative w-full shrink-0"
      v-if="data.length > 0"
    >
      <div
        :class="['base-container glass virtual-scroller absolute right-3 left-3', contentClass]"
        :style="{
          top: `${paddingTop + 12}px`,
          height: `${virtualContentSize}px`,
        }"
      >
        <div
          class="virtual-scroller-window absolute top-0 right-0 left-0"
          :style="{
            transform: `translate3d(0, ${virtualOffset}px, 0)`,
          }"
        >
          <div
            v-for="row in virtualRows"
            :key="row.key.toString()"
            :data-index="row.index"
            :ref="props.dynamicSize ? (ref) => measureElement(ref as Element | null) : undefined"
            :class="getBorderClass(row.index)"
          >
            <slot
              :item="data[row.index]"
              :index="row.index"
            />
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="m-3"
      :style="{ marginTop: `${paddingTop + 12}px`, marginBottom: `${paddingBottom}px` }"
    >
      <EmptyState
        :icon="CircleStackIcon"
        :title="$t('noData')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { CircleStackIcon } from '@heroicons/vue/24/outline'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, onBeforeUnmount, ref } from 'vue'

const { paddingTop, paddingBottom } = usePaddingForViews({
  offsetTop: 0,
  offsetBottom: 0,
})
const parentRef = ref<HTMLElement | null>(null)
const props = withDefaults(
  defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[]
    size?: number
    overscan?: number
    contentClass?: string
    dynamicSize?: boolean
  }>(),
  {
    data: () => [],
    size: 64,
    overscan: 24,
    contentClass: '',
    dynamicSize: false,
  },
)

const virtualOptions = computed(() => {
  return {
    count: props.data.length,
    getScrollElement: () => parentRef.value,
    estimateSize: () => props.size,
    overscan: props.overscan,
    paddingStart: paddingTop.value,
    paddingEnd: paddingBottom.value + 24,
  }
})

const rowVirtualizer = useVirtualizer(virtualOptions)
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())
const virtualContentSize = computed(() =>
  Math.max(0, totalSize.value - paddingTop.value - paddingBottom.value - 24),
)
const virtualOffset = computed(() =>
  Math.max(0, (virtualRows.value[0]?.start ?? paddingTop.value) - paddingTop.value),
)
const getBorderClass = (index: number) => {
  if (index !== 0) {
    return 'border-base-border border-t'
  }
  return ''
}

const pendingMeasureElements = new Set<Element>()
let measureFrame: number | undefined

const flushMeasureElements = () => {
  measureFrame = undefined

  const elements = Array.from(pendingMeasureElements)
  pendingMeasureElements.clear()

  for (const el of elements) {
    rowVirtualizer.value.measureElement(el)
  }
}

const measureElement = (el: Element | null) => {
  if (!el) {
    return
  }

  pendingMeasureElements.add(el)

  if (measureFrame === undefined) {
    measureFrame = requestAnimationFrame(flushMeasureElements)
  }

  return undefined
}

onBeforeUnmount(() => {
  if (measureFrame !== undefined) {
    cancelAnimationFrame(measureFrame)
  }

  pendingMeasureElements.clear()
})
</script>
