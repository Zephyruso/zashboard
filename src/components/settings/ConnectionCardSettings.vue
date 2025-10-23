<template>
  <div class="flex flex-col gap-3">
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
    <div class="relative flex flex-col rounded-sm">
      <div
        v-for="(_, index) in connectionCardLines"
        :key="index"
        :class="`flex items-center gap-2 p-2 ${index % 2 === 0 ? 'bg-base-200' : 'bg-base-300'}`"
      >
        <button
          v-if="connectionCardLines.length > 1"
          class="btn btn-circle bg-base-100 hover:bg-base-200 btn-sm shadow-sm"
          @click="removeLine(index)"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
        <Draggable
          v-model="connectionCardLines[index]"
          class="flex flex-1 flex-wrap items-center gap-2"
          :animation="150"
          group="list"
          ghost-class="ghost"
          :item-key="(id: string) => id"
        >
          <template #item="{ element }">
            <button class="btn btn-sm bg-base-100 hover:bg-base-200 cursor-move shadow-sm">
              {{ $t(element) }}
            </button>
          </template>
        </Draggable>
      </div>
      <div :class="`p-2 ${connectionCardLines.length % 2 === 1 ? 'bg-base-300' : 'bg-base-200'}`">
        <button
          class="btn btn-circle bg-base-100 hover:bg-base-200 btn-sm shadow-sm"
          @click="addLine"
        >
          <PlusIcon class="h-4 w-4" />
        </button>
      </div>

      <Draggable
        v-model="restOfColumns"
        class="flex flex-1 flex-wrap gap-2 p-2"
        :animation="150"
        group="list"
        ghost-class="ghost"
        :item-key="(id: string) => id"
      >
        <template #item="{ element }">
          <button class="btn btn-sm cursor-move">
            {{ $t(element) }}
          </button>
        </template>
      </Draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CONNECTIONS_TABLE_ACCESSOR_KEY, DETAILED_CARD_STYLE, SIMPLE_CARD_STYLE } from '@/constant'
import { connectionCardLines } from '@/store/settings'
import { PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
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
  connectionCardLines.value = [
    ...connectionCardLines.value,
    restOfColumns.value[0] ? [restOfColumns.value[0]] : [],
  ]
  setRestOfColumns()
}

const removeLine = (index: number) => {
  connectionCardLines.value.splice(index, 1)
  setRestOfColumns()
}
</script>
