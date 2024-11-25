<template>
  <div class="h-full w-full overflow-auto">
    <table class="table table-zebra table-xs overflow-hidden shadow-md">
      <thead class="sticky top-0 bg-base-100">
        <tr
          v-for="headerGroup in table.getHeaderGroups()"
          :key="headerGroup.id"
        >
          <th
            v-for="header in headerGroup.headers"
            :key="header.id"
            :colSpan="header.colSpan"
          >
            <div class="flex items-center gap-1">
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              >
              </FlexRender>
              <button
                v-if="header.column.getCanGroup()"
                class="cursor-pointer"
                @click="() => header.column.getToggleGroupingHandler()()"
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
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          class="h-9 hover:!bg-primary hover:text-primary-content"
        >
          <td
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            class="text-sm"
          >
            <div
              :class="
                twMerge(
                  'flex items-center gap-2 whitespace-nowrap',
                  [
                    CONNECTIONS_TABLE_ACCESSOR_KEY.Download,
                    CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed,
                    CONNECTIONS_TABLE_ACCESSOR_KEY.Upload,
                    CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed,
                  ].includes(cell.column.id as CONNECTIONS_TABLE_ACCESSOR_KEY) && 'w-14',
                )
              "
            >
              <template v-if="cell.column.getIsGrouped()">
                <template v-if="row.getCanExpand()">
                  <button
                    @click="() => row.getToggleExpandedHandler()()"
                    class="cursor-pointer"
                  >
                    <MagnifyingGlassMinusIcon
                      v-if="row.getIsExpanded()"
                      class="h-4 w-4"
                    />
                    <MagnifyingGlassPlusIcon
                      v-else
                      class="h-4 w-4"
                    />
                  </button>
                  <FlexRender
                    :render="cell.column.columnDef.cell"
                    :props="cell.getContext()"
                  />
                  <div v-if="cell.column.getIsGrouped()">({{ row.subRows.length }})</div>
                </template>
              </template>
              <template v-else-if="cell.getIsAggregated()">
                <FlexRender
                  :render="cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </template>
              <FlexRender
                v-else-if="!cell.getIsPlaceholder()"
                :render="cell.column.columnDef.cell"
                :props="cell.getContext()"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { disconnectByIdAPI } from '@/api'
import { CONNECTIONS_TABLE_ACCESSOR_KEY, connectionTableColumns, language } from '@/store/config'
import { renderConnections } from '@/store/connections'
import type { Connection } from '@/types'
import {
  InformationCircleIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import {
  FlexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  isFunction,
  useVueTable,
  type ColumnDef,
  type ExpandedState,
  type GroupingState,
} from '@tanstack/vue-table'
import dayjs from 'dayjs'
import prettyBytes from 'pretty-bytes'
import { twMerge } from 'tailwind-merge'
import { h, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emits = defineEmits(['info'])
const { t } = useI18n()
const columns: ColumnDef<Connection>[] = [
  {
    header: () => t('details'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Details,
    cell: ({ row }) => {
      return h(
        'button',
        {
          class: 'btn btn-xs btn-circle',
          onClick: () => {
            const connection = row.original

            emits('info', connection)
          },
        },
        [
          h(InformationCircleIcon, {
            class: 'h-4 w-4',
          }),
        ],
      )
    },
  },
  {
    header: () => t('close'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Close,
    cell: ({ row }) => {
      return h(
        'button',
        {
          class: 'btn btn-xs btn-circle',
          onClick: () => {
            const connection = row.original

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
    header: () => t('type'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Type,
    accessorFn: (original) => `${original.metadata.type} | ${original.metadata.network}`,
  },
  {
    header: () => t('process'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Process,
    accessorFn: (original) => original.metadata.processPath || '-',
  },
  {
    header: () => t('host'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Host,
    accessorFn: (original) =>
      `${
        original.metadata.host ? original.metadata.host : original.metadata.destinationIP
      }:${original.metadata.destinationPort}`,
  },
  {
    header: () => t('rule'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Rule,
    accessorFn: (original) =>
      !original.rulePayload ? original.rule : `${original.rule} :: ${original.rulePayload}`,
  },
  {
    header: () => t('chains'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Chains,
    accessorFn: (original) => original.chains.slice().reverse().join(' :: '),
  },
  {
    header: () => t('connectTime'),
    enableGrouping: false,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime,
    accessorFn: (original) => dayjs(original.start).locale(language.value).fromNow(),
    sortingFn: (prev, next) =>
      dayjs(prev.original.start).valueOf() - dayjs(next.original.start).valueOf(),
  },
  {
    header: () => t('dlSpeed'),
    enableGrouping: false,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed,
    accessorFn: (original) => `${prettyBytes(original.downloadSpeed)}/s`,
    sortingFn: (prev, next) => prev.original.downloadSpeed - next.original.downloadSpeed,
  },
  {
    header: () => t('ulSpeed'),
    enableGrouping: false,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed,
    accessorFn: (original) => `${prettyBytes(original.uploadSpeed)}/s`,
    sortingFn: (prev, next) => prev.original.uploadSpeed - next.original.uploadSpeed,
  },
  {
    header: () => t('dl'),
    enableGrouping: false,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Download,
    accessorFn: (original) => prettyBytes(original.download),
    sortingFn: (prev, next) => prev.original.download - next.original.download,
  },
  {
    header: () => t('ul'),
    enableGrouping: false,
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Upload,
    accessorFn: (original) => prettyBytes(original.upload),
    sortingFn: (prev, next) => prev.original.upload - next.original.upload,
  },
  {
    header: () => t('sourceIP'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.SourceIP,
    accessorFn: (original) => {
      return original.metadata.sourceIP
    },
  },
  {
    header: () => t('sourcePort'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.SourcePort,
    accessorFn: (original) => original.metadata.sourcePort,
  },
  {
    header: () => t('destination'),
    id: CONNECTIONS_TABLE_ACCESSOR_KEY.Destination,
    accessorFn: (original) => original.metadata.destinationIP || original.metadata.host,
  },
]

const grouping = ref<GroupingState>([])
const expanded = ref<ExpandedState>({})

const table = useVueTable({
  get data() {
    return renderConnections.value
  },
  columns,
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
  getGroupedRowModel: getGroupedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  getCoreRowModel: getCoreRowModel(),
})
</script>
