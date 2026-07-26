<template>
  <DialogWrapper
    v-model="dialogVisible"
    :title="$t('customIcon')"
  >
    <div class="flex flex-col gap-2 overflow-hidden text-sm">
      <!-- Add new: drop zone + inputs -->
      <div
        class="border-base-300 mt-2 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors"
        :class="{ 'border-primary bg-primary/5': isDraggingNew }"
        @dragover.prevent="isDraggingNew = true"
        @dragleave="isDraggingNew = false"
        @drop.prevent="handleDropNew"
      >
        <div
          class="bg-base-200 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md"
          @click="fileInputRef?.click()"
        >
          <ProxyIcon
            v-if="newIconReflect.icon"
            :icon="newIconReflect.icon"
            :size="32"
            :margin="0"
          />
          <ArrowUpTrayIcon
            v-else
            class="h-5 w-5 opacity-40"
          />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <TextInput
            v-model="newIconReflect.name"
            class="max-w-42"
            :placeholder="$t('groupName')"
            :menus="
              proxyGroupList.filter((group) => !iconReflectList.some((item) => item.name === group))
            "
            @keydown.enter="() => addIconReflect()"
            @click.stop
          />
          <TextInput
            v-model="newIconReflect.icon"
            :placeholder="$t('dropOrClickUpload')"
            :clearable="true"
            @keydown.enter="() => addIconReflect()"
            @click.stop
          />
        </div>
        <button
          class="btn btn-sm btn-circle"
          @click.stop="() => addIconReflect()"
        >
          <PlusIcon class="h-4 w-4 shrink-0" />
        </button>
      </div>
      <div class="grid flex-1 grid-cols-1 gap-2">
        <template v-if="dialogVisible">
          <div
            v-for="iconReflect in iconReflectList"
            :key="iconReflect.uuid"
            class="border-base-300 flex items-center gap-2 rounded-lg border p-2 transition-colors"
            :class="{ 'border-primary bg-primary/5': dragOverId === iconReflect.uuid }"
            @dragover.prevent="dragOverId = iconReflect.uuid"
            @dragleave="dragOverId = ''"
            @drop.prevent="handleDropOnItem($event, iconReflect)"
          >
            <div
              class="bg-base-200 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md"
              @click="triggerUploadForItem(iconReflect)"
            >
              <ProxyIcon
                v-if="iconReflect.icon"
                :icon="iconReflect.icon"
                :size="28"
                :margin="0"
              />
              <PhotoIcon
                v-else
                class="h-5 w-5 opacity-30"
              />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <TextInput
                v-model="iconReflect.name"
                class="max-w-42"
                :placeholder="$t('groupName')"
              />
              <TextInput
                v-model="iconReflect.icon"
                placeholder="Icon URL"
                :clearable="true"
              />
            </div>
            <button
              class="btn btn-sm btn-circle"
              @click="removeIconReflect(iconReflect.uuid)"
            >
              <TrashIcon class="h-4 w-4 shrink-0" />
            </button>
          </div>
        </template>
      </div>
    </div>
  </DialogWrapper>

  <input
    ref="fileInputRef"
    type="file"
    accept="image/*"
    class="hidden"
    @change="handleFileSelect"
  />
  <SettingItem :setting-key="PROXIES_ITEM_KEYS.icon">
    <div class="setting-item-label">
      {{ $t('customIcon') }}
      <template v-if="iconReflectList.length"> ({{ iconReflectList.length }}) </template>
    </div>
    <button
      class="btn btn-sm"
      @click="dialogVisible = true"
    >
      <PencilSquareIcon class="h-4 w-4" />
    </button>
  </SettingItem>
</template>

<script setup lang="ts">
import ProxyIcon from '@/components/proxies/ProxyIcon.vue'
import SettingItem from '@/components/settings/SettingItem.vue'
import { PROXIES_ITEM_KEYS } from '@/config/settingsItems'
import { proxyGroupList } from '@/assembly/proxies'
import { iconReflectList } from '@/store/settings'
import {
  ArrowUpTrayIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { useSessionStorage } from '@vueuse/core'
import { v4 as uuid } from 'uuid'
import { reactive, ref, watch } from 'vue'
import DialogWrapper from '../../common/DialogWrapper.vue'
import TextInput from '../../common/TextInput.vue'

const dialogVisible = useSessionStorage('cache/icon-dialog-visible', false)
const isDraggingNew = ref(false)
const dragOverId = ref('')
const fileInputRef = ref<HTMLInputElement>()

const newIconReflect = reactive({
  name: '',
  icon: '',
})

// Track which existing item we're uploading for
let uploadTargetItem: { icon: string; name: string; uuid: string } | null = null

const readFileAsIcon = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'))
      return
    }

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = () => {
        resolve('data:image/svg+xml,' + (reader.result as string))
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    }
  })
}

const getImageFileFromEvent = (e: DragEvent): File | undefined => {
  return Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'))
}

const handleDropNew = async (e: DragEvent) => {
  isDraggingNew.value = false
  const file = getImageFileFromEvent(e)
  if (!file) return
  newIconReflect.icon = await readFileAsIcon(file)
}

const handleDropOnItem = async (
  e: DragEvent,
  item: { icon: string; name: string; uuid: string },
) => {
  dragOverId.value = ''
  const file = getImageFileFromEvent(e)
  if (!file) return
  item.icon = await readFileAsIcon(file)
}

const triggerUploadForItem = (item: { icon: string; name: string; uuid: string }) => {
  uploadTargetItem = item
  fileInputRef.value?.click()
}

const handleFileSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const iconData = await readFileAsIcon(file)

  if (uploadTargetItem) {
    uploadTargetItem.icon = iconData
    uploadTargetItem = null
  } else {
    newIconReflect.icon = iconData
  }

  // Reset file input so the same file can be selected again
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const resetNewIconReflect = () => {
  newIconReflect.name = ''
  newIconReflect.icon = ''
}

const addIconReflect = (keepDialogOpen = true) => {
  if (!newIconReflect.name || !newIconReflect.icon) return
  dialogVisible.value = keepDialogOpen
  iconReflectList.value.push({ ...newIconReflect, uuid: uuid() })
  resetNewIconReflect()
}

const removeIconReflect = (uuid: string) => {
  const index = iconReflectList.value.findIndex((item) => item.uuid === uuid)
  iconReflectList.value.splice(index, 1)
}

watch(dialogVisible, (visible, wasVisible) => {
  if (!visible && wasVisible) {
    addIconReflect(false)
  }
})
</script>
