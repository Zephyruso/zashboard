<template>
  <div class="grid grid-cols-1 gap-2 overflow-x-hidden p-2">
    <ZashboardSettings />

    <template v-if="!splitOverviewPage">
      <!-- overview -->
      <div class="card">
        <div class="card-title px-4 pt-4">
          {{ $t('overview') }}
        </div>
        <div
          :class="[
            'card-body grid grid-cols-1 gap-2',
            isSidebarCollapsed
              ? ['md:grid-cols-2', showIPAndConnectionInfo ? 'lg:grid-cols-3' : 'xl:grid-cols-4']
              : ['lg:grid-cols-2', showIPAndConnectionInfo ? 'xl:grid-cols-3' : '2xl:grid-cols-4'],
          ]"
        >
          <StatisticsStats type="settings" />
          <template v-if="showIPAndConnectionInfo">
            <IPCheck />
            <ConnectionStatus />
          </template>
          <SpeedCharts v-if="chartsRender > 0" />
          <div
            v-else
            class="h-28"
          ></div>
          <MemoryCharts v-if="chartsRender > 1" />
          <div
            v-else
            class="h-28"
          ></div>
          <ConnectionsCharts v-if="chartsRender > 2" />
          <div
            v-else
            class="h-28"
          ></div>
        </div>
      </div>
    </template>

    <BackendSettings />
    <ProxiesSettings />

    <ConnectionsSettings />

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
        <div
          class="flex items-center gap-2"
          v-if="!splitOverviewPage"
        >
          {{ $t('showIPAndConnectionInfo') }}
          <input
            class="toggle"
            type="checkbox"
            v-model="showIPAndConnectionInfo"
          />
        </div>
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
        <div class="flex items-center gap-2 max-md:hidden">
          {{ $t('showStatisticsWhenSidebarCollapsed') }}
          <input
            class="toggle"
            type="checkbox"
            v-model="showStatisticsWhenSidebarCollapsed"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ConnectionsCharts from '@/components/overview/ConnectionsCharts.vue'
import ConnectionStatus from '@/components/overview/ConnectionStatus.vue'
import IPCheck from '@/components/overview/IPCheck.vue'
import MemoryCharts from '@/components/overview/MemoryCharts.vue'
import SpeedCharts from '@/components/overview/SpeedCharts.vue'
import StatisticsStats from '@/components/overview/StatisticsStats.vue'
import BackendSettings from '@/components/settings/BackendSettings.vue'
import ConnectionsSettings from '@/components/settings/ConnectionsSettings.vue'
import ProxiesSettings from '@/components/settings/ProxiesSettings.vue'
import ZashboardSettings from '@/components/settings/ZashboardSettings.vue'
import {
  autoConnectionCheck,
  autoIPCheck,
  isSidebarCollapsed,
  showIPAndConnectionInfo,
  showStatisticsWhenSidebarCollapsed,
  splitOverviewPage,
} from '@/store/settings'
import { onMounted, ref } from 'vue'

const chartsRender = ref(0)

onMounted(() => {
  requestAnimationFrame(() => {
    chartsRender.value++
    requestAnimationFrame(() => {
      chartsRender.value++
      requestAnimationFrame(() => {
        chartsRender.value++
      })
    })
  })
})
</script>
