<template>
  <div class="flex h-full flex-col gap-2 overflow-x-hidden overflow-y-auto p-2">
    <ChartsCard />
    <NetworkCard v-if="showIPAndConnectionInfo" />
    <div
      v-if="displayProxiesRelationship"
      class="card"
    >
      <div class="card-title absolute px-4 pt-4">
        {{ $t('proxiesRelationship') }}
      </div>
      <ProxiesCharts />
    </div>
    <ConnectionHistory />
    <div class="flex-1" />
    <div class="card items-center justify-center gap-2 p-2 sm:flex-row">
      {{ getLabelFromBackend(activeBackend!) }} :
      <BackendVersion />
    </div>
  </div>
</template>

<script setup lang="ts">
import BackendVersion from '@renderer/components/common/BackendVersion.vue'
import ChartsCard from '@renderer/components/overview/ChartsCard.vue'
import ConnectionHistory from '@renderer/components/overview/ConnectionHistory.vue'
import NetworkCard from '@renderer/components/overview/NetworkCard.vue'
import ProxiesCharts from '@renderer/components/overview/ProxiesCharts.vue'
import { getLabelFromBackend } from '@renderer/helper/utils'
import { displayProxiesRelationship, showIPAndConnectionInfo } from '@renderer/store/settings'
import { activeBackend } from '@renderer/store/setup'
</script>
