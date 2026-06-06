<template>
  <div class="flex h-full flex-col overflow-hidden">
    <header
      class="border-base-300/50 flex items-center gap-2 border-b p-2.5"
      v-if="!isMiddleScreen"
    >
      <FolderIcon class="h-4 w-4" />
      <h3 class="flex-1 text-sm font-medium">{{ $t('folder_manage') }}</h3>
      <button
        v-if="!isMiddleScreen"
        type="button"
        class="btn btn-circle btn-ghost btn-xs"
        :aria-label="$t('close')"
        :title="$t('close')"
        @click="folderManagerOpen = false"
      >
        <XMarkIcon
          class="h-4 w-4"
          aria-hidden="true"
        />
      </button>
    </header>

    <template v-if="!editingId">
      <div class="flex-1 overflow-y-auto p-2">
        <Draggable
          :model-value="foldersSorted"
          @update:model-value="onReorder"
          item-key="id"
          handle=".folder-drag-handle"
          :animation="150"
          class="flex flex-col gap-1"
        >
          <template #item="{ element: f }">
            <div
              class="hover:bg-base-200 group flex items-center gap-1.5 rounded-md p-1.5 transition-colors"
            >
              <Bars3Icon
                class="folder-drag-handle text-base-content/40 h-4 w-4 shrink-0 cursor-grab"
              />
              <FolderIcon class="h-4 w-4 shrink-0" />
              <span class="flex-1 truncate text-sm">{{ displayFolderName(f.name) }}</span>
              <span class="text-base-content/60 shrink-0 text-xs tabular-nums">
                {{ folderCount(f.id) }}
              </span>
              <button
                type="button"
                class="btn btn-circle btn-ghost btn-xs"
                aria-label="Edit folder"
                title="Edit folder"
                @click="onEdit(f.id)"
              >
                <PencilSquareIcon
                  class="h-3.5 w-3.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </template>
        </Draggable>
      </div>
      <footer class="border-base-300/50 border-t p-2">
        <div class="flex gap-1.5">
          <input
            v-model="newName"
            class="input input-sm input-bordered flex-1"
            :placeholder="$t('folder_new_placeholder')"
            @keydown.enter="onCreate"
          />
          <button
            type="button"
            class="btn btn-sm btn-primary"
            aria-label="Create folder"
            title="Create folder"
            :disabled="!newName.trim()"
            @click="onCreate"
          >
            <PlusIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
      </footer>
    </template>

    <FolderEditor
      v-else
      :id="editingId"
      @close="editingId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { isMiddleScreen } from '@/helper/utils'
import {
  activeFolderId,
  createFolder,
  folderCount,
  folderManagerOpen,
  folders,
  reorderFolders,
  type Folder,
} from '@/store/proxyFolders'
import {
  Bars3Icon,
  FolderIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import Draggable from 'vuedraggable'
import FolderEditor from './FolderEditor.vue'
import { displayFolderName } from './folderName'

const editingId = ref<string | null>(null)
const newName = ref('')

const foldersSorted = computed(() => [...folders.value].sort((a, b) => a.order - b.order))

const onReorder = (list: Folder[]) => {
  reorderFolders(list.map((f) => f.id))
}

const onCreate = () => {
  const name = newName.value.trim()
  if (!name) return
  createFolder(name)
  newName.value = ''
}

const onEdit = (id: string) => {
  editingId.value = id
  activeFolderId.value = id
}

watch(activeFolderId, (id) => {
  if (editingId.value === null) return
  const target = folders.value.find((f) => f.id === id)
  editingId.value = target ? target.id : null
})
</script>
