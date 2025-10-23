<template>
  <DialogWrapper v-model="isVisible">
    <div class="flex flex-col gap-4">
      <h3 class="text-lg font-bold">{{ $t('profiles') }}</h3>

      <!-- 创建空白配置 -->
      <div class="flex flex-col gap-1">
        <label class="text-sm">{{ $t('createEmptyProfile') }}</label>
        <div class="join flex">
          <input
            v-model="emptyConfigName"
            class="input input-sm join-item flex-1"
            :placeholder="$t('profileName')"
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
            v-model="profileURL"
            class="input input-sm join-item flex-1"
            :placeholder="$t('subscriptionURL')"
          />
          <button
            class="btn btn-sm join-item"
            @click="handleAddRemoteConfig"
          >
            {{ $t('downloadProfile') }}
          </button>
        </div>
      </div>

      <!-- 从本地文件导入配置 -->
      <div class="flex flex-col gap-1">
        <label class="text-sm">{{ $t('importProfile') }}</label>
        <div class="join flex">
          <button
            class="btn btn-sm join-item flex-1"
            @click="handleAddLocalConfig"
          >
            {{ $t('importFromLocalFile') }}
          </button>
        </div>
        <input
          ref="profileFileInput"
          type="file"
          class="hidden"
          @change="handleAddLocalConfigUploaded"
        />
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { saveProfile } from '@/store/profiles'
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

const profileFileInput = ref<HTMLInputElement>()
const profileURL = ref('')
const emptyConfigName = ref('')

const handleCreateEmptyConfig = async () => {
  if (!emptyConfigName.value) return
  await saveProfile(
    {
      name: emptyConfigName.value,
      type: 'local',
      isActive: false,
      uuid: '',
    },
    '{}',
  )
  emptyConfigName.value = ''
  isVisible.value = false
}

const handleAddRemoteConfig = async () => {
  await saveProfile({
    url: profileURL.value,
    name: new URL(profileURL.value).hostname,
    type: 'remote',
    isActive: false,
    updatedAt: -1,
    autoUpdate: true,
    interval: 60 * 60,
    uuid: '',
  })
  profileURL.value = ''
  isVisible.value = false
}

const handleAddLocalConfig = () => {
  profileFileInput.value?.click()
}

const handleAddLocalConfigUploaded = async () => {
  const file = profileFileInput.value?.files?.[0]
  if (!file) return
  const fileContentString = await file.text()

  await saveProfile(
    {
      name: file.name,
      type: 'local',
      isActive: false,
      uuid: '',
    },
    fileContentString,
  )
  isVisible.value = false
}
</script>
