<template>
  <!-- overview -->
  <div class="card">
    <div class="card-title px-4 pt-4">
      {{ $t('overview') }}
    </div>
    <div class="card-body grid grid-cols-1 gap-2 lg:grid-cols-2">
      <div class="flex items-center gap-2">
        {{ $t('splitOverviewPage') }}
        <input
          v-model="splitOverviewPage"
          class="toggle"
          type="checkbox"
        />
      </div>
      <div class="flex items-center gap-2">
        {{ $t('showIPAndConnectionInfo') }}
        <input
          v-model="showIPAndConnectionInfo"
          class="toggle"
          type="checkbox"
        />
      </div>
      <template v-if="showIPAndConnectionInfo">
        <div class="flex items-center gap-2">
          {{ $t('autoIPCheckWhenStart') }}
          <input
            class="toggle"
            type="checkbox"
            v-model="autoIPCheck"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('autoConnectionCheckWhenStart') }}
          <input
            class="toggle"
            type="checkbox"
            v-model="autoConnectionCheck"
          />
        </div>
      </template>
      <div
        v-if="splitOverviewPage"
        class="flex items-center gap-2"
      >
        {{ $t('displayConnectionTopology') }}
        <input
          class="toggle"
          type="checkbox"
          v-model="displayConnectionTopology"
        />
      </div>
      <div class="flex items-center gap-2 max-md:hidden">
        {{ $t('showStatisticsWhenSidebarCollapsed') }}
        <input
          v-model="showStatisticsWhenSidebarCollapsed"
          class="toggle"
          type="checkbox"
        />
      </div>
      <div class="flex items-center gap-2 max-md:hidden">
        {{ $t('numberOfChartsInSidebar') }}
        <select
          v-model="numberOfChartsInSidebar"
          class="select select-sm min-w-24"
        >
          <option
            v-for="opt in [1, 2, 3]"
            :key="opt"
            :value="opt"
          >
            {{ opt }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  autoConnectionCheck,
  autoIPCheck,
  displayConnectionTopology,
  numberOfChartsInSidebar,
  showIPAndConnectionInfo,
  showStatisticsWhenSidebarCollapsed,
  splitOverviewPage,
} from '@/store/settings'
</script>
