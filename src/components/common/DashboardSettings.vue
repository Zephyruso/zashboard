<template>
  <button
    type="button"
    class="btn btn-sm"
    @click="dashboardSettingsDialogShow = true"
  >
    {{ $t('dashboardSettings') }}
  </button>
  <DialogWrapper
    v-model="dashboardSettingsDialogShow"
    :title="$t('dashboardSettings')"
  >
    <template #title-right>
      <button
        type="button"
        class="btn btn-xs absolute top-2 right-10"
        @click="handlerClickResetSettings"
      >
        {{ $t('resetSettings') }}
      </button>
    </template>
    <template v-if="showSyncSettings">
      <div class="settings-section-label">
        {{ $t('dashboardSettingsCore') }}
      </div>
      <div class="settings-grid">
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('uploadSettings') }}
          </div>
          <button
            type="button"
            :class="twMerge('btn btn-sm', isStorageSubmitting ? 'btn-disabled' : '')"
            :disabled="isStorageSubmitting"
            :aria-busy="isStorageSubmitting"
            @click="handlerClickUploadSettings"
          >
            {{ $t('uploadSettings') }}
          </button>
        </div>
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('syncSettings') }}
          </div>
          <button
            type="button"
            :class="twMerge('btn btn-sm', isStorageSubmitting ? 'btn-disabled' : '')"
            :disabled="isStorageSubmitting"
            :aria-busy="isStorageSubmitting"
            @click="handlerClickSyncSettings"
          >
            {{ $t('syncSettings') }}
          </button>
        </div>
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('deleteUploadedSettings') }}
          </div>
          <button
            type="button"
            :class="
              twMerge('btn btn-sm btn-error btn-soft', isStorageSubmitting ? 'btn-disabled' : '')
            "
            :disabled="isStorageSubmitting"
            :aria-busy="isStorageSubmitting"
            @click="handlerClickDeleteUploadedSettings"
          >
            {{ $t('delete') }}
          </button>
        </div>
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('autoSyncSettings') }}
          </div>
          <input
            v-model="autoSyncSettings"
            type="checkbox"
            class="toggle"
            :aria-label="$t('autoSyncSettings')"
          />
        </div>
      </div>
    </template>

    <div class="settings-section-label">
      {{ $t('dashboardSettingsJsonFile') }}
    </div>
    <div class="settings-grid">
      <div class="setting-item">
        <div class="setting-item-label">
          {{ $t('exportSettings') }}
        </div>
        <button
          type="button"
          class="btn btn-sm"
          @click="exportSettings"
        >
          {{ $t('exportSettings') }}
          <ArrowDownCircleIcon
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </div>
      <div class="setting-item">
        <div class="setting-item-label">
          {{ $t('importFromFile') }}
        </div>
        <button
          type="button"
          class="btn btn-sm"
          @click="importSettingsFromFile"
        >
          {{ $t('importFromFile') }}
          <ArrowUpCircleIcon
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>

    <div class="settings-section-label">
      {{ $t('dashboardSettingsUrl') }}
    </div>
    <div class="settings-grid">
      <div class="setting-item max-sm:flex-col max-sm:items-start! max-sm:py-3">
        <div class="setting-item-label shrink-0!">
          {{ $t('importFromUrl') }}
        </div>
        <div class="flex items-center gap-2 max-sm:flex-wrap">
          <div class="join flex-1">
            <TextInput
              v-model="importSettingsUrl"
              class="max-w-none flex-1"
            />
            <button
              type="button"
              class="btn btn-sm join-item"
              :aria-label="$t('importFromUrl')"
              :title="$t('importFromUrl')"
              :disabled="isUrlImporting"
              :aria-busy="isUrlImporting"
              @click="importSettingsFromUrlHandler()"
            >
              <ArrowDownTrayIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            </button>
          </div>
          <QuestionMarkCircleIcon
            v-if="importSettingsUrl === DEFAULT_SETTINGS_URL"
            class="h-4 w-4 shrink-0"
            @mouseenter="
              showTip($event, $t('importFromBackendTip'), {
                appendTo: 'parent',
              })
            "
          />
          <button
            v-else
            type="button"
            class="btn btn-sm"
            @click="importSettingsUrl = DEFAULT_SETTINGS_URL"
          >
            {{ $t('reset') }}
          </button>
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-item-label flex items-center gap-2">
          {{ $t('autoImportFromUrl') }}
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="
              showTip($event, $t('autoImportFromUrlTip'), {
                appendTo: 'parent',
              })
            "
          />
        </div>
        <input
          v-model="autoImportSettings"
          type="checkbox"
          class="toggle"
          :aria-label="$t('autoImportFromUrl')"
        />
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
import { deleteStorageAPI, isSingBox, setStorageAPI } from '@/api'
import {
  autoImportSettings,
  autoSyncSettings,
  DEFAULT_SETTINGS_URL,
  importSettingsFromUrl,
  importSettingsUrl,
  syncSettingsFromCore,
} from '@/helper/autoImportSettings'
import { LOCAL_IMAGE } from '@/helper/indexeddb'
import { showNotification } from '@/helper/notification'
import { useTooltip } from '@/helper/tooltip'
import {
  applyDashboardSettingsToStorage,
  exportSettings,
  getDashboardSettingsFromStorage,
  resetSettings,
} from '@/helper/utils'
import { customBackgroundURL, displayAllFeatures } from '@/store/settings'
import {
  ArrowDownCircleIcon,
  ArrowDownTrayIcon,
  ArrowUpCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogWrapper from './DialogWrapper.vue'
import TextInput from './TextInput.vue'

const inputRef = ref<HTMLInputElement>()
const dashboardSettingsDialogShow = ref(false)
const isStorageSubmitting = ref(false)
const isUrlImporting = ref(false)
const showSyncSettings = computed(() => !isSingBox.value || displayAllFeatures.value)
let importSettingsFromUrlController: AbortController | undefined
let storageSubmittingController: AbortController | undefined

const { showTip } = useTooltip()
const { t } = useI18n()

const handlerClickResetSettings = () => {
  if (!window.confirm(t('resetSettingsConfirm'))) return
  dashboardSettingsDialogShow.value = false
  resetSettings()
}

const resetFileInput = () => {
  if (inputRef.value) {
    inputRef.value.value = ''
  }
}

const handlerJsonUpload = () => {
  const file = inputRef.value?.files?.[0]
  if (!file) {
    resetFileInput()
    return
  }

  showNotification({
    content: 'importing',
  })

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const settings = JSON.parse(reader.result as string)
      applyDashboardSettingsToStorage(settings)
      location.reload()
    } catch {
      showNotification({
        content: 'importFailed',
        params: {
          url: file.name,
        },
        type: 'alert-error',
      })
      resetFileInput()
    }
  }
  reader.onerror = () => {
    showNotification({
      content: 'importFailed',
      params: {
        url: file.name,
      },
      type: 'alert-error',
    })
    resetFileInput()
  }
  reader.readAsText(file)
}

const importSettingsFromFile = () => {
  inputRef.value?.click()
}
const importSettingsFromUrlHandler = async () => {
  if (isUrlImporting.value) return

  importSettingsFromUrlController?.abort()
  const controller = new AbortController()
  const targetUrl = importSettingsUrl.value
  importSettingsFromUrlController = controller
  isUrlImporting.value = true
  try {
    dashboardSettingsDialogShow.value = false
    await importSettingsFromUrl(true, {
      signal: controller.signal,
      url: targetUrl,
    })
  } finally {
    if (importSettingsFromUrlController === controller) {
      isUrlImporting.value = false
      importSettingsFromUrlController = undefined
    }
  }
}

const createStorageSubmittingController = () => {
  storageSubmittingController?.abort()
  const controller = new AbortController()
  storageSubmittingController = controller
  return controller
}

const finishStorageSubmitting = (controller: AbortController) => {
  if (storageSubmittingController !== controller) return
  isStorageSubmitting.value = false
  storageSubmittingController = undefined
}

const handlerClickUploadSettings = async () => {
  if (isStorageSubmitting.value) return

  const controller = createStorageSubmittingController()
  isStorageSubmitting.value = true
  try {
    dashboardSettingsDialogShow.value = false
    const settings = getDashboardSettingsFromStorage()
    const iconLength = JSON.stringify(settings['config/icon-reflect-list'] || []).length
    const isIconReflectListRemoved = iconLength > 800 * 1024

    if (customBackgroundURL.value.includes(LOCAL_IMAGE)) {
      delete settings['config/custom-background-image']
    }

    if (isIconReflectListRemoved) {
      delete settings['config/icon-reflect-list']
    }

    await setStorageAPI(settings, controller.signal)
    if (storageSubmittingController !== controller) return
    showNotification({
      content: 'uploadSettingsSuccess',
      type: 'alert-success',
    })
    if (isIconReflectListRemoved) {
      showNotification({
        content: 'uploadSettingsIconReflectListRemoved',
        type: 'alert-warning',
      })
    }
  } finally {
    finishStorageSubmitting(controller)
  }
}

const handlerClickSyncSettings = async () => {
  if (isStorageSubmitting.value) return

  const controller = createStorageSubmittingController()
  isStorageSubmitting.value = true
  try {
    dashboardSettingsDialogShow.value = false
    await syncSettingsFromCore({
      force: true,
      notify: true,
      signal: controller.signal,
    })
  } finally {
    finishStorageSubmitting(controller)
  }
}

const handlerClickDeleteUploadedSettings = async () => {
  if (isStorageSubmitting.value) return
  if (!window.confirm(t('deleteUploadedSettingsConfirm'))) return

  const controller = createStorageSubmittingController()
  isStorageSubmitting.value = true
  try {
    await deleteStorageAPI(controller.signal)
    if (storageSubmittingController !== controller) return
    dashboardSettingsDialogShow.value = false
    showNotification({
      content: 'deleteUploadedSettingsSuccess',
      type: 'alert-success',
    })
  } finally {
    finishStorageSubmitting(controller)
  }
}

watch(autoSyncSettings, async (value, oldValue) => {
  if (!value || oldValue || isStorageSubmitting.value) return

  const controller = createStorageSubmittingController()
  isStorageSubmitting.value = true
  try {
    dashboardSettingsDialogShow.value = false
    await syncSettingsFromCore({ signal: controller.signal })
  } finally {
    finishStorageSubmitting(controller)
  }
})

onBeforeUnmount(() => {
  importSettingsFromUrlController?.abort()
  importSettingsFromUrlController = undefined
  storageSubmittingController?.abort()
  storageSubmittingController = undefined
})
</script>
