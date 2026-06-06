<template>
  <div
    class="bg-base-100 scrollbar-hidden border-base-300/50 sticky top-3 z-10 m-3 mb-0 flex items-center gap-1 overflow-x-auto rounded-xl p-1 shadow"
    @touchstart="disableSwipe = true"
    @touchend="disableSwipe = false"
    @touchcancel="disableSwipe = false"
  >
    <FolderItem
      :id="VIRTUAL_ALL"
      :label="$t('folder_all')"
      :count="totalCount"
      :is-active="activeFolderId === VIRTUAL_ALL"
      orientation="horizontal"
      icon="all"
      @activate="activeFolderId = VIRTUAL_ALL"
    />
    <FolderItem
      v-for="f in foldersSorted"
      :key="f.id"
      :id="f.id"
      :label="displayFolderName(f.name)"
      :count="folderCount(f.id)"
      :is-active="activeFolderId === f.id"
      orientation="horizontal"
      icon="folder"
      @activate="activeFolderId = f.id"
    />
    <FolderItem
      v-if="folderCount(VIRTUAL_UNCAT) > 0"
      :id="VIRTUAL_UNCAT"
      :label="$t('folder_uncategorized')"
      :count="folderCount(VIRTUAL_UNCAT)"
      :is-active="activeFolderId === VIRTUAL_UNCAT"
      orientation="horizontal"
      icon="uncategorized"
      @activate="activeFolderId = VIRTUAL_UNCAT"
    />
    <button
      type="button"
      class="btn btn-ghost btn-sm ml-auto shrink-0"
      @click="folderManagerOpen = !folderManagerOpen"
      :aria-label="$t('folder_manage')"
      :title="$t('folder_manage')"
    >
      <Cog6ToothIcon
        class="h-4 w-4"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { disableSwipe } from '@/composables/swipe'
import { proxyGroupList } from '@/store/proxies'
import {
  activeFolderId,
  folderCount,
  folderManagerOpen,
  folders,
  VIRTUAL_ALL,
  VIRTUAL_UNCAT,
} from '@/store/proxyFolders'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import FolderItem from './FolderItem.vue'
import { displayFolderName } from './folderName'

const foldersSorted = computed(() => [...folders.value].sort((a, b) => a.order - b.order))
const totalCount = computed(() => proxyGroupList.value.length)
</script>
