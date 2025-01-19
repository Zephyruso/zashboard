<template>
  <div class="size-full overflow-x-hidden">
    <ConnectionCardList
      v-if="useConnectionCard"
      class="overflow-x-hidden p-2"
    />
    <ConnectionTable v-else />
    <Dialog v-model:model-value="connectionDetailModalShow">
      <VueJsonPretty :data="infoConn" />
    </Dialog>
    <dialog
      ref="modalRef"
      class="modal"
    >
      <div class="modal-box relative overflow-hidden p-0">
        <div class="max-h-[90vh] overflow-y-auto p-4 max-md:max-h-[70vh]">
          <VueJsonPretty :data="infoConn" />
        </div>
        <form method="dialog">
          <button class="btn btn-circle btn-ghost btn-sm absolute right-2 top-2 outline-none">
            <XMarkIcon class="h-4 w-4" />
          </button>
        </form>
      </div>
      <form
        method="dialog"
        class="modal-backdrop"
      >
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import Dialog from '@/components/common/DialogWrapper.vue'
import ConnectionCardList from '@/components/connections/ConnectionCardList.vue'
import ConnectionTable from '@/components/connections/ConnectionTable.vue'
import { useConnections } from '@/composables/connections'
import { useConnectionCard } from '@/store/settings'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

const { infoConn, connectionDetailModalShow } = useConnections()
</script>

<style>
.vjs-tree {
  font-family:
    NotoEmoji,
    Monaco,
    Menlo,
    Consolas,
    Bitstream Vera Sans Mono,
    monospace;
}
.vjs-tree-node.is-highlight,
.vjs-tree-node:hover {
  @apply !bg-base-200;
}
</style>
