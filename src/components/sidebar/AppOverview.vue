<template>
  <div class="card gap-2 p-2 text-sm">
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-2">
        {{ $t('coreStatus') }}
        <input
          v-model="isCoreRunning"
          type="checkbox"
          class="toggle"
          @click="toggleCoreRunning"
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
          v-model="isSystemProxyEnabled"
          type="checkbox"
          class="toggle"
          @click="toggleSystemProxy"
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

    <!-- 核心启动日志模态框 -->
    <CoreStartupModal v-model="showCoreStartupModal" />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
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

watch(
  coreLogs,
  (newVal) => {
    if (newVal.length > 0) {
      showCoreStartupModal.value = true
    }
  },
  { deep: true },
)

const toggleCoreRunning = async (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  if (!isCoreRunning.value) {
    await startCoreAPI()
  } else {
    await stopCoreAPI()
  }
}

const toggleSystemProxy = async (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  if (!isSystemProxyEnabled.value) {
    await setSystemProxyAPI()
  } else {
    await unsetSystemProxyAPI()
  }
}
</script>
