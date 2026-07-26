<template>
  <button
    class="btn btn-sm"
    @click="dashboardSettingsDialogShow = true"
  >
    <Cog6ToothIcon
      v-if="iconOnly"
      class="h-4 w-4"
    />
    <template v-else>{{ $t('dashboardSettings') }}</template>
  </button>
  <DialogWrapper
    v-model="dashboardSettingsDialogShow"
    :title="$t('dashboardSettings')"
  >
    <template #title-right>
      <button
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
            :class="twMerge('btn btn-sm', isStorageSubmitting ? 'btn-disabled' : '')"
            :disabled="isStorageSubmitting"
            @click="handlerClickUploadSettings"
          >
            <ArrowUpTrayIcon class="h-4 w-4" />
          </button>
        </div>
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('syncSettings') }}
          </div>
          <button
            :class="twMerge('btn btn-sm', isStorageSubmitting ? 'btn-disabled' : '')"
            :disabled="isStorageSubmitting"
            @click="handlerClickSyncSettings"
          >
            <ArrowPathIcon class="h-4 w-4" />
          </button>
        </div>
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('deleteUploadedSettings') }}
          </div>
          <button
            :class="
              twMerge('btn btn-sm btn-error btn-soft', isStorageSubmitting ? 'btn-disabled' : '')
            "
            :disabled="isStorageSubmitting"
            @click="handlerClickDeleteUploadedSettings"
          >
            <TrashIcon class="h-4 w-4" />
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
          />
        </div>
        <div
          v-if="autoSyncSettings || skipSyncSettingsConfirm"
          class="setting-item"
        >
          <div class="setting-item-label">
            {{ $t('confirmBeforeOverride') }}
          </div>
          <input
            v-model="skipSyncSettingsConfirm"
            type="checkbox"
            class="toggle"
            :true-value="false"
            :false-value="true"
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
          class="btn btn-sm"
          @click="exportSettings"
        >
          <ArrowDownCircleIcon class="h-4 w-4" />
        </button>
      </div>
      <div class="setting-item">
        <div class="setting-item-label">
          {{ $t('importFromFile') }}
        </div>
        <button
          class="btn btn-sm"
          @click="importSettingsFromFile"
        >
          <ArrowUpCircleIcon class="h-4 w-4" />
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
              class="btn btn-sm join-item"
              @click="importSettingsFromUrlHandler()"
            >
              <ArrowDownTrayIcon class="h-4 w-4" />
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
        />
      </div>
      <div
        v-if="autoImportSettings || skipImportSettingsConfirm"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('confirmBeforeOverride') }}
        </div>
        <input
          v-model="skipImportSettingsConfirm"
          type="checkbox"
          class="toggle"
          :true-value="false"
          :false-value="true"
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
import { deleteStorageAPI, setStorageAPI } from '@/assembly/storage'
import { isSingBoxCore } from '@/assembly/version'
import {
  autoImportSettings,
  autoSyncSettings,
  DEFAULT_SETTINGS_URL,
  importSettingsFromUrl,
  importSettingsUrl,
  skipImportSettingsConfirm,
  skipSyncSettingsConfirm,
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
  ArrowPathIcon,
  ArrowUpCircleIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogWrapper from './DialogWrapper.vue'
import TextInput from './TextInput.vue'

withDefaults(
  defineProps<{
    /** 仅显示图标的触发按钮，用于左侧已有文字标签的设置行 */
    iconOnly?: boolean
  }>(),
  { iconOnly: false },
)

const inputRef = ref<HTMLInputElement>()
const dashboardSettingsDialogShow = ref(false)
const isStorageSubmitting = ref(false)
const showSyncSettings = computed(() => !isSingBoxCore.value || displayAllFeatures.value)

const { showTip } = useTooltip()
const { t } = useI18n()

const handlerClickResetSettings = () => {
  if (!window.confirm(t('resetSettingsConfirm'))) return
  dashboardSettingsDialogShow.value = false
  resetSettings()
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
    applyDashboardSettingsToStorage(settings)
    location.reload()
  }
  reader.readAsText(file)
}

const importSettingsFromFile = () => {
  inputRef.value?.click()
}
const importSettingsFromUrlHandler = async () => {
  dashboardSettingsDialogShow.value = false
  await importSettingsFromUrl({ force: true })
}

const handlerClickUploadSettings = async () => {
  if (isStorageSubmitting.value) return

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

    await setStorageAPI(settings)
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
    isStorageSubmitting.value = false
  }
}

const handlerClickSyncSettings = async () => {
  if (isStorageSubmitting.value) return

  isStorageSubmitting.value = true
  try {
    dashboardSettingsDialogShow.value = false
    await syncSettingsFromCore({
      force: true,
      notify: true,
    })
  } finally {
    isStorageSubmitting.value = false
  }
}

const handlerClickDeleteUploadedSettings = async () => {
  if (isStorageSubmitting.value) return
  if (!window.confirm(t('deleteUploadedSettingsConfirm'))) return

  isStorageSubmitting.value = true
  try {
    await deleteStorageAPI()
    dashboardSettingsDialogShow.value = false
    showNotification({
      content: 'deleteUploadedSettingsSuccess',
      type: 'alert-success',
    })
  } finally {
    isStorageSubmitting.value = false
  }
}

watch(autoSyncSettings, async (value, oldValue) => {
  if (!value || oldValue || isStorageSubmitting.value) return

  isStorageSubmitting.value = true
  try {
    dashboardSettingsDialogShow.value = false
    await syncSettingsFromCore()
  } finally {
    isStorageSubmitting.value = false
  }
})
</script>
