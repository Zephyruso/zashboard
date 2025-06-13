<template>
  <div
    ref="parentRef"
    class="h-full overflow-auto p-2"
    :class="{
      'select-none': isDragging,
    }"
    @touchstart.passive.stop
    @touchmove.passive.stop
    @touchend.passive.stop
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <div :style="{ height: `${totalSize}px` }">
      <table
        :class="[
          'table-zebra table rounded-none shadow-md',
          sizeOfTable,
          isManualTable && 'table-fixed',
        ]"
        :style="
          isManualTable && {
            width: `${tanstackTable.getCenterTotalSize()}px`,
          }
        "
      >
        <thead class="bg-base-100 sticky -top-2 z-10">
          <tr
            v-for="headerGroup in tanstackTable.getHeaderGroups()"
            :key="headerGroup.id"
          >
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              :colSpan="header.colSpan"
              class="relative"
              :class="[
                header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                header.column.getIsPinned && header.column.getIsPinned() === 'left'
                  ? 'sticky -left-2 z-20 backdrop-blur-md'
                  : '',
              ]"
              :style="
                isManualTable && {
                  width: `${header.getSize()}px`,
                }
              "
              @click="header.column.getToggleSortingHandler()?.($event)"
            >
              <div class="flex items-center gap-1">
                <FlexRender
                  v-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                >
                </FlexRender>
                <ArrowUpCircleIcon
                  class="h-4 w-4"
                  v-if="header.column.getIsSorted() === 'asc'"
                />
                <ArrowDownCircleIcon
                  class="h-4 w-4"
                  v-if="header.column.getIsSorted() === 'desc'"
                />
                <div>
                  <button
                    v-if="header.column.getCanGroup()"
                    class="btn btn-xs btn-circle btn-ghost"
                    @click.stop="() => header.column.getToggleGroupingHandler()()"
                  >
                    <MagnifyingGlassMinusIcon
                      v-if="header.column.getIsGrouped()"
                      class="h-4 w-4"
                    />
                    <MagnifyingGlassPlusIcon
                      v-else
                      class="h-4 w-4"
                    />
                  </button>
                  <button
                    v-if="
                      header.column.id === CONNECTIONS_TABLE_ACCESSOR_KEY.Host ||
                      header.column.id === CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost
                    "
                    class="btn btn-xs btn-circle btn-ghost"
                    @click.stop="() => handlePinColumn(header.column)"
                  >
                    <MapPinIcon
                      v-if="header.column.getIsPinned() !== 'left'"
                      class="h-4 w-4"
                    />
                    <XMarkIcon
                      v-else
                      class="h-4 w-4"
                    />
                  </button>
                </div>
              </div>
              <div
                v-if="isManualTable"
                @dblclick="() => header.column.resetSize()"
                @mousedown="(e) => header.getResizeHandler()(e)"
                @touchstart="(e) => header.getResizeHandler()(e)"
                class="resizer bg-neutral absolute top-0 right-0 h-full w-1 cursor-ew-resize"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(virtualRow, index) in virtualRows"
            :key="virtualRow.key.toString()"
            :style="{
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start - index * virtualRow.size}px)`,
            }"
            class="bg-base-100 hover:bg-primary! hover:text-primary-content"
            :class="{
              'cursor-pointer': !isDragging,
              'cursor-grabbing': isDragging,
            }"
            @click="handlerClickRow(rows[virtualRow.index])"
          >
            <td
              v-for="cell in rows[virtualRow.index].getVisibleCells()"
              :key="cell.id"
              :class="[
                isManualTable
                  ? 'truncate text-sm'
                  : twMerge(
                      'text-sm whitespace-nowrap',
                      [
                        CONNECTIONS_TABLE_ACCESSOR_KEY.Download,
                        CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed,
                        CONNECTIONS_TABLE_ACCESSOR_KEY.Upload,
                        CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed,
                      ].includes(cell.column.id as CONNECTIONS_TABLE_ACCESSOR_KEY) && 'min-w-20',
                      CONNECTIONS_TABLE_ACCESSOR_KEY.Host ===
                        (cell.column.id as CONNECTIONS_TABLE_ACCESSOR_KEY) && 'max-w-xs truncate',
                      [
                        CONNECTIONS_TABLE_ACCESSOR_KEY.Chains,
                        CONNECTIONS_TABLE_ACCESSOR_KEY.Rule,
                      ].includes(cell.column.id as CONNECTIONS_TABLE_ACCESSOR_KEY) &&
                        'max-w-xl truncate',
                    ),
                cell.column.getIsPinned && cell.column.getIsPinned() === 'left'
                  ? 'sticky -left-2 z-20 shadow-md backdrop-blur-md'
                  : '',
              ]"
              @contextmenu="handleCellRightClick($event, cell)"
            >
              <template v-if="cell.column.getIsGrouped()">
                <template v-if="rows[virtualRow.index].getCanExpand()">
                  <div class="flex items-center">
                    <MagnifyingGlassMinusIcon
                      v-if="rows[virtualRow.index].getIsExpanded()"
                      class="mr-1 inline-block h-4 w-4"
                    />
                    <MagnifyingGlassPlusIcon
                      v-else
                      class="mr-1 inline-block h-4 w-4"
                    />
                    <FlexRender
                      :render="cell.column.columnDef.cell"
                      :props="cell.getContext()"
                    />
                    <span class="ml-1"> ({{ rows[virtualRow.index].subRows.length }}) </span>
                  </div>
                </template>
              </template>
              <FlexRender
                v-else
                :render="
                  cell.getIsAggregated()
                    ? cell.column.columnDef.aggregatedCell
                    : cell.column.columnDef.cell
                "
                :props="cell.getContext()"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { disconnectByIdAPI } from '@/api'
import { useConnections } from '@/composables/connections'
import { useNotification } from '@/composables/notification'
import {
  CONNECTIONS_TABLE_ACCESSOR_KEY,
  PROXY_CHAIN_DIRECTION,
  TABLE_SIZE,
  TABLE_WIDTH_MODE,
} from '@/constant'
import {
  getDestinationFromConnection,
  getDestinationTypeFromConnection,
  getHostFromConnection,
  getInboundUserFromConnection,
  getNetworkTypeFromConnection,
  getProcessFromConnection,
} from '@/helper'
import { getIPLabelFromMap } from '@/helper/sourceip'
import { fromNow, prettyBytesHelper } from '@/helper/utils'
import { renderConnections } from '@/store/connections'
import {
  connectionTableColumns,
  proxyChainDirection,
  tableSize,
  tableWidthMode,
} from '@/store/settings'
import type { Connection } from '@/types'
import {
  ArrowDownCircleIcon,
  ArrowRightCircleIcon,
  ArrowUpCircleIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MapPinIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import {
  FlexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  isFunction,
  useVueTable,
  type Column,
  type ColumnDef,
  type ColumnPinningState,
  type ExpandedState,
  type GroupingState,
  type Row,
  type SortingState,
} from '@tanstack/vue-table'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'
import { computed, h, ref, type VNode } from 'vue'
import { useI18n } from 'vue-i18n'
import ProxyName from '../proxies/ProxyName.vue'

const { handlerInfo } = useConnections()
const { showNotification } = useNotification()
const columnWidthMap = useStorage('config/table-column-width', {
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Close]: 50,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Host]: 320,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Chains]: 320,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Rule]: 200,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Download]: 80,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed]: 80,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Upload]: 80,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed]: 80,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Type]: 150,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Process]: 150,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP]: 150,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort]: 100,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost]: 200,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Destination]: 150,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime]: 100,
} as Record<CONNECTIONS_TABLE_ACCESSOR_KEY, number>)

const isManualTable = computed(() => tableWidthMode.value === TABLE_WIDTH_MODE.MANUAL)
const { t } = useI18n()
const columns: ColumnDef<Connection>[] = [
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Close),
    enableSorting: false,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Close,
    cell: ({ row }) => {
      return h(
        'button',
        {
          class: 'btn btn-xs btn-circle',
          onClick: (e) => {
            const connection = row.original

            e.stopPropagation()
            disconnectByIdAPI(connection.id)
          },
        },
        [
          h(XMarkIcon, {
            class: 'h-4 w-4',
          }),
        ],
      )
    },
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Type),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Type,
    accessorFn: getNetworkTypeFromConnection,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Process),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Process,
    accessorFn: getProcessFromConnection,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Host),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Host,
    accessorFn: getHostFromConnection,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost,
    accessorFn: (original) => original.metadata.sniffHost || '-',
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Rule),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Rule,
    accessorFn: (original) =>
      !original.rulePayload ? original.rule : `${original.rule}: ${original.rulePayload}`,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Chains),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Chains,
    accessorFn: (original) => {
      return original.chains
    },
    cell: ({ row }) => {
      const chains: VNode[] = []
      const originChains = row.original.chains

      originChains.forEach((chain, index) => {
        chains.unshift(h(ProxyName, { name: chain, size: 'small' }))

        if (index < originChains.length - 1) {
          chains.unshift(
            h(ArrowRightCircleIcon, {
              class: 'h-4 w-4 shrink-0',
            }),
          )
        }
      })

      return h(
        'div',
        {
          class: `inline-flex items-center ${proxyChainDirection.value === PROXY_CHAIN_DIRECTION.REVERSE && 'flex-row-reverse justify-end'} gap-1`,
        },
        chains,
      )
    },
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime),
    enableGrouping: false,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime,
    accessorFn: (original) => fromNow(original.start),
    sortingFn: (prev, next) =>
      dayjs(next.original.start).valueOf() - dayjs(prev.original.start).valueOf(),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed),
    enableGrouping: false,
    sortDescFirst: true,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed,
    accessorFn: (original) => `${prettyBytesHelper(original.downloadSpeed)}/s`,
    sortingFn: (prev, next) => prev.original.downloadSpeed - next.original.downloadSpeed,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed),
    enableGrouping: false,
    sortDescFirst: true,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed,
    accessorFn: (original) => `${prettyBytesHelper(original.uploadSpeed)}/s`,
    sortingFn: (prev, next) => prev.original.uploadSpeed - next.original.uploadSpeed,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Download),
    enableGrouping: false,
    sortDescFirst: true,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Download,
    accessorFn: (original) => prettyBytesHelper(original.download),
    sortingFn: (prev, next) => prev.original.download - next.original.download,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Upload),
    enableGrouping: false,
    sortDescFirst: true,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Upload,
    accessorFn: (original) => prettyBytesHelper(original.upload),
    sortingFn: (prev, next) => prev.original.upload - next.original.upload,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP,
    accessorFn: (original) => {
      return getIPLabelFromMap(original.metadata.sourceIP)
    },
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort,
    accessorFn: (original) => original.metadata.sourcePort,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Destination),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Destination,
    accessorFn: getDestinationFromConnection,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType,
    accessorFn: getDestinationTypeFromConnection,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress,
    accessorFn: (original) => original.metadata.remoteDestination || '-',
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser,
    accessorFn: getInboundUserFromConnection,
  },
]

const grouping = ref<GroupingState>([])
const expanded = ref<ExpandedState>({})
const sorting = useStorage<SortingState>('config/table-sorting', [])
const columnPinning = useStorage<ColumnPinningState>('config/table-column-pinning', {
  left: [],
  right: [],
})

const tanstackTable = useVueTable({
  get data() {
    return renderConnections.value
  },
  columns,
  columnResizeMode: 'onChange',
  columnResizeDirection: 'ltr',
  state: {
    get columnOrder() {
      return connectionTableColumns.value
    },
    get columnVisibility() {
      return {
        ...Object.fromEntries(
          Object.values(CONNECTIONS_TABLE_ACCESSOR_KEY).map((key) => [key, false]),
        ),
        ...Object.fromEntries(connectionTableColumns.value.map((key) => [key, true])),
      }
    },
    get grouping() {
      return grouping.value
    },
    get expanded() {
      return expanded.value
    },
    get sorting() {
      return sorting.value
    },
    get columnSizing() {
      return columnWidthMap.value
    },
    get columnPinning() {
      return columnPinning.value
    },
  },
  onGroupingChange: (updater) => {
    if (isFunction(updater)) {
      grouping.value = updater(grouping.value)
    } else {
      grouping.value = updater
    }
  },
  onExpandedChange: (updater) => {
    if (isFunction(updater)) {
      expanded.value = updater(expanded.value)
    }
  },
  onSortingChange: (updater) => {
    if (isFunction(updater)) {
      sorting.value = updater(sorting.value)
    } else {
      sorting.value = updater
    }
  },
  onColumnSizingChange: (updater) => {
    if (isFunction(updater)) {
      columnWidthMap.value = updater(columnWidthMap.value) as Record<
        CONNECTIONS_TABLE_ACCESSOR_KEY,
        number
      >
    } else {
      columnWidthMap.value = updater as Record<CONNECTIONS_TABLE_ACCESSOR_KEY, number>
    }
  },
  onColumnPinningChange: (updater) => {
    if (isFunction(updater)) {
      columnPinning.value = updater(columnPinning.value)
    } else {
      columnPinning.value = updater
    }
  },
  getSortedRowModel: getSortedRowModel(),
  getGroupedRowModel: getGroupedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  getCoreRowModel: getCoreRowModel(),
})

const rows = computed(() => {
  return tanstackTable.getRowModel().rows
})

const parentRef = ref<HTMLElement | null>(null)
const rowVirtualizerOptions = computed(() => {
  return {
    count: rows.value.length,
    getScrollElement: () => parentRef.value,
    estimateSize: () => 36,
    overscan: 24,
  }
})

const rowVirtualizer = useVirtualizer(rowVirtualizerOptions)
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize() + 24)

const classMap = {
  [TABLE_SIZE.SMALL]: 'table-xs',
  [TABLE_SIZE.LARGE]: 'table-sm',
}
const sizeOfTable = computed(() => {
  return classMap[tableSize.value]
})

const handlerClickRow = (row: Row<Connection>) => {
  if (isDragging.value) return

  if (row.getIsGrouped()) {
    if (row.getCanExpand()) {
      row.getToggleExpandedHandler()()
    }
  } else {
    handlerInfo(row.original)
  }
}

const handlePinColumn = (column: Column<Connection, unknown>) => {
  if (column.getIsPinned() === 'left') {
    column.pin(false)
  } else {
    const currentPinning = columnPinning.value.left || []

    currentPinning.forEach((pinnedColumnId: string) => {
      if (pinnedColumnId !== column.id) {
        const pinnedColumn = tanstackTable.getColumn(pinnedColumnId)
        if (pinnedColumn) {
          pinnedColumn.pin(false)
        }
      }
    })
    column.pin('left')
  }
}

const isDragging = ref(false)
const isMouseDown = ref(false)
const dragStartPos = ref({ x: 0, y: 0 })
const dragStartScroll = ref({ x: 0, y: 0 })
const DRAG_THRESHOLD = 5 // 最小拖动阈值

const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return // 只处理左键
  isMouseDown.value = true
  dragStartPos.value = { x: e.clientX, y: e.clientY }

  if (parentRef.value) {
    dragStartScroll.value = {
      x: parentRef.value.scrollLeft,
      y: parentRef.value.scrollTop,
    }
  }

  e.preventDefault()
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isMouseDown.value || !parentRef.value) return

  const deltaX = e.clientX - dragStartPos.value.x
  const deltaY = e.clientY - dragStartPos.value.y

  // 检查是否超过拖动阈值
  if (
    !isDragging.value &&
    (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)
  ) {
    isDragging.value = true
  }

  if (isDragging.value) {
    parentRef.value.scrollLeft = dragStartScroll.value.x - deltaX
    parentRef.value.scrollTop = dragStartScroll.value.y - deltaY
    e.preventDefault()
  }
}

const handleMouseUp = () => {
  // 延迟重置拖动状态，以防止在拖动结束后立即触发点击事件
  if (isDragging.value) {
    setTimeout(() => {
      isDragging.value = false
    }, 100)
  }
  isMouseDown.value = false
}

// 复制功能
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showNotification({
      content: 'copySuccess',
      type: 'alert-success',
      timeout: 2000,
    })
  } catch {
    // 降级处理
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      showNotification({
        content: 'copySuccess',
        type: 'alert-success',
        timeout: 2000,
      })
    } catch (error) {
      console.error('复制失败:', error)
    }
    document.body.removeChild(textArea)
  }
}

const handleCellRightClick = (
  event: MouseEvent,
  cell: { column: { id: string }; getValue: () => unknown },
) => {
  event.preventDefault()

  if (cell.column.id === CONNECTIONS_TABLE_ACCESSOR_KEY.Chains) {
    const chains = [...(cell.getValue() as string[])]
    const chainsString =
      proxyChainDirection.value === PROXY_CHAIN_DIRECTION.REVERSE
        ? chains.join(' → ')
        : chains.reverse().join(' → ')

    copyToClipboard(chainsString)
    return
  }

  const cellValue = cell.getValue()

  if (cellValue && cellValue !== '-') {
    copyToClipboard(String(cellValue))
  }
}
</script>

<style>
th .resizer {
  @apply opacity-0;
}
th:hover .resizer {
  @apply opacity-100;
}
</style>
