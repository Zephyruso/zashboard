<template>
  <div class="flex items-center gap-2">
    {{ $t('sourceIPLabels') }}
    <template v-if="sourceIPLabelList.length"> ({{ sourceIPLabelList.length }}) </template>
    <button
      v-if="sourceIPLabelList.length"
      class="btn btn-sm btn-circle"
      @click="dialogVisible = !dialogVisible"
    >
      <ChevronUpIcon
        v-if="dialogVisible"
        class="h-4 w-4"
      />
      <ChevronDownIcon
        v-else
        class="h-4 w-4"
      />
    </button>
  </div>
  <div
    class="transparent-collapse collapse rounded-none shadow-none"
    :class="dialogVisible ? 'collapse-open' : ''"
  >
    <div class="collapse-content p-0">
      <div class="flex flex-col gap-2">
        <Draggable
          v-if="dialogVisible"
          v-model="sourceIPLabelList"
          class="flex flex-1 flex-col gap-2"
          group="list"
          :animation="150"
          :handle="'.drag-handle'"
          :item-key="'uuid'"
          @start="disableSwipe = true"
          @end="disableSwipe = false"
        >
          <template #item="{ element: sourceIP }">
            <SourceIPInput
              :model-value="sourceIP"
              @update:model-value="handlerLabelUpdate"
            >
              <template #prefix>
                <ChevronUpDownIcon class="drag-handle h-4 w-4 shrink-0 cursor-grab" />
              </template>
              <template #default>
                <button
                  class="btn btn-circle btn-ghost btn-sm"
                  @click="() => handlerLabelRemove(sourceIP.id)"
                >
                  <TrashIcon class="h-4 w-4" />
                </button>
              </template>
            </SourceIPInput>
          </template>
        </Draggable>
      </div>
    </div>
  </div>
  <SourceIPInput
    v-model="newLabelForIP"
    @keydown.enter="handlerLabelAdd"
  >
    <template #prefix>
      <TagIcon class="h-4 w-4 shrink-0" />
    </template>
    <template #default>
      <button
        class="btn btn-circle btn-sm"
        @click="handlerLabelAdd"
      >
        <PlusIcon class="h-4 w-4" />
      </button>
    </template>
  </SourceIPInput>
</template>

<script setup lang="ts">
import { disableSwipe } from '@/composables/swipe'
import { sourceIPLabelList } from '@/store/settings'
import type { SourceIPLabel } from '@/types'
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { useSessionStorage } from '@vueuse/core'
import { v4 as uuid } from 'uuid'
import { ref } from 'vue'
import Draggable from 'vuedraggable'
import SourceIPInput from './SourceIPInput.vue'

const dialogVisible = useSessionStorage('cache/sourceip-label-dialog-visible', false)
const newLabelForIP = ref<Omit<SourceIPLabel, 'id'>>({
  key: '',
  label: '',
})

const handlerLabelAdd = () => {
  if (!newLabelForIP.value.key || !newLabelForIP.value.label) {
    return
  }

  dialogVisible.value = true
  sourceIPLabelList.value.push({
    ...newLabelForIP.value,
    id: uuid(),
  })

  newLabelForIP.value = {
    key: '',
    label: '',
  }
}

const handlerLabelRemove = (id: string) => {
  sourceIPLabelList.value.splice(
    sourceIPLabelList.value.findIndex((item) => item.id === id),
    1,
  )
}

const handlerLabelUpdate = (sourceIP: Partial<SourceIPLabel>) => {
  const index = sourceIPLabelList.value.findIndex((item) => item.id === sourceIP.id)

  sourceIPLabelList.value[index] = {
    ...sourceIPLabelList.value[index],
    ...sourceIP,
  }
}
</script>
