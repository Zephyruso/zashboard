<template>
  <div class="card gap-2 p-2 text-sm">
    <div class="flex items-center gap-2">
      <template v-if="isCoreRunning">
        {{ $t('pantheon.coreIsRunning') }}
        <span class="relative flex size-3">
          <span
            class="bg-primary/75 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          ></span>
          <span class="bg-primary/75 relative inline-flex size-3 rounded-full"></span>
        </span>
      </template>
      <template v-else>
        {{ $t('pantheon.coreIsNotRunning') }}
        <span class="relative flex size-3">
          <span
            class="bg-neutral/75 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          ></span>
          <span class="bg-neutral/75 relative inline-flex size-3 rounded-full"></span>
        </span>
      </template>
    </div>
    <div>
      {{ $t('pantheon.startCore') }}
      <input
        type="checkbox"
        class="toggle"
        v-model="isCoreRunning"
        @change="toggleCoreRunning"
      />
    </div>
    <div>
      {{ $t('pantheon.autoLaunch') }}
      <input
        type="checkbox"
        class="toggle"
        v-model="isAutoLaunchEnabled"
        @change="toggleAutoLaunch"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { disableAutoLaunchAPI, enableAutoLaunchAPI, startCoreAPI, stopCoreAPI } from '../../ipc'
import {
  fetchIsAutoLaunchEnabled,
  fetchIsCoreRunning,
  isAutoLaunchEnabled,
  isCoreRunning,
} from '../../store/ipc'

const toggleAutoLaunch = () => {
  if (isAutoLaunchEnabled.value) {
    enableAutoLaunchAPI()
  } else {
    disableAutoLaunchAPI()
  }
  setTimeout(() => {
    fetchIsAutoLaunchEnabled()
  }, 500)
}

const toggleCoreRunning = () => {
  if (isCoreRunning.value) {
    startCoreAPI()
  } else {
    stopCoreAPI()
  }
  setTimeout(() => {
    fetchIsCoreRunning()
  }, 500)
}
</script>
