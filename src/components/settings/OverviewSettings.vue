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
          class="toggle"
          type="checkbox"
          v-model="splitOverviewPage"
        />
      </div>
      <div class="flex items-center gap-2">
        {{ $t('showIPAndConnectionInfo') }}
        <input
          class="toggle"
          type="checkbox"
          v-model="showIPAndConnectionInfo"
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
        class="flex items-center gap-2"
        v-if="splitOverviewPage"
      >
        {{ $t('displayProxiesRelationship') }}
        <input
          class="toggle"
          type="checkbox"
          v-model="displayProxiesRelationship"
        />
      </div>
      <div class="flex items-center gap-2 max-md:hidden">
        {{ $t('showStatisticsWhenSidebarCollapsed') }}
        <input
          class="toggle"
          type="checkbox"
          v-model="showStatisticsWhenSidebarCollapsed"
        />
      </div>
      <div class="flex items-center gap-2 max-md:hidden">
        {{ $t('numberOfChartsInSidebar') }}
        <select
          class="select select-sm min-w-24"
          v-model="numberOfChartsInSidebar"
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
      <div class="flex items-center gap-2">
        {{ $t('topologyColumnAlign') }}
        <select
          class="select select-sm min-w-24"
          v-model="topologyColumnAlign"
        >
          <option :value="TOPOLOGY_COLUMN_ALIGN.TOP">{{ $t('topAlign') }}</option>
          <option :value="TOPOLOGY_COLUMN_ALIGN.CENTER">{{ $t('centerAlign') }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  autoConnectionCheck,
  autoIPCheck,
  displayProxiesRelationship,
  numberOfChartsInSidebar,
  showIPAndConnectionInfo,
  showStatisticsWhenSidebarCollapsed,
  splitOverviewPage,
  TOPOLOGY_COLUMN_ALIGN,
  topologyColumnAlign,
} from '@/store/settings'
</script>
