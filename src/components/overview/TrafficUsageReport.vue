<template>
  <div class="base-container w-full backdrop-blur-none!">
    <div
      class="need-blur flex flex-wrap items-center justify-between gap-3 p-4 max-sm:flex-col max-sm:items-start"
    >
      <div
        class="text-base-content/60 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase"
      >
        {{ $t('trafficUsageReport') }}
        <button
          class="btn btn-ghost btn-xs btn-circle"
          @click="showClearDialog = true"
        >
          <TrashIcon class="h-3.5 w-3.5" />
        </button>
        <button
          class="btn btn-ghost btn-xs"
          @click="exportReport"
        >
          <ArrowDownTrayIcon class="h-3.5 w-3.5" />
        </button>
        <QuestionMarkCircleIcon
          class="h-3.5 w-3.5 cursor-pointer"
          @mouseenter="showTip($event, periodTip)"
        />
      </div>
      <div class="flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-start">
        <div class="flex items-center gap-2">
          <span class="text-base-content/60 text-xs">{{ $t('trafficMonthlyReset') }}</span>
          <input
            type="checkbox"
            class="toggle toggle-sm"
            v-model="trafficMonthlyResetEnabled"
          />
        </div>
        <div
          v-if="trafficMonthlyResetEnabled"
          class="flex items-center gap-2"
        >
          <span class="text-base-content/60 text-xs">{{ $t('trafficMonthlyResetDay') }}</span>
          <select
            v-model.number="trafficMonthlyResetDay"
            class="select select-bordered select-sm w-20"
          >
            <option
              v-for="day in 28"
              :key="day"
              :value="day"
            >
              {{ day }}
            </option>
          </select>
        </div>
        <div class="tabs tabs-box tabs-sm">
          <button
            class="tab"
            :class="activeTab === 'node' && 'tab-active'"
            @click="activeTab = 'node'"
          >
            {{ $t('nodeTrafficStats') }}
          </button>
          <button
            class="tab"
            :class="activeTab === 'report' && 'tab-active'"
            @click="activeTab = 'report'"
          >
            {{ $t('trafficUsageReportTab') }}
          </button>
        </div>
      </div>
    </div>

    <div class="need-blur grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4">
      <div class="bg-base-200/30 flex flex-col gap-1.5 rounded-xl p-4">
        <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
          {{ activeTab === 'node' ? $t('outbound') : $t('sourceIP') }}
        </div>
        <div class="text-2xl font-extralight tabular-nums">{{ currentCount }}</div>
      </div>
      <div class="bg-base-200/30 flex flex-col gap-1.5 rounded-xl p-4">
        <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
          {{ t('totalTraffic') }}
        </div>
        <div class="text-2xl font-extralight tabular-nums">
          {{ prettyBytesHelper(totalStats.download + totalStats.upload) }}
        </div>
      </div>
      <div class="bg-base-200/30 flex flex-col gap-1.5 rounded-xl p-4">
        <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
          {{ t('download') }}
        </div>
        <div class="text-2xl font-extralight tabular-nums">
          {{ prettyBytesHelper(totalStats.download) }}
        </div>
      </div>
      <div class="bg-base-200/30 flex flex-col gap-1.5 rounded-xl p-4">
        <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
          {{ t('upload') }}
        </div>
        <div class="text-2xl font-extralight tabular-nums">
          {{ prettyBytesHelper(totalStats.upload) }}
        </div>
      </div>
    </div>

    <div
      ref="parentRef"
      class="h-96 overflow-auto"
      @touchstart.passive.stop
      @touchmove.passive.stop
      @touchend.passive.stop
    >
      <div :style="{ height: `${totalSize}px` }">
        <table class="table-sm table w-full rounded-none">
          <thead class="bg-base-200 sticky top-0 z-10">
            <tr>
              <th
                v-for="header in tanstackTable.getHeaderGroups()[0]?.headers"
                :key="header.id"
                class="cursor-pointer select-none"
                @click="header.column.getToggleSortingHandler()?.($event)"
              >
                <div class="flex items-center gap-1">
                  <FlexRender
                    v-if="!header.isPlaceholder"
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                  <ArrowUpCircleIcon
                    v-if="header.column.getIsSorted() === 'asc'"
                    class="h-4 w-4"
                  />
                  <ArrowDownCircleIcon
                    v-if="header.column.getIsSorted() === 'desc'"
                    class="h-4 w-4"
                  />
                </div>
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
              class="hover:bg-primary! hover:text-primary-content whitespace-nowrap"
              :class="virtualRow.index % 2 === 1 && 'bg-base-150'"
            >
              <td
                v-for="cell in rows[virtualRow.index].getVisibleCells()"
                :key="cell.id"
                class="text-sm"
              >
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DialogWrapper
      v-model="showClearDialog"
      :title="$t('clearTrafficStats')"
    >
      <div class="flex flex-col gap-4 p-2">
        <p class="text-sm">
          {{ $t('clearTrafficStatsConfirm') }}
        </p>
        <div class="flex justify-end gap-2">
          <button
            class="btn btn-sm"
            @click="showClearDialog = false"
          >
            {{ $t('cancel') }}
          </button>
          <button
            class="btn btn-error btn-sm"
            @click="handleClearStats"
          >
            {{ $t('confirm') }}
          </button>
        </div>
      </div>
    </DialogWrapper>
  </div>
</template>

<script setup lang="ts">
import { ConnectionHistoryType } from '@/helper/indexeddb'
import { showNotification } from '@/helper/notification'
import { getIPLabelFromMap } from '@/helper/sourceip'
import { useTooltip } from '@/helper/tooltip'
import {
  clearAllTrafficStats,
  getNextMonthlyResetDate,
  trafficStatsPeriodStart,
} from '@/helper/trafficReset'
import { prettyBytesHelper } from '@/helper/utils'
import {
  aggregateConnections,
  aggregateTrafficMatrix,
  aggregatedDataMap,
  mergeAggregatedData,
  mergeTrafficMatrixData,
  trafficMatrixData,
} from '@/store/connHistory'
import { activeConnections } from '@/store/connections'
import { trafficMonthlyResetDay, trafficMonthlyResetEnabled } from '@/store/settings'
import {
  ArrowDownCircleIcon,
  ArrowDownTrayIcon,
  ArrowUpCircleIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import {
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
  useVueTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/vue-table'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import { computed, h, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogWrapper from '../common/DialogWrapper.vue'
import ProxyName from '../proxies/ProxyName.vue'

const { t } = useI18n()
const { showTip } = useTooltip()

type ReportTab = 'node' | 'report'

interface NodeTrafficRow {
  key: string
  download: number
  upload: number
  count: number
}

interface UsageReportRow {
  owner: string
  sourceIP: string
  outbound: string
  download: number
  upload: number
  count: number
}

type TrafficTableRow = NodeTrafficRow | UsageReportRow

const activeTab = useStorage<ReportTab>('cache/traffic-usage-report-tab', 'node')
const showClearDialog = ref(false)

const nodeTrafficData = computed<NodeTrafficRow[]>(() => {
  const historical = aggregatedDataMap.value[ConnectionHistoryType.Node]
  const current = aggregateConnections(activeConnections.value, ConnectionHistoryType.Node)

  return mergeAggregatedData(historical, current)
})

const usageReportData = computed<UsageReportRow[]>(() => {
  const historical = trafficMatrixData.value
  const current = aggregateTrafficMatrix(activeConnections.value)
  const merged = mergeTrafficMatrixData(historical, current)

  return merged.map((item) => ({
    owner: getIPLabelFromMap(item.sourceIP),
    sourceIP: item.sourceIP,
    outbound: item.outbound,
    download: item.download,
    upload: item.upload,
    count: item.count,
  }))
})

const tableData = computed<TrafficTableRow[]>(() => {
  return activeTab.value === 'node' ? nodeTrafficData.value : usageReportData.value
})

const totalStats = computed(() => {
  return tableData.value.reduce(
    (acc, item) => {
      acc.download += item.download
      acc.upload += item.upload
      acc.count += item.count
      return acc
    },
    { download: 0, upload: 0, count: 0 },
  )
})

const currentCount = computed(() => tableData.value.length)

const periodTip = computed(() => {
  const start = dayjs(trafficStatsPeriodStart.value)
  const lines = [
    t('trafficStatsPeriodStart', {
      time: `${start.format('YYYY-MM-DD HH:mm')} (${start.fromNow()})`,
    }),
  ]

  if (trafficMonthlyResetEnabled.value) {
    const nextReset = getNextMonthlyResetDate(trafficMonthlyResetDay.value)
    lines.push(
      t('trafficNextReset', {
        time: nextReset.format('YYYY-MM-DD'),
      }),
    )
  }

  return lines.join('\n')
})

const nodeColumns = computed<ColumnDef<NodeTrafficRow>[]>(() => [
  {
    header: () => t('outbound'),
    id: 'key',
    accessorFn: (row) => row.key,
    cell: ({ row }) => h(ProxyName, { name: row.original.key }),
  },
  {
    header: () => t('download'),
    id: 'download',
    accessorFn: (row) => row.download,
    cell: ({ row }) => prettyBytesHelper(row.original.download),
    sortingFn: (prev, next) => prev.original.download - next.original.download,
    sortDescFirst: true,
  },
  {
    header: () => t('upload'),
    id: 'upload',
    accessorFn: (row) => row.upload,
    cell: ({ row }) => prettyBytesHelper(row.original.upload),
    sortingFn: (prev, next) => prev.original.upload - next.original.upload,
    sortDescFirst: true,
  },
  {
    header: () => t('totalTraffic'),
    id: 'total',
    accessorFn: (row) => row.download + row.upload,
    cell: ({ row }) => prettyBytesHelper(row.original.download + row.original.upload),
    sortingFn: (prev, next) =>
      prev.original.download +
      prev.original.upload -
      (next.original.download + next.original.upload),
    sortDescFirst: true,
  },
  {
    header: () => t('connectionCount'),
    id: 'count',
    accessorFn: (row) => row.count,
    cell: ({ row }) => row.original.count.toString(),
    sortingFn: (prev, next) => prev.original.count - next.original.count,
    sortDescFirst: true,
  },
])

const reportColumns = computed<ColumnDef<UsageReportRow>[]>(() => [
  {
    header: () => t('trafficOwner'),
    id: 'owner',
    accessorFn: (row) => row.owner,
    cell: ({ row }) => row.original.owner,
  },
  {
    header: () => t('sourceIP'),
    id: 'sourceIP',
    accessorFn: (row) => row.sourceIP,
    cell: ({ row }) => row.original.sourceIP,
  },
  {
    header: () => t('outbound'),
    id: 'outbound',
    accessorFn: (row) => row.outbound,
    cell: ({ row }) => h(ProxyName, { name: row.original.outbound }),
  },
  {
    header: () => t('download'),
    id: 'download',
    accessorFn: (row) => row.download,
    cell: ({ row }) => prettyBytesHelper(row.original.download),
    sortingFn: (prev, next) => prev.original.download - next.original.download,
    sortDescFirst: true,
  },
  {
    header: () => t('upload'),
    id: 'upload',
    accessorFn: (row) => row.upload,
    cell: ({ row }) => prettyBytesHelper(row.original.upload),
    sortingFn: (prev, next) => prev.original.upload - next.original.upload,
    sortDescFirst: true,
  },
  {
    header: () => t('totalTraffic'),
    id: 'total',
    accessorFn: (row) => row.download + row.upload,
    cell: ({ row }) => prettyBytesHelper(row.original.download + row.original.upload),
    sortingFn: (prev, next) =>
      prev.original.download +
      prev.original.upload -
      (next.original.download + next.original.upload),
    sortDescFirst: true,
  },
  {
    header: () => t('connectionCount'),
    id: 'count',
    accessorFn: (row) => row.count,
    cell: ({ row }) => row.original.count.toString(),
    sortingFn: (prev, next) => prev.original.count - next.original.count,
    sortDescFirst: true,
  },
])

const columns = computed<ColumnDef<TrafficTableRow>[]>(() => {
  return activeTab.value === 'node'
    ? (nodeColumns.value as ColumnDef<TrafficTableRow>[])
    : (reportColumns.value as ColumnDef<TrafficTableRow>[])
})

const nodeSorting = useStorage<SortingState>('cache/traffic-node-sorting', [
  { id: 'total', desc: true },
])
const reportSorting = useStorage<SortingState>('cache/traffic-report-sorting', [
  { id: 'total', desc: true },
])

const sorting = computed({
  get: () => (activeTab.value === 'node' ? nodeSorting.value : reportSorting.value),
  set: (value: SortingState) => {
    if (activeTab.value === 'node') {
      nodeSorting.value = value
    } else {
      reportSorting.value = value
    }
  },
})

const tanstackTable = useVueTable({
  get data() {
    return tableData.value
  },
  get columns() {
    return columns.value
  },
  state: {
    get sorting() {
      return sorting.value
    },
  },
  onSortingChange: (updater) => {
    const current = sorting.value
    sorting.value = typeof updater === 'function' ? updater(current) : updater
  },
  getSortedRowModel: getSortedRowModel(),
  getCoreRowModel: getCoreRowModel(),
})

const rows = computed(() => tanstackTable.getRowModel().rows)

const parentRef = ref<HTMLElement | null>(null)
const rowVirtualizerOptions = computed(() => ({
  count: rows.value.length,
  getScrollElement: () => parentRef.value,
  estimateSize: () => 36,
  overscan: 10,
}))

const rowVirtualizer = useVirtualizer(rowVirtualizerOptions)
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize() + 24)

const exportReport = () => {
  const lines: string[] = []
  const periodStart = dayjs(trafficStatsPeriodStart.value).format('YYYY-MM-DD HH:mm')

  lines.push(`${t('trafficUsageReport')},${periodStart}`)

  if (activeTab.value === 'node') {
    lines.push(
      `${t('outbound')},${t('download')},${t('upload')},${t('totalTraffic')},${t('connectionCount')}`,
    )
    nodeTrafficData.value.forEach((row) => {
      lines.push(
        [row.key, row.download, row.upload, row.download + row.upload, row.count].join(','),
      )
    })
  } else {
    lines.push(
      `${t('trafficOwner')},${t('sourceIP')},${t('outbound')},${t('download')},${t('upload')},${t('totalTraffic')},${t('connectionCount')}`,
    )
    usageReportData.value.forEach((row) => {
      lines.push(
        [
          row.owner,
          row.sourceIP,
          row.outbound,
          row.download,
          row.upload,
          row.download + row.upload,
          row.count,
        ].join(','),
      )
    })
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `traffic-report-${dayjs().format('YYYY-MM-DD')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const handleClearStats = async () => {
  try {
    await clearAllTrafficStats()
    showClearDialog.value = false
    showNotification({
      content: t('clearTrafficStatsSuccess'),
      type: 'alert-success',
    })
  } catch (error) {
    console.error('Failed to clear traffic stats:', error)
    showNotification({
      content: `${t('saveFailed')}: ${error}`,
      type: 'alert-error',
    })
  }
}

onMounted(() => {
  if (!trafficStatsPeriodStart.value) {
    trafficStatsPeriodStart.value = Date.now()
  }
})
</script>
