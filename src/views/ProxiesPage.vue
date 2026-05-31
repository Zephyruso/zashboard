<template>
  <div
    class="max-md:scrollbar-hidden h-full"
    :class="[
      disableProxiesPageScroll ? 'overflow-y-hidden' : 'overflow-y-scroll',
      disableProxiesPageTextSelect ? 'select-none' : '',
    ]"
    :style="padding"
    :id="PROXIES_PAGE"
    ref="proxiesRef"
    @scroll.passive="handleScroll"
    @click.capture="handlerLayoutClickCapture"
  >
    <ProxiesCtrl />
    <div class="proxy-layout flex flex-col gap-3 p-3 md:pr-1">
      <template
        v-for="section in renderLayoutSections"
        :key="section.key"
      >
        <div
          v-if="section.type === 'lanes'"
          class="proxy-layout-lanes grid gap-3"
          :style="getColumnsStyle(section.columns.length)"
        >
          <div
            v-for="column in section.columns"
            :key="column.key"
            class="proxy-layout-column flex min-w-0 flex-col gap-3"
            :class="isColumnDropTarget(section.key, column.index) && 'proxy-layout-column-over'"
            :data-proxy-layout-column="column.index"
            :data-proxy-layout-section="section.key"
            @dragover.prevent="handlerColumnDragOver($event, section.key, column.index)"
            @dragleave="handlerColumnDragLeave(section.key, column.index)"
            @drop.prevent="handlerColumnDrop($event, section.key, column.index)"
          >
            <div
              v-for="item in column.items"
              :key="item.key"
              class="proxy-layout-item min-w-0"
              :class="isEntryDropTarget(item) && 'proxy-layout-item-over'"
              :data-proxy-layout-key="item.key"
              :data-proxy-folder-id="item.type === 'folder' ? item.id : undefined"
              :data-proxy-group-name="item.type === 'group' ? item.name : undefined"
              @pointerdown="handlerEntryPointerDown($event, item)"
              @dragstart="handlerEntryDragStart($event, item)"
              @dragover.prevent="handlerEntryDragOver($event, item)"
              @dragleave="handlerEntryDragLeave(item)"
              @drop.prevent="handlerEntryDrop($event, item)"
              @dragend="handlerDragEnd"
            >
              <component
                :is="getRenderComponent(item)"
                v-bind="getRenderProps(item)"
              />
            </div>
            <div class="proxy-layout-column-drop min-h-3 rounded-lg" />
          </div>
        </div>
        <div
          v-else
          class="grid gap-3"
          :style="getColumnsStyle(resolvedColumns)"
        >
          <div
            class="proxy-layout-item min-w-0"
            :class="isEntryDropTarget(section.item) && 'proxy-layout-item-over'"
            :data-proxy-layout-key="section.item.key"
            :data-proxy-folder-id="section.item.type === 'folder' ? section.item.id : undefined"
            :data-proxy-group-name="section.item.type === 'group' ? section.item.name : undefined"
            :style="getSpanItemStyle(section.span)"
            @pointerdown="handlerEntryPointerDown($event, section.item)"
            @dragstart="handlerEntryDragStart($event, section.item)"
            @dragover.prevent="handlerEntryDragOver($event, section.item)"
            @dragleave="handlerEntryDragLeave(section.item)"
            @drop.prevent="handlerEntryDrop($event, section.item)"
            @dragend="handlerDragEnd"
          >
            <component
              :is="getRenderComponent(section.item)"
              v-bind="getRenderProps(section.item)"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import ProxiesCtrl from '@/components/controls/ProxiesCtrl'
import ProxyGroup from '@/components/proxies/ProxyGroup.vue'
import ProxyGroupFolder from '@/components/proxies/ProxyGroupFolder.vue'
import ProxyGroupForMobile from '@/components/proxies/ProxyGroupForMobile.vue'
import ProxyProvider from '@/components/proxies/ProxyProvider.vue'
import {
  buildProxyGroupFolders,
  clearProxyLayoutDragPayload,
  getDraggedProxyGroupName,
  getProxyLayoutDropTarget,
  getProxyLayoutDragPayload,
  moveProxyPageEntry,
  moveProxyPageEntryAfter,
  moveProxyPageEntryToEnd,
  moveProxyGroupInFolder,
  normalizeProxyGroupColumns,
  proxyLayoutPointerDropTarget,
  PROXY_LAYOUT_POINTER_START_KEY,
  setProxyGroupFolder,
  setProxyLayoutDragPayload,
  type ProxyGroupDragPayload,
  type ProxyLayoutDropTarget,
  type ProxyPageEntry,
} from '@/composables/proxyGroupFolders'
import { usePaddingForViews } from '@/composables/paddingViews'
import {
  disableProxiesPageScroll,
  isProxiesPageMounted,
  renderProxiesPageItems,
} from '@/composables/proxies'
import { PROXY_TAB_TYPE } from '@/constant'
import { isMiddleScreen, PROXIES_PAGE } from '@/helper/utils'
import { fetchProxies, proxiesTabShow } from '@/store/proxies'
import {
  disableProxiesPageTextSelect,
  proxyGroupColumns,
  twoColumnProxyGroup,
} from '@/store/settings'
import { useSessionStorage } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'

type ProxyLayoutColumn = {
  key: string
  index: number
  items: ProxyPageEntry[]
}

type ProxyLayoutSection =
  | {
      key: string
      type: 'lanes'
      columns: ProxyLayoutColumn[]
    }
  | {
      key: string
      type: 'span'
      item: ProxyPageEntry
      span: number
    }

const { padding } = usePaddingForViews({
  offsetTop: 0,
  offsetBottom: 0,
})
const renderPageItems = renderProxiesPageItems
const renderPageEntries = computed<ProxyPageEntry[]>(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER) {
    return renderPageItems.value.map((name) => ({
      key: `provider:${name}`,
      type: 'group',
      name,
    }))
  }

  return buildProxyGroupFolders(renderPageItems.value, resolvedColumns.value)
})
const renderLayoutSections = computed<ProxyLayoutSection[]>(() => {
  const columns = resolvedColumns.value
  const sections: ProxyLayoutSection[] = []
  let laneItems: ProxyPageEntry[] = []
  let laneIndex = 0

  const flushLanes = () => {
    if (!laneItems.length) {
      return
    }

    const laneColumns = Array.from({ length: columns }, (_, index) => ({
      key: `lane:${laneIndex}:column:${index}`,
      index,
      items: [] as ProxyPageEntry[],
    }))

    laneItems.forEach((item, index) => {
      laneColumns[index % columns].items.push(item)
    })

    sections.push({
      key: `lane:${laneIndex}:${laneItems[0].key}:${laneItems[laneItems.length - 1].key}`,
      type: 'lanes',
      columns: laneColumns,
    })
    laneItems = []
    laneIndex += 1
  }

  for (const item of renderPageEntries.value) {
    const span = item.type === 'folder' ? Math.min(item.span, columns) : 1

    if (columns > 1 && span > 1) {
      flushLanes()
      sections.push({
        key: `span:${item.key}`,
        type: 'span',
        item,
        span,
      })
      continue
    }

    laneItems.push(item)
  }

  flushLanes()
  return sections
})
const proxiesRef = ref()
const scrollStatus = useSessionStorage('cache/proxies-scroll-status', {
  [PROXY_TAB_TYPE.PROVIDER]: 0,
  [PROXY_TAB_TYPE.PROXIES]: 0,
})

const handleScroll = () => {
  if (!proxiesRef.value) return
  scrollStatus.value[proxiesTabShow.value] = proxiesRef.value.scrollTop
}

const waitTickUntilReady = (startTime = performance.now()) => {
  const proxiesEl = proxiesRef.value
  const isTimedOut = performance.now() - startTime > 300

  if (
    isTimedOut ||
    (proxiesEl && proxiesEl.scrollHeight > scrollStatus.value[proxiesTabShow.value])
  ) {
    if (!proxiesEl) return
    proxiesEl.scrollTo({
      top: scrollStatus.value[proxiesTabShow.value],
      behavior: 'smooth',
    })
  } else {
    requestAnimationFrame(() => {
      waitTickUntilReady(startTime)
    })
  }
}

watch(proxiesTabShow, () =>
  nextTick(() => {
    waitTickUntilReady()
  }),
)

isProxiesPageMounted.value = false

onMounted(() => {
  setTimeout(() => {
    isProxiesPageMounted.value = true
    nextTick(() => {
      waitTickUntilReady()
      fetchProxies()
    })
  })
})

const renderComponent = computed(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER) {
    return ProxyProvider
  }

  if (isMiddleScreen.value && displayTwoColumns.value) {
    return ProxyGroupForMobile
  }

  return ProxyGroup
})

const resolvedColumns = computed(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER || isMiddleScreen.value) {
    return 1
  }

  return normalizeProxyGroupColumns(proxyGroupColumns.value)
})

const getColumnsStyle = (columns: number) => ({
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
})

const getRenderComponent = (item: ProxyPageEntry) => {
  if (item.type === 'folder') {
    return ProxyGroupFolder
  }

  return renderComponent.value
}

const getRenderProps = (item: ProxyPageEntry) => {
  if (item.type === 'folder') {
    return {
      folder: item,
      columnCount: resolvedColumns.value,
    }
  }

  return {
    name: item.name,
    displayName: item.displayName,
  }
}

const displayTwoColumns = computed(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER && isMiddleScreen.value) {
    return false
  }
  return twoColumnProxyGroup.value && renderPageEntries.value.length > 1
})

const getSpanItemStyle = (span: number) => {
  return {
    gridColumn: `span ${span} / span ${span}`,
  }
}

const layoutDragEnabled = computed(() => {
  return proxiesTabShow.value === PROXY_TAB_TYPE.PROXIES
})
const dragOverKey = ref('')
const dragOverColumnKey = ref('')
const pointerDrag = ref<{
  payload: ProxyGroupDragPayload
  pointerId: number
  startX: number
  startY: number
  active: boolean
  sourceElement?: HTMLElement
}>()
const suppressNextLayoutClick = ref(false)

const currentEntryKeys = () => renderPageEntries.value.map((entry) => entry.key)

const getColumnDropKey = (sectionKey: string, columnIndex: number) =>
  `${sectionKey}:column:${columnIndex}`

const getColumnLastEntryKey = (sectionKey: string, columnIndex: number) => {
  const section = renderLayoutSections.value.find(
    (layoutSection) => layoutSection.type === 'lanes' && layoutSection.key === sectionKey,
  )

  if (!section || section.type !== 'lanes') {
    return undefined
  }

  return section.columns[columnIndex]?.items.at(-1)?.key
}

const getFolderChildNames = (folderId: string) => {
  const folder = renderPageEntries.value.find(
    (entry) => entry.type === 'folder' && entry.id === folderId,
  )

  return folder?.type === 'folder' ? folder.children.map((child) => child.name) : []
}

const isEntryDropTarget = (item: ProxyPageEntry) => {
  const pointerTarget = proxyLayoutPointerDropTarget.value

  return (
    dragOverKey.value === item.key ||
    (pointerTarget?.type === 'entry' && pointerTarget.key === item.key) ||
    (pointerTarget?.type === 'folder' && pointerTarget.key === item.key)
  )
}

const isColumnDropTarget = (sectionKey: string, columnIndex: number) => {
  const pointerTarget = proxyLayoutPointerDropTarget.value

  return (
    dragOverColumnKey.value === getColumnDropKey(sectionKey, columnIndex) ||
    (pointerTarget?.type === 'column' &&
      pointerTarget.sectionKey === sectionKey &&
      pointerTarget.columnIndex === columnIndex)
  )
}

const isInteractivePointerTarget = (target: EventTarget | null, allowNoLayoutDrag = false) => {
  const element = target instanceof HTMLElement ? target : null

  if (!element) {
    return false
  }

  const selector = allowNoLayoutDrag
    ? 'button, input, select, textarea, a, [role="button"]'
    : 'button, input, select, textarea, a, [role="button"], .no-layout-drag'

  return Boolean(element.closest(selector))
}

const applyLayoutDrop = (
  payload: ProxyGroupDragPayload | undefined,
  target: ProxyLayoutDropTarget | undefined,
) => {
  const groupName = getDraggedProxyGroupName(payload)

  if (!payload || !target) {
    return false
  }

  if (target.type === 'folder-child') {
    if (!groupName || groupName === target.groupName) {
      return false
    }

    setProxyGroupFolder(groupName, target.folderId)
    moveProxyGroupInFolder(
      target.folderId,
      groupName,
      target.groupName,
      getFolderChildNames(target.folderId),
    )
    return true
  }

  if (target.type === 'folder') {
    if (!groupName) {
      if (payload.type !== 'entry') {
        return false
      }

      moveProxyPageEntry(payload.key, target.key, currentEntryKeys())
      return payload.key !== target.key
    }

    setProxyGroupFolder(groupName, target.folderId)
    moveProxyGroupInFolder(
      target.folderId,
      groupName,
      undefined,
      getFolderChildNames(target.folderId),
    )
    return true
  }

  if (target.type === 'column') {
    const dragKey = payload.type === 'entry' ? payload.key : `group:${payload.name}`
    const lastEntryKey = getColumnLastEntryKey(target.sectionKey, target.columnIndex)

    if (payload.type === 'group') {
      setProxyGroupFolder(payload.name)
    }

    if (lastEntryKey && lastEntryKey !== dragKey) {
      moveProxyPageEntryAfter(dragKey, lastEntryKey, currentEntryKeys())
    } else {
      moveProxyPageEntryToEnd(dragKey, currentEntryKeys())
    }
    return true
  }

  if (payload.type === 'entry') {
    moveProxyPageEntry(payload.key, target.key, currentEntryKeys())
    return payload.key !== target.key
  }

  setProxyGroupFolder(payload.name)
  moveProxyPageEntry(`group:${payload.name}`, target.key, currentEntryKeys())
  return `group:${payload.name}` !== target.key
}

const clearPointerDrag = () => {
  const state = pointerDrag.value

  window.removeEventListener('pointermove', handlerPointerMove)
  window.removeEventListener('pointerup', handlerPointerUp)
  window.removeEventListener('pointercancel', handlerPointerCancel)
  if (state?.sourceElement?.hasPointerCapture(state.pointerId)) {
    state.sourceElement.releasePointerCapture(state.pointerId)
  }
  document.documentElement.classList.remove('proxy-layout-dragging')
  pointerDrag.value = undefined
  proxyLayoutPointerDropTarget.value = undefined
}

const startPointerDrag = (
  event: PointerEvent,
  payload: ProxyGroupDragPayload,
  options?: {
    allowNoLayoutDrag?: boolean
  },
) => {
  if (
    !layoutDragEnabled.value ||
    event.button !== 0 ||
    isInteractivePointerTarget(event.target, options?.allowNoLayoutDrag)
  ) {
    return
  }

  const sourceElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined

  pointerDrag.value = {
    payload,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    active: false,
    sourceElement,
  }
  window.addEventListener('pointermove', handlerPointerMove, { passive: false })
  window.addEventListener('pointerup', handlerPointerUp)
  window.addEventListener('pointercancel', handlerPointerCancel)
}

const handlerPointerMove = (event: PointerEvent) => {
  const state = pointerDrag.value

  if (!state || event.pointerId !== state.pointerId) {
    return
  }

  const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY)

  if (!state.active && distance < 6) {
    return
  }

  if (!state.active) {
    state.active = true
    suppressNextLayoutClick.value = true
    state.sourceElement?.setPointerCapture(event.pointerId)
    document.documentElement.classList.add('proxy-layout-dragging')
  }

  event.preventDefault()
  proxyLayoutPointerDropTarget.value = getProxyLayoutDropTarget(event.clientX, event.clientY)
}

const handlerPointerUp = (event: PointerEvent) => {
  const state = pointerDrag.value

  if (!state || event.pointerId !== state.pointerId) {
    return
  }

  if (state.active) {
    event.preventDefault()
    applyLayoutDrop(state.payload, getProxyLayoutDropTarget(event.clientX, event.clientY))
  }

  clearPointerDrag()
}

const handlerPointerCancel = (event: PointerEvent) => {
  if (pointerDrag.value?.pointerId === event.pointerId) {
    clearPointerDrag()
  }
}

provide(PROXY_LAYOUT_POINTER_START_KEY, startPointerDrag)

const handlerEntryPointerDown = (event: PointerEvent, item: ProxyPageEntry) => {
  startPointerDrag(event, {
    type: 'entry',
    key: item.key,
    groupName: item.type === 'group' ? item.name : undefined,
  })
}

const handlerLayoutClickCapture = (event: MouseEvent) => {
  if (!suppressNextLayoutClick.value) {
    return
  }

  suppressNextLayoutClick.value = false
  event.preventDefault()
  event.stopPropagation()
}

const handlerEntryDragStart = (event: DragEvent, item: ProxyPageEntry) => {
  event.stopPropagation()
  const target = event.target as HTMLElement | null
  const isInteractiveTarget = Boolean(
    target?.closest('button, input, select, textarea, a, [role="button"], .no-layout-drag'),
  )

  if (!layoutDragEnabled.value || isInteractiveTarget) {
    event.preventDefault()
    return
  }

  setProxyLayoutDragPayload(event, {
    type: 'entry',
    key: item.key,
    groupName: item.type === 'group' ? item.name : undefined,
  })
}

const handlerEntryDragOver = (event: DragEvent, item: ProxyPageEntry) => {
  event.stopPropagation()
  const payload = getProxyLayoutDragPayload(event)
  const isMovableEntry = payload?.type === 'entry' && payload.key !== item.key
  const isMovableGroup = payload?.type === 'group' && item.key !== `group:${payload.name}`

  if (!isMovableEntry && !isMovableGroup) {
    return
  }

  dragOverKey.value = item.key
}

const handlerEntryDragLeave = (item: ProxyPageEntry) => {
  if (dragOverKey.value === item.key) {
    dragOverKey.value = ''
  }
}

const handlerColumnDragOver = (event: DragEvent, sectionKey: string, columnIndex: number) => {
  const payload = getProxyLayoutDragPayload(event)

  if (!payload) {
    return
  }

  dragOverColumnKey.value = getColumnDropKey(sectionKey, columnIndex)
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handlerColumnDragLeave = (sectionKey: string, columnIndex: number) => {
  const key = getColumnDropKey(sectionKey, columnIndex)

  if (dragOverColumnKey.value === key) {
    dragOverColumnKey.value = ''
  }
}

const handlerColumnDrop = (event: DragEvent, sectionKey: string, columnIndex: number) => {
  applyLayoutDrop(getProxyLayoutDragPayload(event), {
    type: 'column',
    sectionKey,
    columnIndex,
  })
  dragOverColumnKey.value = ''
  clearProxyLayoutDragPayload()
}

const handlerEntryDrop = (event: DragEvent, item: ProxyPageEntry) => {
  event.stopPropagation()
  const payload = getProxyLayoutDragPayload(event)
  applyLayoutDrop(payload, {
    type: 'entry',
    key: item.key,
    groupName: item.type === 'group' ? item.name : undefined,
  })

  dragOverKey.value = ''
  dragOverColumnKey.value = ''
  clearProxyLayoutDragPayload()
}

const handlerDragEnd = () => {
  dragOverKey.value = ''
  dragOverColumnKey.value = ''
  clearProxyLayoutDragPayload()
}

onBeforeUnmount(clearPointerDrag)
</script>

<style scoped>
.proxy-layout-item {
  transition:
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.proxy-layout-item {
  cursor: grab;
  user-select: none;
  -webkit-user-drag: none;
  touch-action: pan-y;
}

.proxy-layout-item :deep(*) {
  -webkit-user-drag: none;
}

.proxy-layout-item:active {
  cursor: grabbing;
}

.proxy-layout-item-over {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-primary) 70%, transparent);
  transform: translateY(1px);
}

.proxy-layout-lanes {
  align-items: start;
}

.proxy-layout-column {
  min-height: 0.75rem;
  transition:
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.proxy-layout-column-over {
  background: color-mix(in srgb, var(--color-primary) 5%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

:global(.proxy-layout-dragging),
:global(.proxy-layout-dragging *) {
  cursor: grabbing !important;
  user-select: none !important;
}
</style>
