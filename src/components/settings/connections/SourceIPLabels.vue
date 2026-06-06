<template>
  <div
    v-if="showTrigger"
    class="setting-item"
  >
    <div class="setting-item-label">
      {{ $t('sourceIPLabels') }}
      <template v-if="sourceIPLabelList.length"> ({{ sourceIPLabelList.length }}) </template>
    </div>
    <button
      type="button"
      class="btn btn-sm"
      :aria-label="$t('sourceIPLabels')"
      :title="$t('sourceIPLabels')"
      @click="dialogVisible = true"
    >
      <PencilSquareIcon
        class="h-4 w-4"
        aria-hidden="true"
      />
    </button>
  </div>

  <DialogWrapper
    v-model="dialogVisible"
    :title="$t('sourceIPLabels')"
  >
    <div class="flex flex-col gap-2 text-sm">
      <div class="border-base-content/10 rounded-box border border-dashed p-2.5">
        <SourceIPInput
          v-model="newLabelForIP"
          @keydown.enter="() => handlerLabelAdd()"
        >
          <template #prefix>
            <TagIcon
              class="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          </template>
          <template #default>
            <button
              type="button"
              class="btn btn-circle btn-sm"
              :aria-label="$t('addSourceIPLabel')"
              :title="$t('addSourceIPLabel')"
              @click="() => handlerLabelAdd()"
            >
              <PlusIcon
                class="h-4 w-4"
                aria-hidden="true"
              />
            </button>
          </template>
        </SourceIPInput>
      </div>
      <Draggable
        v-if="dialogVisible"
        class="flex flex-1 flex-col gap-2"
        v-model="sourceIPLabelList"
        group="list"
        :animation="150"
        :handle="'.drag-handle'"
        :item-key="'uuid'"
        @start="disableSwipe = true"
        @end="disableSwipe = false"
      >
        <template #item="{ element: sourceIP }">
          <div class="border-base-content/10 rounded-box border p-2.5">
            <SourceIPInput
              :model-value="sourceIP"
              @update:model-value="handlerLabelUpdate"
            >
              <template #prefix>
                <ChevronUpDownIcon
                  class="drag-handle h-4 w-4 shrink-0 cursor-grab"
                  aria-hidden="true"
                />
              </template>
              <template #default>
                <button
                  type="button"
                  class="btn btn-circle btn-ghost btn-sm"
                  :aria-label="$t('deleteSourceIPLabel')"
                  :title="$t('deleteSourceIPLabel')"
                  @click="() => handlerLabelRemove(sourceIP.id)"
                >
                  <TrashIcon
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                </button>
              </template>
            </SourceIPInput>
          </div>
        </template>
      </Draggable>
    </div>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { disableSwipe } from '@/composables/swipe'
import { sourceIPLabelList } from '@/store/settings'
import type { SourceIPLabel } from '@/types'
import {
  ChevronUpDownIcon,
  PencilSquareIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { useSessionStorage } from '@vueuse/core'
import { v4 as uuid } from 'uuid'
import { computed, ref, watch } from 'vue'
import Draggable from 'vuedraggable'
import DialogWrapper from '../../common/DialogWrapper.vue'
import SourceIPInput from './SourceIPInput.vue'

const props = withDefaults(
  defineProps<{
    defaultKey?: string
    modelValue?: boolean
    showTrigger?: boolean
  }>(),
  {
    defaultKey: '',
    modelValue: undefined,
    showTrigger: true,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const cachedDialogVisible = useSessionStorage('cache/sourceip-label-dialog-visible', false)
const dialogVisible = computed({
  get: () => props.modelValue ?? cachedDialogVisible.value,
  set: (value: boolean) => {
    cachedDialogVisible.value = value
    emit('update:modelValue', value)
  },
})
const newLabelForIP = ref<Omit<SourceIPLabel, 'id'>>({
  key: '',
  label: '',
})

const resetNewLabelForIP = () => {
  newLabelForIP.value = {
    key: props.defaultKey,
    label: '',
  }
}

const handlerLabelAdd = (keepDialogOpen = true) => {
  if (!newLabelForIP.value.key || !newLabelForIP.value.label) {
    return
  }

  dialogVisible.value = keepDialogOpen
  sourceIPLabelList.value.push({
    ...newLabelForIP.value,
    id: uuid(),
  })

  resetNewLabelForIP()
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

watch(dialogVisible, (visible, wasVisible) => {
  if (visible && props.defaultKey && !newLabelForIP.value.key) {
    newLabelForIP.value.key = props.defaultKey
  }

  if (!visible && wasVisible) {
    handlerLabelAdd(false)
  }
})

watch(
  () => props.defaultKey,
  (defaultKey) => {
    if (dialogVisible.value && defaultKey && !newLabelForIP.value.key) {
      newLabelForIP.value.key = defaultKey
    }
  },
)
</script>
