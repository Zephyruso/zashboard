<template>
  <div class="flex flex-col gap-1 overflow-y-auto p-2">
    <div class="card card-compact shadow-md">
      <div class="card-title px-4 pt-4">
        {{ $t('dashboard') }}
      </div>
      <div class="card-body">
        <div class="flex items-center gap-2">
          {{ $t('theme') }}:
          <select
            class="select select-bordered select-xs w-48"
            v-model="theme"
          >
            <option
              v-for="opt in themes"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
      </div>
    </div>
    <div class="card card-compact shadow-md">
      <div class="card-title px-4 pt-4">
        {{ $t('proxies') }}
      </div>
      <div class="card-body">
        <div class="flex items-center gap-2">
          {{ $t('showGlobalProxy') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="showGlobalProxy"
          />
        </div>
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
          {{ $t('connectionStyle') }}:
          {{ $t('table') }}
          <input
            class="toggle"
            type="checkbox"
            v-model="useConnectionCard"
          />
          {{ $t('card') }}
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
        <div
          v-else
          class="flex flex-col gap-2"
        >
          <div>{{ $t('customTableColumns') }}:</div>
          <TableSettings />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TableSettings from '@/components/connections/TableSettings.vue'
import {
  compactConnectionCard,
  showGlobalProxy,
  speedtestTimeout,
  speedtestUrl,
  theme,
  twoColumns,
  useConnectionCard,
} from '@/store/config'

const themes = [
  'default',
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
  'dim',
  'nord',
  'sunset',
]
</script>
