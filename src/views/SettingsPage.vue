<template>
  <div class="grid grid-cols-1 gap-2 overflow-x-hidden p-2">
    <PantheonSettings />
    <OverviewCard v-if="!splitOverviewPage" />
    <BackendSettings />
    <GeneralSettings />
    <ProxiesSettings />

    <template v-if="isMounted">
      <ConnectionsSettings />
      <OverviewSettings />
    </template>
  </div>
</template>

<script setup lang="ts">
import PantheonSettings from '@/renderer/src/components/settings/PantheonSettings.vue'
import BackendSettings from '@renderer/components/settings/BackendSettings.vue'
import ConnectionsSettings from '@renderer/components/settings/ConnectionsSettings.vue'
import GeneralSettings from '@renderer/components/settings/GeneralSettings.vue'
import OverviewCard from '@renderer/components/settings/OverviewCard.vue'
import OverviewSettings from '@renderer/components/settings/OverviewSettings.vue'
import ProxiesSettings from '@renderer/components/settings/ProxiesSettings.vue'
import { splitOverviewPage } from '@renderer/store/settings'
import { onMounted, ref } from 'vue'

const isMounted = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    isMounted.value = true
  })
})
</script>
