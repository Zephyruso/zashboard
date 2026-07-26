<template>
  <CtrlsBar>
    <div class="flex h-12 flex-row items-center gap-2 p-2 text-sm">
      <span class="truncate overflow-hidden">
        {{ getLabelFromBackend(activeBackend!) }}
      </span>
      <span class="mx-1">|</span>
      <BackendVersion />
      <template v-if="startedAt">
        <span class="mx-1">|</span>
        <BackendUptime />
      </template>
      <button
        class="btn btn-circle btn-sm absolute top-2 right-2"
        @click="showCardSettingsDialog = true"
      >
        <Cog6ToothIcon class="h-4 w-4" />
      </button>
    </div>
    <OverviewCardSettingsDialog v-model="showCardSettingsDialog" />
  </CtrlsBar>
</template>

<script setup lang="ts">
import { startedAt } from '@/assembly/version'
import BackendUptime from '@/components/common/BackendUptime.vue'
import BackendVersion from '@/components/common/BackendVersion.vue'
import OverviewCardSettingsDialog from '@/components/overview/OverviewCardSettingsDialog.vue'
import { useCtrlsBar } from '@/composables/useCtrlsBar'
import { getLabelFromBackend } from '@/helper/utils'
import { activeBackend } from '@/store/setup'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'
import CtrlsBar from '../common/CtrlsBar.vue'

const showCardSettingsDialog = ref(false)

useCtrlsBar()
</script>
