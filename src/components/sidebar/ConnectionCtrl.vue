<template>
  <div class="flex flex-col gap-2 p-2 text-sm">
    <div class="flex items-center gap-2">
      {{ showActiveConnections ? $t('activeConnections') : $t('closedConnections') }}:
      <input
        type="checkbox"
        class="toggle"
        v-model="showActiveConnections"
      />
    </div>
    <div class="flex items-center gap-2">
      {{ $t('sortBy') }}:
      <select
        class="select select-bordered select-sm"
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
        class="input input-sm join-item input-bordered w-32"
        v-model="quickFilterRegex"
      />
      <input
        type="checkbox"
        class="toggle"
        v-model="quickFilterEnabled"
      />
    </div>
    <div class="join">
      <input
        type="text"
        class="input input-sm join-item input-bordered"
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
import {
  connectionFilter,
  connectionSortType,
  isPaused,
  quickFilterEnabled,
  quickFilterRegex,
  renderConnections,
  showActiveConnections,
  SORT_TYPE,
} from '@/store/connections'
import { PauseIcon, PlayIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const handlerClickCloseAll = () => {
  renderConnections.value.forEach((conn) => {
    disconnectByIdAPI(conn.id)
  })
}
</script>
