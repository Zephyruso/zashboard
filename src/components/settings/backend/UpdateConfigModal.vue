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
          :aria-label="$t('configFilePath')"
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
          :aria-label="$t('configPayload')"
          v-model="configPayload"
          :placeholder="$t('configPayloadPlaceholder')"
        ></textarea>
      </div>

      <div class="setting-item">
        <label class="label cursor-pointer gap-2">
          <span class="text-sm">{{ $t('forceUpdate') }}</span>
          <input
            class="toggle toggle-sm"
            type="checkbox"
            :aria-label="$t('forceUpdate')"
            v-model="forceUpdate"
          />
        </label>
      </div>

      <button
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="isUpdating || (!configPath && !configPayload)"
        :aria-busy="isUpdating"
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
import { updateConfigsAPI } from '@/api'
import { showNotification } from '@/helper/notification'
import { fetchConfigs } from '@/store/config'
import { fetchProxies } from '@/store/proxies'
import { fetchRules } from '@/store/rules'
import { onBeforeUnmount, ref } from 'vue'
import DialogWrapper from '../../common/DialogWrapper.vue'

const modalValue = defineModel<boolean>()
const configPath = ref('')
const configPayload = ref('')
const forceUpdate = ref(false)
const isUpdating = ref(false)
let updateConfigsController: AbortController | undefined
let updateConfigsSeq = 0

const reloadAll = () => {
  fetchConfigs()
  fetchRules()
  fetchProxies()
}

const handleUpdateConfigs = async () => {
  if (isUpdating.value) return
  updateConfigsController?.abort()
  const controller = new AbortController()
  const currentSeq = ++updateConfigsSeq
  updateConfigsController = controller
  isUpdating.value = true
  try {
    await updateConfigsAPI(
      { path: configPath.value, payload: configPayload.value },
      forceUpdate.value,
      controller.signal,
    )
    if (currentSeq !== updateConfigsSeq || updateConfigsController !== controller) return
    reloadAll()
    modalValue.value = false
    showNotification({
      content: 'updateConfigsSuccess',
      type: 'alert-success',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    // error handled by axios interceptor
  } finally {
    if (updateConfigsController === controller) {
      isUpdating.value = false
      updateConfigsController = undefined
    }
  }
}

onBeforeUnmount(() => {
  updateConfigsController?.abort()
  updateConfigsController = undefined
  updateConfigsSeq += 1
})
</script>
