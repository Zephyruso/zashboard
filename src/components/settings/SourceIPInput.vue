<template>
  <div
    class="relative flex w-full items-center gap-2"
    :class="sourceIPLabel.scope?.length ? 'pt-4' : ''"
  >
    <slot name="prefix"></slot>
    <span
      class="absolute top-0 left-6 truncate text-xs"
      @mouseenter="checkTruncation"
    >
      {{
        backendList
          .filter((b) => sourceIPLabel.scope?.includes(b.uuid))
          .map(getLabelFromBackend)
          .join(', ')
      }}
    </span>
    <TextInput
      class="w-12 max-w-64 flex-1 sm:w-36"
      :menus="sourceList"
      v-model="sourceIPLabel.key"
      placeholder="IP | eui64 | /Regex"
    />
    <div
      class="dropdown"
      v-if="backendList.length > 1"
    >
      <div
        tabindex="0"
        role="button"
        class="btn btn-sm"
      >
        <LockClosedIcon
          v-if="sourceIPLabel.scope?.length && sourceIPLabel.scope.length < backendList.length"
          class="h-4 w-4"
        />
        <LockOpenIcon
          v-else
          class="h-4 w-4"
        />
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu card flex flex-col gap-2 shadow-2xl"
      >
        <div
          v-for="backend in backendList"
          :key="backend.uuid"
        >
          <label class="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :checked="getScopeValueFromSouceIPByBackendID(backend.uuid, sourceIPLabel)"
              @change="
                (e: Event) => {
                  const target = e.target as HTMLInputElement

                  setScopeValueFromSouceIPByBackendID(backend.uuid, sourceIPLabel, target.checked)
                }
              "
            />
            <span>
              {{ getLabelFromBackend(backend) }}
            </span>
          </label>
        </div>
      </ul>
    </div>
    <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
    <TextInput
      class="w-24 sm:w-40"
      v-model="sourceIPLabel.label"
      :placeholder="$t('label')"
    />
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { getLabelFromBackend } from '@/helper'
import { checkTruncation } from '@/helper/tooltip'
import { connections } from '@/store/connections'
import { sourceIPLabelList } from '@/store/settings'
import { backendList } from '@/store/setup'
import type { SourceIPLabel } from '@/types'
import { ArrowRightCircleIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/vue/24/outline'
import { uniq } from 'lodash'
import { computed } from 'vue'
import TextInput from '../common/TextInput.vue'

const sourceIPLabel = defineModel<Partial<SourceIPLabel>>({
  default: {
    key: '',
    label: '',
  },
})
const sourceList = computed(() => {
  return uniq(connections.value.map((conn) => conn.metadata.sourceIP))
    .filter(Boolean)
    .filter((ip) => !sourceIPLabelList.value.find((item) => item.key === ip))
    .sort()
})

const getScopeValueFromSouceIPByBackendID = (
  backendID: string,
  sourceIP: Partial<SourceIPLabel>,
) => {
  return sourceIP.scope?.some((item) => item === backendID)
}

const setScopeValueFromSouceIPByBackendID = (
  backendID: string,
  sourceIP: Partial<SourceIPLabel>,
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
