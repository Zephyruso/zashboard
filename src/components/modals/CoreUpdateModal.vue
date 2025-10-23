<template>
  <DialogWrapper v-model="isOpen">
    <h3 class="text-lg font-bold">{{ $t('updateCore') }}</h3>
    <p class="py-4">{{ $t('updateCoreDescription') }}</p>

    <div class="flex flex-col gap-4">
      <!-- 官方更新按钮 -->
      <button
        class="btn btn-primary"
        :disabled="isUpdating"
        @click="handleOfficialUpdate"
      >
        <span
          v-if="isUpdating"
          class="loading loading-spinner loading-sm"
        ></span>
        {{ $t('updateFromOfficial') }}
      </button>

      <!-- 手动上传按钮 -->
      <button
        class="btn"
        :disabled="isUpdating"
        @click="handleFileUpload"
      >
        <span
          v-if="isUpdating"
          class="loading loading-spinner loading-sm"
        ></span>
        {{ $t('updateFromFile') }}
      </button>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import {
  selectCoreFileAPI,
  updateCoreFromFileAPI,
  updateCoreFromOfficialAPI,
} from '@/api/ipc-invoke'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import { useNotification } from '@/composables/notification'
import { ref } from 'vue'

const isOpen = defineModel<boolean>('modelValue', { required: true })
const isUpdating = ref(false)

const { showNotification } = useNotification()
const handleCoreUpdateSuccess = (message: string) => {
  isOpen.value = false
  isUpdating.value = false
  showNotification({
    message: message,
    type: 'alert-success',
  })
}

const handleCoreUpdateError = (error: string) => {
  isOpen.value = false
  isUpdating.value = false
  showNotification({
    message: error,
    type: 'alert-error',
  })
}

const handleOfficialUpdate = async () => {
  if (isUpdating.value) return

  isUpdating.value = true
  try {
    const result = await updateCoreFromOfficialAPI()
    handleCoreUpdateSuccess(result)
  } catch (error) {
    handleCoreUpdateError(error instanceof Error ? error.message : String(error))
  } finally {
    isUpdating.value = false
  }
}

const handleFileUpload = async () => {
  if (isUpdating.value) return

  try {
    const filePath = await selectCoreFileAPI()
    if (filePath) {
      isUpdating.value = true
      const result = await updateCoreFromFileAPI(filePath)
      handleCoreUpdateSuccess(result)
    }
  } catch (error) {
    handleCoreUpdateError(error instanceof Error ? error.message : String(error))
  } finally {
    isUpdating.value = false
  }
}
</script>
