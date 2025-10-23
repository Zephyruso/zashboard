<template>
  <DialogWrapper
    v-model="isVisible"
    no-padding
    no-close-button
  >
    <div class="flex max-h-[80vh] flex-col">
      <div class="border-base-300 flex items-center justify-between border-b p-2">
        <h3 class="text-lg font-semibold">{{ $t('coreStartupLogs') }}</h3>
        <div class="flex items-center gap-2">
          <div
            v-if="!hasFatalOrPanicLogs"
            class="loading loading-spinner loading-sm"
          ></div>
          <div
            v-else
            class="text-error text-sm"
          >
            ❌
          </div>
          <span class="text-base-content/70 text-sm">{{ startupStatusText }}</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-2">
        <div
          v-if="coreLogs.length === 0"
          class="text-base-content/50 py-8 text-center"
        >
          {{ $t('waitingForLogs') }}
        </div>
        <div
          v-else
          class="space-y-1"
        >
          <div
            v-for="(log, index) in coreLogs"
            :key="index"
            class="font-mono text-sm break-all whitespace-pre-wrap"
            :class="getLogClass(log)"
          >
            {{ log }}
          </div>
        </div>
      </div>

      <div class="border-base-300 flex items-center justify-between border-t p-4">
        <div class="text-base-content/70 text-sm">
          {{ $t('logCount', { count: coreLogs.length }) }}
        </div>
        <div class="flex gap-2">
          <button
            class="btn btn-sm btn-primary"
            @click="closeModal"
          >
            {{ $t('stopCore') }}
          </button>
        </div>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { stopCoreAPI } from '../../api/ipc-invoke'
import { LOG_LEVEL } from '../../constant'
import { coreLogs, isCoreRunning } from '../../store/status'
import DialogWrapper from '../common/DialogWrapper.vue'

const isVisible = defineModel<boolean>()
const { t } = useI18n()
const emit = defineEmits(['stopCore'])

watch(isCoreRunning, (isRunning) => {
  if (isRunning && isVisible.value) {
    setTimeout(() => {
      isVisible.value = false
    }, 1000)
  }
})

const closeModal = () => {
  stopCoreAPI()
  isVisible.value = false
  emit('stopCore')
}

const getLogClass = (log: string) => {
  const lowerLog = log.toLowerCase()
  if (
    lowerLog.includes(LOG_LEVEL.Error) ||
    lowerLog.includes(LOG_LEVEL.Fatal) ||
    lowerLog.includes(LOG_LEVEL.Panic)
  ) {
    return 'text-error font-bold'
  }
  if (lowerLog.includes(LOG_LEVEL.Warning)) {
    return 'text-warning'
  }
  if (lowerLog.includes('clash-api: restful api listening at')) {
    return 'text-success font-bold'
  }
  return 'text-base-content'
}

const hasFatalOrPanicLogs = computed(() => {
  return coreLogs.value.some(
    (log) =>
      log.toLowerCase().includes(LOG_LEVEL.Fatal) || log.toLowerCase().includes(LOG_LEVEL.Panic),
  )
})

const startupStatusText = computed(() => {
  if (hasFatalOrPanicLogs.value) {
    return t('startupFailed')
  }
  return t('starting')
})
</script>
