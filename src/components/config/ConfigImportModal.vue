<template>
  <DialogWrapper v-model="isVisible">
    <div class="flex flex-col gap-4">
      <h3 class="text-lg font-bold">{{ $t('config') }}</h3>

      <!-- 创建空白配置 -->
      <div class="flex flex-col gap-1">
        <label class="text-sm">{{ $t('createEmptyConfig') }}</label>
        <div class="join flex">
          <input
            v-model="emptyConfigName"
            class="input input-sm join-item flex-1"
            :placeholder="$t('configName')"
          />
          <button
            class="btn btn-sm join-item"
            @click="handleCreateEmptyConfig"
          >
            {{ $t('create') }}
          </button>
        </div>
      </div>

      <!-- 从URL下载配置 -->
      <div class="flex flex-col gap-1">
        <label class="text-sm">{{ $t('subscriptionURL') }}</label>
        <div class="join flex">
          <input
            v-model="configURL"
            class="input input-sm join-item flex-1"
            :placeholder="$t('subscriptionURL')"
          />
          <button
            class="btn btn-sm join-item"
            @click="handleAddRemoteConfig"
          >
            {{ $t('downloadConfig') }}
          </button>
        </div>
      </div>

      <!-- 从本地文件导入配置 -->
      <div class="flex flex-col gap-1">
        <label class="text-sm">{{ $t('importConfig') }}</label>
        <div class="join flex">
          <button
            class="btn btn-sm join-item flex-1"
            @click="handleAddLocalConfig"
          >
            {{ $t('importFromFile') }}
          </button>
        </div>
        <input
          ref="configFileInput"
          type="file"
          class="hidden"
          @change="handleAddLocalConfigUploaded"
        />
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { fetchConfigList, saveConfig } from '@/renderer/src/store/ipc-store'
import { computed, ref } from 'vue'
import DialogWrapper from '../common/DialogWrapper.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const configFileInput = ref<HTMLInputElement>()
const configURL = ref('')
const emptyConfigName = ref('')

const handleCreateEmptyConfig = async () => {
  if (!emptyConfigName.value) return
  await saveConfig(
    {
      name: emptyConfigName.value,
      type: 'local',
      isActive: false,
    },
    '{}',
  )
  fetchConfigList()
  emptyConfigName.value = ''
  isVisible.value = false
}

const handleAddRemoteConfig = async () => {
  await saveConfig({
    url: configURL.value,
    name: new URL(configURL.value).hostname,
    type: 'remote',
    isActive: false,
  })
  fetchConfigList()
  configURL.value = ''
  isVisible.value = false
}

const handleAddLocalConfig = () => {
  configFileInput.value?.click()
}

const handleAddLocalConfigUploaded = async () => {
  const file = configFileInput.value?.files?.[0]
  if (!file) return
  const fileContentString = await file.text()

  await saveConfig(
    {
      name: file.name,
      type: 'local',
      isActive: false,
    },
    fileContentString,
  )
  fetchConfigList()
  isVisible.value = false
}
</script>
