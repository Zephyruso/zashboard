<template>
  <div
    ref="parentRef"
    class="base-container m-3 h-full overflow-auto backdrop-blur-none!"
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
        :class="['table', sizeOfTable, isManualTable && 'table-fixed']"
        :style="
          isManualTable && {
            width: `${tanstackTable.getCenterTotalSize()}px`,
          }
        "
      >
        <thead
          class="bg-base-100 border-base-300/60 sticky top-0 z-10 border-b backdrop-blur-none!"
        >
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
                inheritedStyle,
                header.column.getCanSort() && 'cursor-pointer select-none',
                header.column.getIsPinned &&
                  header.column.getIsPinned() === 'left' &&
                  'pinned-td sticky left-0 z-20',
              ]"
              :style="[
                isManualTable && {
                  width: `${header.getSize()}px`,
                },
              ]"
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
                @click.stop
                @mousedown.stop="(e) => header.getResizeHandler()(e)"
                @touchstart.stop="(e) => header.getResizeHandler()(e)"
                class="resizer bg-neutral absolute top-0 right-0 h-full w-1 cursor-ew-resize"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td
              :colspan="tanstackTable.getVisibleLeafColumns().length"
              class="text-base-content/50 h-90"
            >
              <div class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <CircleStackIcon class="h-10 w-10 opacity-60" />
                <div class="space-y-1">
                  <div class="text-base font-medium">{{ t('noData') }}</div>
                </div>
              </div>
            </td>
          </tr>
          <tr
            v-for="(virtualRow, index) in virtualRows"
            :key="virtualRow.key.toString()"
            :style="{
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start - index * virtualRow.size}px)`,
            }"
            class="hover:bg-primary! hover:text-primary-content!"
            :class="[
              virtualRow.index % 2 === 0 ? 'bg-base-150' : 'bg-base-100',
              !isDragging ? 'cursor-pointer' : 'cursor-grabbing',
            ]"
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
                cell.column.getIsPinned &&
                  cell.column.getIsPinned() === 'left' &&
                  `pinned-td sticky left-0 z-20 ${inheritedStyle}`,
              ]"
              @contextmenu="handleCellRightClick($event, cell)"
            >
              <template v-if="cell.getIsGrouped()">
                <template v-if="rows[virtualRow.index].getCanExpand()">
                  <div class="flex items-center overflow-hidden">
                    <component
                      :is="
                        rows[virtualRow.index].getIsExpanded()
                          ? MagnifyingGlassMinusIcon
                          : MagnifyingGlassPlusIcon
                      "
                      class="mr-1 inline-block h-4 w-4 shrink-0"
                    />
                    <FlexRender
                      :render="cell.column.columnDef.cell"
                      :props="cell.getContext()"
                      class="shrink-1 overflow-hidden"
                    />
                    <span class="ml-1 shrink-0">
                      ({{ rows[virtualRow.index].subRows.length }})
                    </span>
                  </div>
                </template>
              </template>
              <FlexRender
                v-else-if="!cell.getIsPlaceholder()"
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
import {
  blockConnectionByIdAPI,
  disconnectByIdAPI,
  getConnectionDisplayValue,
} from '@/assembly/connections'
import { useConnections } from '@/composables/connections'
import {
  CONNECTION_TAB_TYPE,
  CONNECTIONS_TABLE_ACCESSOR_KEY,
  PROXY_CHAIN_DIRECTION,
  TABLE_SIZE,
  TABLE_WIDTH_MODE,
} from '@/constant'
import {
  getConnectionChains,
  getConnectionDownload,
  getConnectionSmartBlock,
  getConnectionStart,
  getConnectionUpload,
} from '@/helper'
import { backgroundImage } from '@/helper/indexeddb'
import { showNotification } from '@/helper/notification'
import { connectionFilter, connectionTabShow, renderConnections } from '@/store/connections'
import {
  connectionTableColumns,
  proxyChainDirection,
  showFullProxyChain,
  tableSize,
  tableWidthMode,
} from '@/store/settings'
import type { Connection } from '@/types'
import {
  ArrowDownCircleIcon,
  ArrowRightCircleIcon,
  ArrowUpCircleIcon,
  CircleStackIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MapPinIcon,
  NoSymbolIcon,
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
import HighlightText from '../common/HighlightText.vue'
import ProxyName from '../proxies/ProxyName.vue'
const { handlerInfo } = useConnections()
const columnWidthMap = useStorage('config/table-column-width', {
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Close]: 50,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Host]: 320,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Chains]: 320,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Rule]: 200,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Download]: 80,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed]: 80,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Upload]: 80,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed]: 80,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound]: 80,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Type]: 150,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Process]: 150,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP]: 150,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort]: 100,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost]: 200,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.Destination]: 150,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP]: 200,
  [CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime]: 100,
} as Record<CONNECTIONS_TABLE_ACCESSOR_KEY, number>)

const isManualTable = computed(() => tableWidthMode.value === TABLE_WIDTH_MODE.MANUAL)
const { t } = useI18n()
const getTableDisplayValue = (connection: Connection, key: CONNECTIONS_TABLE_ACCESSOR_KEY) => {
  return getConnectionDisplayValue(connection, key, {
    mode: 'table',
    proxyChainDirection: proxyChainDirection.value,
    showFullProxyChain: showFullProxyChain.value,
  })
}

const highlightedCell =
  (key: CONNECTIONS_TABLE_ACCESSOR_KEY) =>
  ({ row }: { row: Row<Connection> }) => {
    return h(HighlightText, {
      text: getTableDisplayValue(row.original, key),
      filter: connectionFilter.value,
    })
  }

const columns: ColumnDef<Connection>[] = [
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Close),
    enableSorting: false,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Close,
    cell: ({ row }) => {
      const closeButton = h(
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

      if (getConnectionSmartBlock(row.original) === 'normal') {
        const degradeButton = h(
          'button',
          {
            class: 'btn btn-xs btn-circle',
            onClick: (e) => {
              const connection = row.original

              e.stopPropagation()
              blockConnectionByIdAPI(connection.id)
            },
          },
          [
            h(NoSymbolIcon, {
              class: 'h-4 w-4',
            }),
          ],
        )

        return h('div', { class: 'flex gap-1' }, [closeButton, degradeButton])
      }

      return closeButton
    },
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Type),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Type,
    accessorFn: (original) => getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Type),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.Type),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Process),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Process,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Process),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.Process),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Host),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Host,
    accessorFn: (original) => getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Host),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.Host),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.SniffHost),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Rule),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Rule,
    accessorFn: (original) => getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Rule),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.Rule),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Chains),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Chains,
    accessorFn: (original) => getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Chains),
    cell: ({ row }) => {
      const chains: VNode[] = []
      const isReverse = proxyChainDirection.value === PROXY_CHAIN_DIRECTION.REVERSE
      let originChains = getConnectionChains(row.original)

      if (!showFullProxyChain.value && originChains.length > 2) {
        originChains = [originChains[0], originChains[originChains.length - 1]]
      }

      // 完整显示所有代理链
      originChains.forEach((chain, index) => {
        chains.unshift(h(ProxyName, { name: chain, key: chain, filter: connectionFilter.value }))

        if (index < originChains.length - 1) {
          chains.unshift(
            h(ArrowRightCircleIcon, {
              class: 'h-4 w-4 shrink-0',
              key: `arrow-${index}`,
            }),
          )
        }
      })

      return h(
        'div',
        {
          class: `flex items-center ${isReverse && 'flex-row-reverse justify-end'} gap-1`,
        },
        chains,
      )
    },
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Outbound),
    cell: ({ row }) => {
      return h(ProxyName, {
        name: getConnectionChains(row.original)[0],
        filter: connectionFilter.value,
      })
    },
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime),
    enableGrouping: false,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime),
    sortingFn: (prev, next) =>
      dayjs(getConnectionStart(next.original)).valueOf() -
      dayjs(getConnectionStart(prev.original)).valueOf(),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed),
    enableGrouping: false,
    sortDescFirst: true,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed),
    sortingFn: (prev, next) => prev.original.downloadSpeed - next.original.downloadSpeed,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed),
    enableGrouping: false,
    sortDescFirst: true,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed),
    sortingFn: (prev, next) => prev.original.uploadSpeed - next.original.uploadSpeed,
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Download),
    enableGrouping: false,
    sortDescFirst: true,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Download,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Download),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.Download),
    sortingFn: (prev, next) =>
      getConnectionDownload(prev.original) - getConnectionDownload(next.original),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Upload),
    enableGrouping: false,
    sortDescFirst: true,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Upload,
    accessorFn: (original) => getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Upload),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.Upload),
    sortingFn: (prev, next) =>
      getConnectionUpload(prev.original) - getConnectionUpload(next.original),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Destination),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Destination,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Destination),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.Destination),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.DestinationType),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP,
    accessorFn: (original) => getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.GeoIP),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.RemoteAddress),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.InboundUser),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.Protocol),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Protocol,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.Protocol),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.Protocol),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.OutboundType),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.OutboundType,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.OutboundType),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.OutboundType),
  },
  {
    header: () => t(CONNECTIONS_TABLE_ACCESSOR_KEY.FromOutbound),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.FromOutbound,
    accessorFn: (original) =>
      getTableDisplayValue(original, CONNECTIONS_TABLE_ACCESSOR_KEY.FromOutbound),
    cell: highlightedCell(CONNECTIONS_TABLE_ACCESSOR_KEY.FromOutbound),
  },
]

const grouping = useStorage<GroupingState>('config/table-grouping', [])
const expanded = useStorage<ExpandedState>('config/table-expanded', {})
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
        ...Object.fromEntries(
          connectionTableColumns.value
            .filter(
              (key) =>
                key !== CONNECTIONS_TABLE_ACCESSOR_KEY.Close ||
                connectionTabShow.value !== CONNECTION_TAB_TYPE.CLOSED,
            )
            .map((key) => [key, true]),
        ),
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

const inheritedStyle = computed(() => {
  const baseStyle = 'bg-inherit'

  if (!backgroundImage.value) {
    return baseStyle
  }

  return `${baseStyle} backdrop-blur-sm`
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
const DRAG_THRESHOLD = Math.pow(3, 2)

const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return // 只处理左键
  isMouseDown.value = true
  e.preventDefault()
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isMouseDown.value || !parentRef.value) return

  const deltaX = e.movementX
  const deltaY = e.movementY

  // 检查是否超过拖动阈值
  if (!isDragging.value && Math.pow(deltaX, 2) + Math.pow(deltaY, 2) > DRAG_THRESHOLD) {
    isDragging.value = true
  }

  if (isDragging.value) {
    parentRef.value.scrollLeft -= deltaX
    parentRef.value.scrollTop -= deltaY
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

  const cellValue = cell.getValue()

  if (cellValue && cellValue !== '-') {
    copyToClipboard(String(cellValue))
  }
}
</script>

<style scoped>
th .resizer {
  @apply opacity-0;
}
th:hover .resizer {
  @apply opacity-100;
}
</style>
