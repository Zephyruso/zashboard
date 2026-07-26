<template>
  <div
    role="tablist"
    :class="[
      'ios-segment bg-base-300/50 inline-flex rounded-[0.625rem] p-[3px] align-middle',
      block && 'flex w-full',
    ]"
  >
    <div
      ref="containerRef"
      class="relative flex flex-1 gap-0"
    >
      <div
        class="ios-segment-indicator bg-primary ring-base-content/5 pointer-events-none absolute top-0 bottom-0 left-0 rounded-[0.5rem] shadow-sm ring-1"
        :class="ready ? 'ios-segment-indicator-ready' : 'opacity-0'"
        :style="indicatorStyle"
      ></div>
      <button
        v-for="opt in options"
        ref="segmentRefs"
        :key="opt.value"
        :data-value="opt.value"
        role="tab"
        type="button"
        :class="[
          'ios-segment-item relative z-1 flex items-center justify-center gap-1 rounded-[0.5rem] px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-150',
          modelValue === opt.value
            ? 'text-primary-content'
            : 'text-base-content/55 hover:text-base-content/80',
          block && 'flex-1',
        ]"
        @click="select(opt.value)"
      >
        <component
          :is="opt.icon"
          v-if="opt.icon"
          class="h-4 w-4"
        />
        <span v-if="opt.label">{{ opt.label }}</span>
        <span
          v-if="opt.count !== undefined && opt.count !== ''"
          class="opacity-85"
        >
          ({{ opt.count }})
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { computed, nextTick, ref, watch, type Component } from 'vue'

export type SegmentOption = {
  value: string
  label?: string
  count?: string | number
  icon?: Component
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SegmentOption[]
    block?: boolean
  }>(),
  {
    block: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const containerRef = ref<HTMLDivElement>()
const segmentRefs = ref<HTMLButtonElement[]>([])
const { width } = useElementSize(containerRef)

const indicatorLeft = ref(0)
const indicatorWidth = ref(0)
const ready = ref(false)

const indicatorStyle = computed(() => ({
  transform: `translateX(${indicatorLeft.value}px)`,
  width: `${indicatorWidth.value}px`,
}))

const updateIndicator = async () => {
  await nextTick()
  const el = segmentRefs.value.find((s) => s.dataset.value === props.modelValue)
  if (!el) return
  indicatorLeft.value = el.offsetLeft
  indicatorWidth.value = el.offsetWidth
  if (!ready.value && indicatorWidth.value > 0) {
    requestAnimationFrame(() => (ready.value = true))
  }
}

const select = (value: string) => {
  if (value === props.modelValue) return
  emit('update:modelValue', value)
}

watch(() => [props.modelValue, props.options, width.value], updateIndicator, {
  immediate: true,
  deep: true,
})
</script>
