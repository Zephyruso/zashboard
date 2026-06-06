<template>
  <div
    ref="rootRef"
    class="relative w-full"
    :style="{ height: `${totalSize}px` }"
  >
    <div
      class="absolute top-0 right-0 left-0 flex flex-col gap-2"
      :style="{ transform: `translate3d(0, ${virtualOffset}px, 0)` }"
    >
      <div
        v-for="row in visibleRows"
        :key="row.key.toString()"
        class="grid gap-2"
        :style="{ gridTemplateColumns }"
      >
        <ProxyNodeCard
          v-for="node in row.nodes"
          :key="node"
          :name="node"
          :group-name="name"
          :active="node === now"
          @click.stop="handlerProxySelect(name, node)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import { handlerProxySelect } from '@/store/proxies'
import { minProxyCardWidth, proxyCardSize } from '@/store/settings'
import { PROXY_CARD_SIZE } from '@/constant'
import { useElementSize } from '@vueuse/core'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ProxyNodeCard from './ProxyNodeCard.vue'

const props = defineProps<{
  name: string
  now?: string
  nodes: string[]
}>()

const rootRef = ref<HTMLElement | null>(null)
const scrollParent = ref<HTMLElement | null>(null)
const { width } = useElementSize(scrollParent)

const findProxyScrollParent = (el: HTMLElement | null): HTMLElement | null => {
  const parent = el?.parentElement

  if (!parent) return null
  if (parent.classList.contains(PROXIES_PARENT_CLASS)) return parent

  return findProxyScrollParent(parent)
}

onMounted(() => {
  nextTick(() => {
    scrollParent.value = findProxyScrollParent(rootRef.value)
    nextTick(scrollActiveIntoView)
  })
})

const columnCount = computed(() => {
  const containerWidth = width.value || scrollParent.value?.clientWidth || minProxyCardWidth.value
  const gap = 8

  return Math.max(1, Math.floor((containerWidth + gap) / (minProxyCardWidth.value + gap)))
})

const gridTemplateColumns = computed(() => `repeat(${columnCount.value}, minmax(0, 1fr))`)
const rowCount = computed(() => Math.ceil(props.nodes.length / columnCount.value))
const estimatedRowSize = computed(() => (proxyCardSize.value === PROXY_CARD_SIZE.LARGE ? 92 : 68))
const virtualOptions = computed(() => ({
  count: rowCount.value,
  getScrollElement: () => scrollParent.value,
  estimateSize: () => estimatedRowSize.value,
  overscan: 8,
}))

const rowVirtualizer = useVirtualizer(virtualOptions)
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())
const virtualOffset = computed(() => virtualRows.value[0]?.start ?? 0)
const visibleRows = computed(() => {
  const columns = columnCount.value

  return virtualRows.value.map((row) => {
    const start = row.index * columns

    return {
      ...row,
      nodes: props.nodes.slice(start, start + columns),
    }
  })
})
const nodeIndexByName = computed(() => {
  const result = new Map<string, number>()

  props.nodes.forEach((node, index) => {
    result.set(node, index)
  })

  return result
})
const activeRowIndex = computed(() => {
  const index = nodeIndexByName.value.get(props.now ?? '') ?? -1

  if (index < 0) return -1

  return Math.floor(index / columnCount.value)
})

const scrollActiveIntoView = () => {
  if (!scrollParent.value || activeRowIndex.value < 0) return

  rowVirtualizer.value.scrollToIndex(activeRowIndex.value, { align: 'center' })
}

watch(columnCount, () => {
  rowVirtualizer.value.measure()
  nextTick(scrollActiveIntoView)
})

watch(activeRowIndex, () => {
  nextTick(scrollActiveIntoView)
})
</script>
