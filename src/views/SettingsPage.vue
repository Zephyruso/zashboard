<template>
  <div class="grid grid-cols-1 gap-2 overflow-x-hidden p-2">
    <ZashboardSettings />
    <OverviewCard v-if="!splitOverviewPage" />
    <BackendSettings />
    <UniversalSettings />
    <ProxiesSettings />

    <template v-if="isMounted">
      <ConnectionsSettings />
      <OverviewSettings />
    </template>
  </div>
</template>

<script setup lang="ts">
import BackendSettings from '@/components/settings/BackendSettings.vue'
import ConnectionsSettings from '@/components/settings/ConnectionsSettings.vue'
import OverviewCard from '@/components/settings/OverviewCard.vue'
import OverviewSettings from '@/components/settings/OverviewSettings.vue'
import ProxiesSettings from '@/components/settings/ProxiesSettings.vue'
import UniversalSettings from '@/components/settings/UniversalSettings.vue'
import ZashboardSettings from '@/components/settings/ZashboardSettings.vue'
import { splitOverviewPage } from '@/store/settings'
import { onMounted, ref } from 'vue'

const isMounted = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    isMounted.value = true
  })
})
</script>
