<template>
  <!-- PC: inline slide-out aside -->
  <aside
    v-if="!isMiddleScreen"
    class="bg-base-100 need-blur m-3 flex flex-col overflow-hidden rounded-xl"
    :class="folderManagerOpen ? 'w-80' : 'w-0'"
  >
    <FolderManagerContent v-if="folderManagerOpen" />
  </aside>

  <!-- Mobile: dialog -->
  <DialogWrapper
    v-else
    v-model="folderManagerOpen"
    :title="$t('folder_manage')"
    no-padding
    box-class="!max-w-full"
  >
    <FolderManagerContent />
  </DialogWrapper>
</template>

<script setup lang="ts">
import { isMiddleScreen } from '@/helper/utils'
import { folderManagerOpen } from '@/store/proxyFolders'
import DialogWrapper from '../../common/DialogWrapper.vue'
import FolderManagerContent from './FolderManagerContent.vue'
</script>
