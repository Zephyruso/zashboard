<template>
  <div class="h-full overflow-auto p-2">
    <template v-if="useConnectionCard">
      <template v-if="!renderConnections.length">
        <div class="card w-full flex-row gap-1 p-2 text-sm">
          {{ $t('noContent') }}
        </div>
      </template>
      <div class="flex flex-col gap-1">
        <ConnectionCard
          v-for="conn in renderConnections"
          :key="conn.id"
          :conn="conn"
          @info="handlerInfo"
        ></ConnectionCard>
      </div>
    </template>
    <ConnectionTable
      v-else
      @info="handlerInfo"
    />
    <dialog
      ref="modalRef"
      class="modal"
    >
      <div class="modal-box">
        <VueJsonPretty :data="infoConn" />
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
import ConnectionCard from '@/components/connections/ConnectionCard'
import ConnectionTable from '@/components/connections/ConnectionTable.vue'
import { renderConnections } from '@/store/connections'
import { useConnectionCard } from '@/store/settings'
import type { Connection } from '@/types'
import { ref } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

const infoConn = ref<Connection>()
const modalRef = ref<{
  showModal: () => void
}>()

const handlerInfo = (conn: Connection) => {
  infoConn.value = conn
  modalRef.value?.showModal()
}
</script>
