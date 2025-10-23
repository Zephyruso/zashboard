<template>
  <div class="card gap-2 p-2 text-sm">
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-2">
        {{ $t('coreStatus') }}
        <input
          v-model="isCoreRunningLocal"
          type="checkbox"
          class="toggle"
          @click.stop="toggleCoreRunning"
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
      <div class="flex items-center gap-2">
        {{ $t('systemProxy') }}
        <input
          v-model="isSystemProxyEnabledLocal"
          type="checkbox"
          class="toggle"
          @click.stop="toggleSystemProxy"
        />
        <span
          v-if="isSystemProxyEnabled"
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

    <CoreStartupModal
      v-model="showCoreStartupModal"
      @stopCore="stopCore"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  setSystemProxyAPI,
  startCoreAPI,
  stopCoreAPI,
  unsetSystemProxyAPI,
} from '../../api/ipc-invoke'
import {
  coreLogs,
  isCoreRunning,
  isSystemProxyEnabled,
  showCoreStartupModal,
} from '../../store/status'
import CoreStartupModal from '../modals/CoreStartupModal.vue'

const isCoreRunningLocal = ref(isCoreRunning.value)
const isSystemProxyEnabledLocal = ref(isSystemProxyEnabled.value)

watch(isCoreRunning, (newVal) => {
  isCoreRunningLocal.value = newVal
})

watch(isSystemProxyEnabled, (newVal) => {
  isSystemProxyEnabledLocal.value = newVal
})

watch(
  coreLogs,
  (newVal) => {
    if (newVal.length > 0) {
      showCoreStartupModal.value = true
    }
  },
  { deep: true },
)

const toggleCoreRunning = async () => {
  if (!isCoreRunningLocal.value) {
    showCoreStartupModal.value = true
    await startCoreAPI()
  } else {
    await stopCoreAPI()
  }
}

const toggleSystemProxy = async () => {
  if (!isSystemProxyEnabledLocal.value) {
    await setSystemProxyAPI()
  } else {
    await unsetSystemProxyAPI()
  }
}

const stopCore = () => {
  isCoreRunningLocal.value = false
}
</script>
