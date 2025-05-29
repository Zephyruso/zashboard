<template>
  <button
    class="btn btn-sm"
    @click="importDialogShow = true"
  >
    {{ $t('importSettings') }}
  </button>
  <DialogWrapper v-model="importDialogShow">
    <div class="my-4 flex items-center gap-2">
      {{ $t('importFromFile') }}
      <button
        class="btn btn-sm"
        @click="importSettingsFromFile"
      >
        {{ $t('importFromFile') }}
        <ArrowUpCircleIcon class="h-4 w-4" />
      </button>
    </div>
    <div class="my-4 flex items-center gap-2">
      {{ $t('importFromUrl') }}
      <div class="join">
        <TextInput
          v-model="importSettingsUrl"
          class="w-60 max-sm:w-36"
        />
        <button
          class="btn btn-sm join-item"
          @click="importSettingsFromUrlHandler()"
        >
          <ArrowDownTrayIcon class="h-4 w-4" />
        </button>
      </div>

      <QuestionMarkCircleIcon
        v-if="importSettingsUrl === DEFAULT_SETTINGS_URL"
        class="h-4 w-4"
        @mouseenter="
          showTip($event, $t('importFromBackendTip'), {
            appendTo: 'parent',
            placement: 'left',
          })
        "
      />
      <button
        v-else
        class="btn btn-sm"
        @click="importSettingsUrl = DEFAULT_SETTINGS_URL"
      >
        {{ $t('reset') }} URL
      </button>
    </div>
    <div class="my-4 flex items-center gap-2">
      <label class="flex cursor-pointer items-center gap-2">
        <span>{{ $t('autoImportFromUrl') }}</span>
        <input
          v-model="autoImportSettings"
          type="checkbox"
          class="toggle toggle-sm"
        />
      </label>
      <QuestionMarkCircleIcon
        class="h-4 w-4"
        @mouseenter="
          showTip($event, $t('autoImportFromUrlTip'), {
            appendTo: 'parent',
          })
        "
      />
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
import {
  ArrowDownTrayIcon,
  ArrowUpCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/vue/24/outline'
import { useNotification } from '@renderer/composables/notification'
import {
  autoImportSettings,
  DEFAULT_SETTINGS_URL,
  importSettingsFromUrl,
  importSettingsUrl,
} from '@renderer/helper/autoImportSettings'
import { useTooltip } from '@renderer/helper/tooltip'
import { ref } from 'vue'
import DialogWrapper from './DialogWrapper.vue'
import TextInput from './TextInput.vue'

const inputRef = ref<HTMLInputElement>()
const importDialogShow = ref(false)
const { showNotification } = useNotification()
const { showTip } = useTooltip()

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

const importSettingsFromFile = () => {
  inputRef.value?.click()
}
const importSettingsFromUrlHandler = async () => {
  importDialogShow.value = false
  await importSettingsFromUrl()
}
</script>
