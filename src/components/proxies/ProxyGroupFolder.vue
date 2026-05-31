<template>
  <CollapseCard
    :name="cacheName"
    :content-class="contentClass"
    class="proxy-folder"
    :class="isFolderDropTarget && 'proxy-folder-over'"
    @dragover.prevent="handlerFolderDragOver"
    @dragleave="handlerFolderDragLeave"
    @drop.prevent="handlerFolderDrop"
  >
    <template v-slot:title>
      <div class="relative flex w-full items-center gap-2 overflow-hidden">
        <span class="text-lg leading-none">{{ folder.emoji || '📁' }}</span>
        <FolderIcon class="text-primary h-5 w-5 shrink-0" />
        <span class="min-w-0 flex-1 truncate text-sm font-medium">
          {{ folder.name }}
        </span>
        <span class="text-base-content/60 shrink-0 text-xs tabular-nums">
          {{ folder.children.length }} {{ $t('proxyGroupsCount') }}
        </span>
        <button
          class="btn btn-circle btn-ghost btn-xs no-layout-drag shrink-0"
          :title="$t('editProxyFolder')"
          @click.stop="openEditor"
        >
          <PencilSquareIcon class="h-3.5 w-3.5" />
        </button>
      </div>
      <div class="text-base-content/70 mt-1.5 flex items-center gap-1 overflow-hidden">
        <span
          v-for="child in previewChildren"
          :key="child.name"
          class="bg-base-300/70 max-w-32 shrink-0 truncate rounded px-1.5 py-0.5 text-xs"
        >
          {{ child.displayName || child.name }}
        </span>
        <span
          v-if="folder.children.length === 0"
          class="text-base-content/50 text-xs"
        >
          {{ $t('dropProxyGroupHere') }}
        </span>
      </div>
    </template>
    <template v-slot:preview>
      <div class="mt-2 flex gap-1 overflow-hidden">
        <span
          v-for="child in folder.children"
          :key="child.name"
          class="bg-base-content/30 h-2.5 w-2.5 shrink-0 rounded-full"
        />
      </div>
    </template>
    <template v-slot:content>
      <div
        class="proxy-folder-content flex min-h-20 flex-col gap-3 rounded-lg"
        :class="isFolderDropTarget && 'proxy-folder-content-over'"
      >
        <div
          v-for="child in folder.children"
          :key="child.name"
          class="proxy-folder-child no-layout-drag"
          :class="isChildDropTarget(child.name) && 'proxy-folder-child-over'"
          :data-proxy-folder-id="folder.id"
          :data-proxy-folder-child-name="child.name"
          @pointerdown.stop="handlerChildPointerDown($event, child.name)"
          @dragstart.stop="handlerChildDragStart($event, child.name)"
          @dragover.prevent.stop="handlerChildDragOver($event, child.name)"
          @dragleave.stop="handlerChildDragLeave(child.name)"
          @drop.prevent.stop="handlerChildDrop($event, child.name)"
          @dragend.stop="handlerDragEnd"
        >
          <ProxyGroup
            :name="child.name"
            :display-name="child.displayName"
          />
        </div>
        <div
          v-if="folder.children.length === 0"
          class="border-base-content/15 text-base-content/60 flex min-h-18 items-center justify-center rounded-lg border border-dashed text-xs"
        >
          {{ $t('dropProxyGroupHere') }}
        </div>
      </div>
    </template>
  </CollapseCard>

  <DialogWrapper
    v-model="editorOpen"
    :title="$t('editProxyFolder')"
  >
    <div class="flex flex-col gap-3 text-sm">
      <div class="settings-grid">
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('emoji') }}
          </div>
          <input
            class="input input-sm w-20 text-center"
            v-model="draftEmoji"
            maxlength="4"
          />
        </div>
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('proxyFolderName') }}
          </div>
          <input
            class="input input-sm min-w-32"
            v-model="draftName"
          />
        </div>
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('proxyFolderWidth') }}
          </div>
          <select
            class="select select-sm min-w-24"
            v-model.number="draftSpan"
          >
            <option
              v-for="width in widthOptions"
              :key="width"
              :value="width"
            >
              {{ width }}/{{ columnCount }}
            </option>
          </select>
        </div>
        <div class="setting-item">
          <div class="setting-item-label">
            {{ $t('proxyFolderHeight') }}
          </div>
          <select
            class="select select-sm min-w-24"
            v-model="draftHeight"
          >
            <option
              v-for="option in heightOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ $t(option.labelKey) }}
            </option>
          </select>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-primary flex-1"
          @click="saveEditor"
        >
          {{ $t('save') }}
        </button>
        <button
          class="btn flex-1"
          @click="resetEditor"
        >
          {{ $t('reset') }}
        </button>
        <button
          v-if="folder.custom"
          class="btn btn-error flex-1"
          @click="deleteFolder"
        >
          {{ $t('delete') }}
        </button>
      </div>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import {
  clearProxyLayoutDragPayload,
  getDraggedProxyGroupName,
  getProxyLayoutDragPayload,
  moveProxyGroupInFolder,
  normalizeFolderHeight,
  normalizeFolderSpan,
  proxyLayoutPointerDropTarget,
  PROXY_LAYOUT_POINTER_START_KEY,
  removeProxyGroupFolder,
  resetProxyGroupFolderMeta,
  setProxyGroupFolder,
  setProxyLayoutDragPayload,
  updateProxyGroupFolderMeta,
  type ProxyGroupFolderHeight,
  type ProxyGroupFolderEntry,
} from '@/composables/proxyGroupFolders'
import { FolderIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import { computed, inject, ref } from 'vue'
import DialogWrapper from '../common/DialogWrapper.vue'
import CollapseCard from '../common/CollapseCard.vue'
import ProxyGroup from './ProxyGroup.vue'

const props = defineProps<{
  folder: ProxyGroupFolderEntry
  columnCount: number
}>()

const startPointerDrag = inject(PROXY_LAYOUT_POINTER_START_KEY)
const cacheName = computed(() => `folder:${props.folder.id}`)
const previewChildren = computed(() => props.folder.children.slice(0, 8))
const childNames = computed(() => props.folder.children.map((child) => child.name))
const widthOptions = computed(() => {
  return Array.from({ length: props.columnCount }, (_, index) => index + 1)
})
const heightOptions: {
  value: ProxyGroupFolderHeight
  labelKey: 'small' | 'normal' | 'large' | 'proxyFolderHeightOpen'
}[] = [
  { value: 'compact', labelKey: 'small' },
  { value: 'normal', labelKey: 'normal' },
  { value: 'tall', labelKey: 'large' },
  { value: 'open', labelKey: 'proxyFolderHeightOpen' },
]
const contentClass = computed(() => {
  const classMap: Record<ProxyGroupFolderHeight, string> = {
    compact: 'max-h-72',
    normal: 'max-h-108',
    tall: 'max-h-[70dvh]',
    open: 'max-h-none',
  }

  return classMap[props.folder.height]
})

const editorOpen = ref(false)
const draftEmoji = ref('')
const draftHeight = ref<ProxyGroupFolderHeight>('normal')
const draftName = ref('')
const draftSpan = ref(1)
const folderDragOver = ref(false)
const childDragOverName = ref('')
const isFolderDropTarget = computed(() => {
  const target = proxyLayoutPointerDropTarget.value

  return folderDragOver.value || (target?.type === 'folder' && target.folderId === props.folder.id)
})

const isChildDropTarget = (groupName: string) => {
  const target = proxyLayoutPointerDropTarget.value

  return (
    childDragOverName.value === groupName ||
    (target?.type === 'folder-child' &&
      target.folderId === props.folder.id &&
      target.groupName === groupName)
  )
}

const openEditor = () => {
  draftEmoji.value = props.folder.emoji || ''
  draftHeight.value = props.folder.height
  draftName.value = props.folder.name
  draftSpan.value = props.folder.span
  editorOpen.value = true
}

const saveEditor = () => {
  updateProxyGroupFolderMeta(props.folder.id, {
    emoji: draftEmoji.value.trim() || undefined,
    height: normalizeFolderHeight(draftHeight.value),
    name: draftName.value.trim() || props.folder.name,
    span: normalizeFolderSpan(draftSpan.value, props.columnCount),
  })
  editorOpen.value = false
}

const resetEditor = () => {
  resetProxyGroupFolderMeta(props.folder.id)
  editorOpen.value = false
}

const deleteFolder = () => {
  removeProxyGroupFolder(props.folder.id)
  editorOpen.value = false
}

const handlerFolderDragOver = (event: DragEvent) => {
  const payload = getProxyLayoutDragPayload(event)
  const groupName = getDraggedProxyGroupName(payload)

  if (groupName) {
    event.stopPropagation()
    folderDragOver.value = true
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }
}

const handlerFolderDragLeave = () => {
  folderDragOver.value = false
}

const handlerFolderDrop = (event: DragEvent) => {
  const payload = getProxyLayoutDragPayload(event)
  const groupName = getDraggedProxyGroupName(payload)

  if (groupName) {
    event.stopPropagation()
    setProxyGroupFolder(groupName, props.folder.id)
    moveProxyGroupInFolder(props.folder.id, groupName, undefined, childNames.value)
  }

  folderDragOver.value = false
  childDragOverName.value = ''
}

const handlerChildDragStart = (event: DragEvent, groupName: string) => {
  setProxyLayoutDragPayload(event, {
    type: 'group',
    name: groupName,
  })
}

const handlerChildPointerDown = (event: PointerEvent, groupName: string) => {
  startPointerDrag?.(
    event,
    {
      type: 'group',
      name: groupName,
    },
    {
      allowNoLayoutDrag: true,
    },
  )
}

const handlerChildDragOver = (event: DragEvent, groupName: string) => {
  const payload = getProxyLayoutDragPayload(event)
  const draggedGroupName = getDraggedProxyGroupName(payload)

  if (!draggedGroupName || draggedGroupName === groupName) {
    return
  }

  childDragOverName.value = groupName
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handlerChildDragLeave = (groupName: string) => {
  if (childDragOverName.value === groupName) {
    childDragOverName.value = ''
  }
}

const handlerChildDrop = (event: DragEvent, groupName: string) => {
  const payload = getProxyLayoutDragPayload(event)
  const draggedGroupName = getDraggedProxyGroupName(payload)

  if (draggedGroupName) {
    setProxyGroupFolder(draggedGroupName, props.folder.id)
    moveProxyGroupInFolder(props.folder.id, draggedGroupName, groupName, childNames.value)
  }

  folderDragOver.value = false
  childDragOverName.value = ''
}

const handlerDragEnd = () => {
  folderDragOver.value = false
  childDragOverName.value = ''
  clearProxyLayoutDragPayload()
}
</script>

<style scoped>
.proxy-folder {
  transition:
    box-shadow 0.16s ease,
    background-color 0.16s ease;
}

.proxy-folder-over {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-primary) 70%, transparent);
}

.proxy-folder-content-over {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.proxy-folder-child {
  border-radius: 0.5rem;
}

.proxy-folder-child {
  cursor: grab;
  user-select: none;
  -webkit-user-drag: none;
  touch-action: pan-y;
}

.proxy-folder-child :deep(*) {
  -webkit-user-drag: none;
}

.proxy-folder-child-over {
  box-shadow: 0 -2px 0 color-mix(in srgb, var(--color-primary) 80%, transparent);
}
</style>
