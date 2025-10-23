<template>
  <div class="grid grid-cols-1 gap-2 overflow-x-hidden p-2">
    <PantheonSettings />
    <OverviewCard v-if="!splitOverviewPage" />
    <BackendSettings />
    <GeneralSettings />
    <ProxiesSettings id="proxies-settings" />

    <template v-if="isMounted">
      <ConnectionsSettings id="connections-settings" />
      <OverviewSettings />
    </template>
  </div>
</template>

<script setup lang="ts">
import BackendSettings from '@/components/settings/BackendSettings.vue'
import ConnectionsSettings from '@/components/settings/ConnectionsSettings.vue'
import GeneralSettings from '@/components/settings/GeneralSettings.vue'
import OverviewCard from '@/components/settings/OverviewCard.vue'
import OverviewSettings from '@/components/settings/OverviewSettings.vue'
import PantheonSettings from '@/components/settings/PantheonSettings.vue'
import ProxiesSettings from '@/components/settings/ProxiesSettings.vue'
import { splitOverviewPage } from '@/store/settings'
import { nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const isMounted = ref(false)
const route = useRoute()

onMounted(() => {
  requestAnimationFrame(async () => {
    isMounted.value = true
    await nextTick()
    const scrollTo = route.query.scrollTo as string
    if (scrollTo) {
      const element = document.getElementById(scrollTo)
      if (element) {
        element.scrollIntoView({ behavior: 'auto', block: 'start' })
      }
    }
  })
})
</script>
