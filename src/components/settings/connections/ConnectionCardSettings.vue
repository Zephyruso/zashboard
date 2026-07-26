<template>
  <div class="flex flex-col gap-3 p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span>{{ $t('customCardLines') }}</span>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-sm"
          @click="((connectionCardLines = SIMPLE_CARD_STYLE), setRestOfColumns())"
        >
          {{ $t('simpleCardPreset') }}
        </button>
        <button
          class="btn btn-sm"
          @click="((connectionCardLines = DETAILED_CARD_STYLE), setRestOfColumns())"
        >
          {{ $t('detailedCardPreset') }}
        </button>
      </div>
    </div>
    <div class="flex flex-col gap-2 overflow-hidden rounded-lg">
      <div
        v-for="(_, index) in connectionCardLines"
        :key="index"
        :class="`flex items-center gap-2 p-2 ${index % 2 === 0 ? 'bg-base-200/40' : 'bg-base-300/40'}`"
      >
        <button
          v-if="connectionCardLines.length > 1"
          class="btn btn-circle bg-base-100 hover:bg-error hover:text-error-content btn-sm shrink-0 shadow-sm"
          @click="removeLine(index)"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
        <Draggable
          class="flex flex-1 flex-wrap items-center gap-2"
          v-model="connectionCardLines[index]"
          :animation="150"
          group="list"
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
                @click.stop="removeField(index, element)"
              >
                <XMarkIcon class="h-4 w-4 shrink-0" />
              </button>
            </div>
          </template>
          <template #footer>
            <span
              v-if="!connectionCardLines[index].length"
              class="text-base-content/40 px-1 text-xs"
            >
              {{ $t('dragOrClickToAdd') }}
            </span>
          </template>
        </Draggable>
      </div>
      <div
        :class="`p-2 ${connectionCardLines.length % 2 === 1 ? 'bg-base-300/40' : 'bg-base-200/40'}`"
      >
        <button
          class="btn btn-sm gap-1"
          @click="addLine"
        >
          <PlusIcon class="h-4 w-4" />
          {{ $t('addRow') }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="text-base-content/60 flex items-center justify-between px-1 text-xs font-medium">
        <span>{{ $t('availableLabel') }}</span>
        <span class="badge badge-ghost badge-sm">{{ restOfColumns.length }}</span>
      </div>
      <Draggable
        class="border-base-300 flex min-h-16 flex-1 flex-wrap gap-2 rounded-lg border border-dashed p-2"
        v-model="restOfColumns"
        :animation="150"
        group="list"
        ghost-class="ghost"
        :item-key="(id: string) => id"
      >
        <template #item="{ element }">
          <button
            class="btn btn-sm btn-ghost border-base-300/60 flex-nowrap gap-1"
            :title="$t(element)"
            @click="addField(element)"
          >
            <span class="truncate">{{ $t(element) }}</span>
            <PlusIcon class="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </template>
      </Draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CONNECTIONS_TABLE_ACCESSOR_KEY, DETAILED_CARD_STYLE, SIMPLE_CARD_STYLE } from '@/constant'
import { connectionCardLines } from '@/store/settings'
import { Bars2Icon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'
import Draggable from 'vuedraggable'

const restOfColumns = ref<CONNECTIONS_TABLE_ACCESSOR_KEY[]>([])

const setRestOfColumns = () => {
  restOfColumns.value = Object.values(CONNECTIONS_TABLE_ACCESSOR_KEY).filter(
    (key) => !connectionCardLines.value.flat().includes(key),
  )
}

setRestOfColumns()

const addLine = () => {
  connectionCardLines.value = [...connectionCardLines.value, []]
}

const removeLine = (index: number) => {
  const removed = connectionCardLines.value[index]
  connectionCardLines.value.splice(index, 1)
  restOfColumns.value = [...restOfColumns.value, ...removed]
}

const addField = (key: CONNECTIONS_TABLE_ACCESSOR_KEY) => {
  restOfColumns.value = restOfColumns.value.filter((k) => k !== key)
  const lines = connectionCardLines.value
  const target = lines.length ? lines[lines.length - 1] : (lines[0] = [])
  target.push(key)
}

const removeField = (index: number, key: CONNECTIONS_TABLE_ACCESSOR_KEY) => {
  connectionCardLines.value[index] = connectionCardLines.value[index].filter((k) => k !== key)
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
