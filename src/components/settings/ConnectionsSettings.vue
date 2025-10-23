<template>
  <!-- connections -->
  <div class="card">
    <div class="card-title px-4 pt-4">
      {{ $t('connections') }}
    </div>
    <div class="card-body">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="flex items-center gap-2">
          <span class="whitespace-nowrap">
            {{ $t('connectionStyle') }}
          </span>
          <select
            v-model="useConnectionCard"
            class="select select-sm min-w-24"
          >
            <option :value="false">
              {{ $t('table') }}
            </option>
            <option :value="true">
              {{ $t('card') }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          {{ $t('proxyChainDirection') }}
          <select
            v-model="proxyChainDirection"
            class="select select-sm w-24"
          >
            <option
              v-for="opt in Object.values(PROXY_CHAIN_DIRECTION)"
              :key="opt"
              :value="opt"
            >
              {{ $t(opt) }}
            </option>
          </select>
        </div>
      </div>
      <div
        v-if="!useConnectionCard"
        class="grid grid-cols-1 gap-2 lg:grid-cols-2"
      >
        <div class="flex items-center gap-2">
          <div>{{ $t('tableWidthMode') }}</div>
          <select
            v-model="tableWidthMode"
            class="select select-sm min-w-24"
          >
            <option
              v-for="opt in Object.values(TABLE_WIDTH_MODE)"
              :key="opt"
              :value="opt"
            >
              {{ $t(opt) }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <div>{{ $t('tableSize') }}</div>
          <select
            v-model="tableSize"
            class="select select-sm min-w-24"
          >
            <option
              v-for="opt in Object.values(TABLE_SIZE)"
              :key="opt"
              :value="opt"
            >
              {{ $t(opt) }}
            </option>
          </select>
        </div>
      </div>
      <div class="divider" />
      <SourceIPLabels />
    </div>
  </div>
</template>

<script setup lang="ts">
import SourceIPLabels from '@/components/settings/SourceIPLabels.vue'
import { PROXY_CHAIN_DIRECTION, TABLE_SIZE, TABLE_WIDTH_MODE } from '@/constant'
import { proxyChainDirection, tableSize, tableWidthMode, useConnectionCard } from '@/store/settings'
</script>
