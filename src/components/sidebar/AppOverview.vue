<template>
  <div class="card gap-2 p-2 text-sm">
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-2">
        {{ $t('coreStatus') }}
        <input
          :checked="isCoreRunning"
          type="checkbox"
          class="toggle"
          @change="toggleCoreRunning"
        />
        <span
          v-if="isCoreRunning"
          class="relative flex size-2"
        >
          <span
            class="bg-primary/75 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          />
          <span class="bg-primary/75 relative inline-flex size-2 rounded-full" />
        </span>
        <span
          v-else
          class="relative flex size-2"
        >
          <span class="bg-neutral/75 relative inline-flex size-2 rounded-full" />
        </span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      {{ $t('autoLaunch') }}
      <input
        v-model="isAutoLaunchEnabled"
        type="checkbox"
        class="toggle"
        @change="toggleAutoLaunch"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  disableAutoLaunchAPI,
  enableAutoLaunchAPI,
  startCoreAPI,
  stopCoreAPI,
} from '../../api/ipc-invoke'
import { fetchIsAutoLaunchEnabled, isAutoLaunchEnabled, isCoreRunning } from '../../store/ipc-store'

const toggleAutoLaunch = async () => {
  if (isAutoLaunchEnabled.value) {
    await enableAutoLaunchAPI()
  } else {
    await disableAutoLaunchAPI()
  }
  fetchIsAutoLaunchEnabled()
}

const toggleCoreRunning = async (e: Event) => {
  if ((e.target as HTMLInputElement).checked) {
    await startCoreAPI()
  } else {
    await stopCoreAPI()
  }
}
</script>
