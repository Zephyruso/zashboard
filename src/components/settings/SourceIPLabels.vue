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
    class="collapse rounded-none shadow-none"
    :class="dialogVisible ? 'collapse-open' : ''"
  >
    <div class="collapse-content p-0">
      <div class="flex flex-col gap-2">
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
            <div
              :key="sourceIP.id"
              class="flex w-full items-center gap-2"
            >
              <ChevronUpDownIcon class="drag-handle h-4 w-4 shrink-0 cursor-grab" />
              <TextInput
                class="w-12 max-w-64 flex-1 sm:w-36"
                :modelValue="sourceIP.key"
                :menus="sourceList"
                @change="(e) => handlerLabelKeyChange(sourceIP.id, 'key', e)"
              />
              <button
                class="btn btn-sm"
                :popovertarget="sourceIP.id"
                :style="`anchor-name:--${sourceIP.id}`"
              >
                <LockClosedIcon
                  v-if="sourceIP.scope?.length && sourceIP.scope.length < backendList.length"
                  class="h-4 w-4"
                />
                <LockOpenIcon
                  v-else
                  class="h-4 w-4"
                />
              </button>
              <ul
                class="dropdown menu bg-base-100 mt-2 rounded-sm shadow-md"
                popover
                :id="sourceIP.id"
                :style="`position-anchor:--${sourceIP.id}`"
              >
                <div
                  v-for="backend in backendList"
                  :key="backend.uuid"
                  class="mb-2"
                >
                  <label class="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      :checked="getScopeValueFromSouceIPByBackendID(backend.uuid, sourceIP)"
                      @change="
                        (e: Event) => {
                          const target = e.target as HTMLInputElement

                          setScopeValueFromSouceIPByBackendID(
                            backend.uuid,
                            sourceIP,
                            target.checked,
                          )
                        }
                      "
                    />
                    <span>
                      {{ getLabelFromBackend(backend) }}
                    </span>
                  </label>
                </div>
              </ul>
              <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
              <TextInput
                class="w-24 sm:w-40"
                :modelValue="sourceIP.label"
                @change="(e) => handlerLabelKeyChange(sourceIP.id, 'label', e)"
              />
              <button
                class="btn btn-circle btn-ghost btn-sm"
                @click="() => handlerLabelRemove(sourceIP.id)"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </template>
        </Draggable>
      </div>
    </div>
  </div>
  <div class="flex w-full items-center gap-2">
    <TagIcon class="h-4 w-4 shrink-0" />
    <TextInput
      class="w-28 max-w-64 flex-1 sm:w-36"
      :menus="sourceList"
      v-model="newLabelForIP.key"
      placeholder="IP | eui64 | /Regex"
    />
    <button
      class="btn btn-sm"
      popovertarget="popover-new-sourceip-label"
      style="anchor-name: --new-souceip-label"
    >
      <LockClosedIcon
        v-if="newLabelForIP.scope?.length && newLabelForIP.scope.length < backendList.length"
        class="h-4 w-4"
      />
      <LockOpenIcon
        v-else
        class="h-4 w-4"
      />
    </button>
    <ul
      class="dropdown menu bg-base-100 mt-2 rounded-sm shadow-md"
      popover
      id="popover-new-sourceip-label"
      style="position-anchor: --new-souceip-label"
    >
      <div
        v-for="backend in backendList"
        :key="backend.uuid"
        class="mb-2"
      >
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            class="checkbox checkbox-sm"
            :checked="getScopeValueFromSouceIPByBackendID(backend.uuid, newLabelForIP)"
            @change="
              (e: Event) => {
                const target = e.target as HTMLInputElement

                setScopeValueFromSouceIPByBackendID(backend.uuid, newLabelForIP, target.checked)
              }
            "
          />
          <span>
            {{ getLabelFromBackend(backend) }}
          </span>
        </label>
      </div>
    </ul>
    <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
    <TextInput
      class="w-24 sm:w-40"
      v-model="newLabelForIP.label"
      :placeholder="$t('label')"
      @keypress.enter="handlerLabelAdd"
    />
    <button
      class="btn btn-circle btn-sm"
      @click="handlerLabelAdd"
    >
      <PlusIcon class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { disableSwipe } from '@/composables/swipe'
import { getLabelFromBackend } from '@/helper'
import { connections } from '@/store/connections'
import { sourceIPLabelList } from '@/store/settings'
import { backendList } from '@/store/setup'
import type { SourceIPLabel } from '@/types'
import {
  ArrowRightCircleIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
  LockOpenIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { useSessionStorage } from '@vueuse/core'
import { uniq } from 'lodash'
import { v4 as uuid } from 'uuid'
import { computed, reactive } from 'vue'
import Draggable from 'vuedraggable'
import TextInput from '../common/TextInput.vue'

const dialogVisible = useSessionStorage('cache/sourceip-label-dialog-visible', false)
const sourceList = computed(() => {
  return uniq(connections.value.map((conn) => conn.metadata.sourceIP))
    .filter(Boolean)
    .filter((ip) => !sourceIPLabelList.value.find((item) => item.key === ip))
    .sort()
})

const newLabelForIP = reactive<Omit<SourceIPLabel, 'id'>>({
  key: '',
  label: '',
})

const handlerLabelAdd = () => {
  if (!newLabelForIP.key || !newLabelForIP.label) {
    return
  }

  dialogVisible.value = true
  sourceIPLabelList.value.push({
    ...newLabelForIP,
    id: uuid(),
  })

  newLabelForIP.key = ''
  newLabelForIP.label = ''
  delete newLabelForIP.scope
}

const handlerLabelRemove = (id: string) => {
  sourceIPLabelList.value.splice(
    sourceIPLabelList.value.findIndex((item) => item.id === id),
    1,
  )
}

const handlerLabelKeyChange = (id: string, path: 'key' | 'label', value: string) => {
  const key = value
  const source = sourceIPLabelList.value.find((item) => item.id === id)

  if (source) {
    source[path] = key
  }
}

const getScopeValueFromSouceIPByBackendID = (
  backendID: string,
  sourceIP: Omit<SourceIPLabel, 'id'>,
) => {
  return sourceIP.scope?.some((item) => item === backendID)
}

const setScopeValueFromSouceIPByBackendID = (
  backendID: string,
  sourceIP: Omit<SourceIPLabel, 'id'>,
  value: boolean,
) => {
  if (value) {
    if (!sourceIP.scope) {
      sourceIP.scope = []
    }
    sourceIP.scope?.push(backendID)
  } else {
    sourceIP.scope = sourceIP.scope?.filter((item) => item !== backendID)
    if (!sourceIP.scope?.length) {
      delete sourceIP.scope
    }
  }
}
</script>
