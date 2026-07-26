<template>
  <div
    ref="topBarRef"
    class="bg-base-100 md:bg-base-100/80 need-blur border-base-300/50 sticky z-10 flex min-w-0 items-center gap-1 overflow-hidden shadow backdrop-blur-xl transition-all duration-300"
    :class="isStuck ? 'm-0 rounded-none px-4 pt-2 pb-1.5' : 'mx-3 mt-3 rounded-xl p-1'"
    :style="{ top: isMiddleScreen ? '-1px' : `${ctrlsBottom - 1}px` }"
    @touchstart="disableSwipe = true"
    @touchend="disableSwipe = false"
    @touchcancel="disableSwipe = false"
  >
    <div class="scrollbar-hidden flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
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
    </div>
    <button
      class="btn btn-ghost btn-sm shrink-0"
      @click="folderManagerOpen = !folderManagerOpen"
      :title="$t('folder_manage')"
    >
      <Cog6ToothIcon class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ctrlsBottom } from '@/composables/paddingViews'
import { disableSwipe } from '@/composables/swipe'
import { proxyGroupList } from '@/assembly/proxies'
import {
  activeFolderId,
  folderCount,
  folderManagerOpen,
  folders,
  VIRTUAL_ALL,
  VIRTUAL_UNCAT,
} from '@/store/proxyFolders'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FolderItem from './FolderItem.vue'
import { displayFolderName } from './folderName'
import { isMiddleScreen } from '@/helper/utils.ts'

const foldersSorted = computed(() => [...folders.value].sort((a, b) => a.order - b.order))
const totalCount = computed(() => proxyGroupList.value.length)

const topBarRef = ref<HTMLElement | null>(null)
const isStuck = ref(false)
let observer: IntersectionObserver | null = null

const createObserver = () => {
  observer?.disconnect()
  if (!topBarRef.value) return
  observer = new IntersectionObserver(([entry]) => (isStuck.value = entry.intersectionRatio < 1), {
    threshold: [1],
    // Offset the detection boundary by the height of the (fixed/sticky) ctrls bar
    // so the top bar registers as "stuck" once it pins right below the ctrls.
    rootMargin: `-${Math.max(ctrlsBottom.value, 0)}px 0px 0px 0px`,
  })
  observer.observe(topBarRef.value)
}

onMounted(createObserver)

// Recreate the observer when the ctrls bar height changes (resize / orientation).
watch(ctrlsBottom, createObserver)

onBeforeUnmount(() => observer?.disconnect())
</script>
