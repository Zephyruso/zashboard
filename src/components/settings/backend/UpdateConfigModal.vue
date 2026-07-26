<template>
  <DialogWrapper
    v-model="modalValue"
    :title="$t('updateConfigs')"
  >
    <div class="flex flex-col gap-4 p-2">
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium">{{ $t('configFilePath') }}</label>
        <input
          class="input input-bordered input-sm w-full"
          type="text"
          v-model="configPath"
          :placeholder="$t('configFilePathPlaceholder')"
        />
      </div>

      <div class="divider my-0">{{ $t('or') }}</div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium">{{ $t('configPayload') }}</label>
        <textarea
          class="textarea textarea-bordered w-full font-mono text-xs"
          rows="10"
          v-model="configPayload"
          :placeholder="$t('configPayloadPlaceholder')"
        ></textarea>
      </div>

      <div class="setting-item">
        <label class="label cursor-pointer gap-2">
          <span class="text-sm">{{ $t('forceUpdate') }}</span>
          <input
            class="toggle"
            type="checkbox"
            v-model="forceUpdate"
          />
        </label>
      </div>

      <button
        class="btn btn-primary btn-sm"
        :disabled="isUpdating || (!configPath && !configPayload)"
        @click="handleUpdateConfigs"
      >
        <span
          v-if="isUpdating"
          class="loading loading-spinner loading-md"
        ></span>
        {{ $t('updateConfigs') }}
      </button>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { updateConfigsAPI } from '@/assembly/config'
import { showNotification } from '@/helper/notification'
import { fetchConfigs } from '@/assembly/config'
import { fetchProxies } from '@/assembly/proxies'
import { fetchRules } from '@/assembly/rules'
import { ref } from 'vue'
import DialogWrapper from '../../common/DialogWrapper.vue'

const modalValue = defineModel<boolean>()
const configPath = ref('')
const configPayload = ref('')
const forceUpdate = ref(false)
const isUpdating = ref(false)

const reloadAll = () => {
  fetchConfigs()
  fetchRules()
  fetchProxies()
}

const handleUpdateConfigs = async () => {
  if (isUpdating.value) return
  isUpdating.value = true
  try {
    await updateConfigsAPI(
      { path: configPath.value, payload: configPayload.value },
      forceUpdate.value,
    )
    reloadAll()
    modalValue.value = false
    showNotification({
      content: 'updateConfigsSuccess',
      type: 'alert-success',
    })
  } catch {
    // error handled by axios interceptor
  } finally {
    isUpdating.value = false
  }
}
</script>
