<template>
  <div class="flex flex-col gap-1 p-2">
    <div class="card card-compact shadow-md">
      <div class="card-title px-4 pt-4">
        {{ $t('proxies') }}
      </div>
      <div class="card-body">
        <div class="flex items-center gap-2">
          {{ $t('twoColumns') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="twoColumns"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('speedtestUrl') }}:
          <input
            type="text"
            class="input input-sm input-bordered w-96"
            v-model="speedtestUrl"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('speedtestTimeout') }}:
          <input
            type="text"
            class="input input-sm input-bordered w-96"
            v-model="speedtestTimeout"
          />
        </div>
      </div>
    </div>
    <div class="card card-compact shadow-md">
      <div class="card-title px-4 pt-4">
        {{ $t('connections') }}
      </div>
      <div class="card-body">
        <div class="flex items-center gap-2">
          {{ $t('useConnectionCard') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="useConnectionCard"
          />
        </div>
        <div
          class="flex items-center gap-2"
          v-if="useConnectionCard"
        >
          {{ $t('compactCard') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="compactConnectionCard"
          />
        </div>
        <TableSettings v-else />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TableSettings from '@/components/TableSettings.vue'
import {
  compactConnectionCard,
  speedtestTimeout,
  speedtestUrl,
  twoColumns,
  useConnectionCard,
} from '@/store/config'
</script>
