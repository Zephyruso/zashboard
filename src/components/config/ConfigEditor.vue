<template>
  <div class="card relative flex flex-1 flex-col gap-1 overflow-x-hidden">
    <div class="card-title flex items-center gap-2 p-4">
      {{ activeConfigName }}
      <span
        v-if="isModified"
        class="text-warning text-xs opacity-75"
      >
        ({{ $t('unsaved') }})
      </span>
    </div>
    <VueMonacoEditor
      v-model:value="configFile"
      :theme="isDarkTheme ? 'vs-dark' : 'vs'"
      language="json"
      @keydown.ctrl.s.prevent="handleConfigSave"
      @change="handleConfigChange"
    />
    <button
      class="btn btn-sm btn-neutral absolute right-2 bottom-2 z-50 shadow-lg"
      @click="handleConfigSave"
    >
      {{ $t('save') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { activeConfigName, configFile } from '@/renderer/src/store/ipc-store'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { useNotification } from '@renderer/composables/notification'
import { isDarkTheme } from '@renderer/helper/utils'
import { ref, watch } from 'vue'
import { writeConfigFileAPI } from '../../api/ipc-invoke'

const { showNotification } = useNotification()

const isModified = ref(false)
const originalConfig = ref('')

// 监听配置文件变化，更新修改状态
watch(
  configFile,
  (newValue) => {
    if (originalConfig.value !== '') {
      isModified.value = newValue !== originalConfig.value
    }
  },
  { immediate: true },
)

// 监听活动配置名称变化，重置修改状态
watch(
  activeConfigName,
  () => {
    originalConfig.value = configFile.value
    isModified.value = false
  },
  { immediate: true },
)

const handleConfigChange = () => {
  // 当编辑器内容变化时，标记为已修改
  if (originalConfig.value !== '') {
    isModified.value = configFile.value !== originalConfig.value
  }
}

const handleConfigSave = () => {
  configFile.value = configFile.value.trim()

  writeConfigFileAPI(activeConfigName.value, configFile.value)
  showNotification({
    content: 'saveSuccess',
    type: 'alert-success',
    timeout: 2000,
  })

  // 保存后更新原始配置并重置修改状态
  originalConfig.value = configFile.value
  isModified.value = false
}
</script>
