<template>
  <button
    class="btn btn-sm"
    @click="importDialogShow = true"
  >
    {{ $t('importSettings') }}
  </button>
  <DialogWrapper v-model="importDialogShow">
    <div class="my-2 flex items-center gap-2">
      {{ $t('importFromFile') }}
      <button
        class="btn btn-sm"
        @click="importSettingsFromFile"
      >
        {{ $t('importFromFile') }}
        <ArrowUpCircleIcon class="h-4 w-4" />
      </button>
    </div>
    <div class="my-2 flex items-center gap-2">
      {{ $t('importFromUrl') }}
      <div class="join flex-1">
        <TextInput
          v-model="importSettingsUrl"
          class="w-36 max-w-64 flex-1"
        />
        <button
          class="btn btn-sm join-item"
          @click="importSettingsFromUrl"
        >
          <ArrowDownTrayIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
    <input
      ref="inputRef"
      type="file"
      accept=".json"
      class="hidden"
      @change="handlerJsonUpload"
    />
  </DialogWrapper>
</template>

<script setup lang="ts">
import { ArrowDownTrayIcon, ArrowUpCircleIcon } from '@heroicons/vue/24/outline'
import { useNotification } from '@renderer/composables/notification'
import { useStorage } from '@vueuse/core'
import { ref } from 'vue'
import DialogWrapper from './DialogWrapper.vue'
import TextInput from './TextInput.vue'

const inputRef = ref<HTMLInputElement>()
const importDialogShow = ref(false)
const { showNotification } = useNotification()

const importSettingsFromFile = () => {
  inputRef.value?.click()
}

const handlerJsonUpload = () => {
  showNotification({
    content: 'importing',
  })
  const file = inputRef.value?.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    const settings = JSON.parse(reader.result as string)

    for (const key in settings) {
      localStorage.setItem(key, settings[key])
    }
    location.reload()
  }
  reader.readAsText(file)
}

const importSettingsUrl = useStorage('config/import-settings-url', '')

const importSettingsFromUrl = async () => {
  showNotification({
    content: 'importing',
  })

  const res = await fetch(importSettingsUrl.value)
  const settings = await res.json()

  if (!settings) {
    return
  }

  for (const key in settings) {
    localStorage.setItem(key, settings[key])
  }
  location.reload()
}
</script>
