<template>
  <div :class="twMerge('flex flex-col gap-2 p-2 text-sm', horizontal && 'flex-row')">
    <div class="tabs-boxed tabs tabs-sm">
      <a
        role="tab"
        :class="twMerge('tab', connectionTabShow === CONNECTION_TAB_TYPE.ACTIVE && 'tab-active')"
        @click="() => (connectionTabShow = CONNECTION_TAB_TYPE.ACTIVE)"
        >{{ $t('activeConnections') }}</a
      >
      <a
        role="tab"
        :class="twMerge('tab', connectionTabShow === CONNECTION_TAB_TYPE.CLOSED && 'tab-active')"
        @click="() => (connectionTabShow = CONNECTION_TAB_TYPE.CLOSED)"
        >{{ $t('closedConnections') }}</a
      >
    </div>
    <div
      class="flex items-center gap-2"
      v-if="useConnectionCard"
    >
      {{ $t('sortBy') }}:
      <select
        class="select select-bordered select-sm w-52"
        v-model="connectionSortType"
      >
        <option
          v-for="opt in Object.values(SORT_TYPE)"
          :key="opt"
          :value="opt"
        >
          {{ $t(opt) || opt }}
        </option>
      </select>
    </div>
    <div class="flex items-center gap-2">
      {{ $t('quickFilter') }}:
      <input
        type="text"
        class="input input-sm join-item input-bordered w-40"
        v-model="quickFilterRegex"
      />
      <input
        type="checkbox"
        class="toggle"
        v-model="quickFilterEnabled"
      />
    </div>
    <div
      class="join"
      :class="horizontal && 'flex-1'"
    >
      <input
        type="text"
        class="input input-sm join-item input-bordered flex-1"
        v-model="connectionFilter"
      />
      <button
        class="btn-bordered btn join-item btn-sm"
        @click="isPaused = !isPaused"
      >
        <component
          :is="!isPaused ? PauseIcon : PlayIcon"
          class="h-4 w-4"
        />
      </button>
      <button
        class="btn-bordered btn join-item btn-sm"
        @click="handlerClickCloseAll"
      >
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { disconnectByIdAPI } from '@/api'
import { useConnectionCard } from '@/store/config'
import {
  CONNECTION_TAB_TYPE,
  connectionFilter,
  connectionSortType,
  connectionTabShow,
  isPaused,
  quickFilterEnabled,
  quickFilterRegex,
  renderConnections,
  SORT_TYPE,
} from '@/store/connections'
import { PauseIcon, PlayIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
defineProps<{
  horizontal?: boolean
}>()
const handlerClickCloseAll = () => {
  renderConnections.value.forEach((conn) => {
    disconnectByIdAPI(conn.id)
  })
}
</script>
