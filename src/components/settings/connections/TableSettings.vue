<template>
  <div class="setting-item">
    <div class="setting-item-label">
      {{ $t('showFullProxyChain') }}
    </div>
    <input
      type="checkbox"
      class="toggle"
      v-model="showFullProxyChain"
    />
  </div>
  <div class="flex flex-col">
    <div class="m-4 mb-2">{{ $t('customTableColumns') }}</div>
    <div class="grid grid-cols-2 gap-3 px-4 pb-2">
      <!-- displayed columns -->
      <div class="flex flex-col gap-2">
        <div
          class="text-base-content/60 flex items-center justify-between px-1 text-xs font-medium"
        >
          <span>{{ $t('activeLabel') }}</span>
          <span class="badge badge-ghost badge-sm">{{ connectionTableColumns.length }}</span>
        </div>
        <Draggable
          class="bg-base-200 flex min-h-24 flex-col gap-2 rounded-lg p-2"
          v-model="connectionTableColumns"
          group="list"
          :animation="150"
          ghost-class="ghost"
          :item-key="(id: string) => id"
        >
          <template #item="{ element }">
            <div
              class="btn btn-sm bg-base-100 flex-nowrap justify-between gap-1 shadow-sm"
              :title="$t(element)"
            >
              <Bars2Icon class="h-4 w-4 shrink-0 cursor-move opacity-40" />
              <span class="truncate">{{ $t(element) }}</span>
              <button
                class="opacity-50 transition-opacity hover:opacity-100"
                @click.stop="removeColumn(element)"
              >
                <XMarkIcon class="h-4 w-4 shrink-0" />
              </button>
            </div>
          </template>
          <template #footer>
            <div
              v-if="!connectionTableColumns.length"
              class="text-base-content/40 flex h-16 items-center justify-center px-2 text-center text-xs"
            >
              {{ $t('dragOrClickToAdd') }}
            </div>
          </template>
        </Draggable>
      </div>
      <!-- available columns -->
      <div class="flex flex-col gap-2">
        <div
          class="text-base-content/60 flex items-center justify-between px-1 text-xs font-medium"
        >
          <span>{{ $t('availableLabel') }}</span>
          <span class="badge badge-ghost badge-sm">{{ restOfColumns.length }}</span>
        </div>
        <Draggable
          class="border-base-300 flex min-h-24 flex-col gap-2 rounded-lg border border-dashed p-2"
          v-model="restOfColumns"
          group="list"
          :animation="150"
          ghost-class="ghost"
          :item-key="(id: string) => id"
        >
          <template #item="{ element }">
            <button
              class="btn btn-sm btn-ghost border-base-300/60 flex-nowrap justify-between gap-1"
              :title="$t(element)"
              @click="addColumn(element)"
            >
              <span class="truncate">{{ $t(element) }}</span>
              <PlusIcon class="h-4 w-4 shrink-0 opacity-50" />
            </button>
          </template>
        </Draggable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CONNECTIONS_TABLE_ACCESSOR_KEY } from '@/constant'
import { connectionTableColumns, showFullProxyChain } from '@/store/settings'
import { Bars2Icon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'
import Draggable from 'vuedraggable'

const restOfColumns = ref(
  Object.values(CONNECTIONS_TABLE_ACCESSOR_KEY).filter(
    (key) => !connectionTableColumns.value.includes(key),
  ),
)

const addColumn = (key: CONNECTIONS_TABLE_ACCESSOR_KEY) => {
  restOfColumns.value = restOfColumns.value.filter((k) => k !== key)
  connectionTableColumns.value = [...connectionTableColumns.value, key]
}

const removeColumn = (key: CONNECTIONS_TABLE_ACCESSOR_KEY) => {
  connectionTableColumns.value = connectionTableColumns.value.filter((k) => k !== key)
  if (!restOfColumns.value.includes(key)) {
    restOfColumns.value = [...restOfColumns.value, key]
  }
}
</script>

<style scoped>
.ghost {
  opacity: 0.4;
}
</style>
