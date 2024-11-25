<template>
  <div class="flex w-72 overflow-hidden rounded bg-base-200 lg:w-full lg:flex-col">
    <VueDraggable
      class="flex flex-1 flex-col gap-2 bg-base-300 p-4 lg:min-h-14 lg:flex-row"
      v-model="connectionTableColumns"
      :animation="150"
      group="list"
      ghostClass="ghost"
    >
      <div
        v-for="item in connectionTableColumns"
        :key="item"
        class="flex cursor-move items-center rounded bg-neutral px-2 text-neutral-content shadow"
      >
        {{ $t(item) }}
      </div>
    </VueDraggable>
    <VueDraggable
      class="flex flex-1 flex-col gap-2 p-4 sm:min-h-14 lg:flex-row"
      v-model="restOfColumns"
      :animation="150"
      group="list"
      ghostClass="ghost"
    >
      <div
        v-for="item in restOfColumns"
        :key="item"
        class="flex cursor-move items-center rounded bg-neutral px-2 text-neutral-content shadow"
      >
        {{ $t(item) }}
      </div>
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import { CONNECTIONS_TABLE_ACCESSOR_KEY, connectionTableColumns } from '@/store/config'
import { ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

const restOfColumns = ref(
  Object.values(CONNECTIONS_TABLE_ACCESSOR_KEY).filter(
    (key) => !connectionTableColumns.value.includes(key),
  ),
)
</script>
