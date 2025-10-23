<template>
  <div
    class="relative flex w-full items-center gap-2"
    :class="sourceIPLabel.scope?.length ? 'pt-4' : ''"
  >
    <slot name="prefix" />
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
      v-model="sourceIPLabel.key"
      class="w-12 max-w-64 flex-1 sm:w-36"
      :menus="sourceList"
      placeholder="IP | eui64 | /Regex"
    />
    <div
      v-if="backendList.length > 1"
      class="rounded-field bg-base-200 flex h-8 w-8 cursor-pointer items-center justify-center"
      @click="bindBackendMenu"
    >
      <LockClosedIcon
        v-if="isLocked"
        class="h-4 w-4"
      />
      <LockOpenIcon
        v-else
        class="h-4 w-4"
      />
    </div>
    <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
    <TextInput
      v-model="sourceIPLabel.label"
      class="w-24 sm:w-40"
      :placeholder="$t('label')"
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { checkTruncation, useTooltip } from '@/helper/tooltip'
import { getLabelFromBackend } from '@/helper/utils'
import { connections } from '@/store/connections'
import { sourceIPLabelList } from '@/store/settings'
import { backendList } from '@/store/setup'
import type { SourceIPLabel } from '@/types'
import { ArrowRightCircleIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/vue/24/outline'
import { uniq } from 'lodash-es'
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
  return sourceIP.scope?.some((item) => item === backendID) ?? false
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

const isLocked = computed(() => {
  return (
    sourceIPLabel.value.scope?.length && sourceIPLabel.value.scope.length < backendList.value.length
  )
})

const { showTip } = useTooltip()
const bindBackendMenu = (e: Event) => {
  const backendListContent = document.createElement('div')

  backendListContent.classList.add('flex', 'flex-col', 'gap-2', 'py-1')

  for (const backend of backendList.value) {
    const label = document.createElement('label')
    const checkbox = document.createElement('input')
    const span = document.createElement('span')

    label.classList.add('flex', 'items-center', 'gap-2', 'cursor-pointer')

    checkbox.type = 'checkbox'
    checkbox.classList.add('checkbox', 'checkbox-sm')
    checkbox.checked = getScopeValueFromSouceIPByBackendID(backend.uuid, sourceIPLabel.value)
    checkbox.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement

      setScopeValueFromSouceIPByBackendID(backend.uuid, sourceIPLabel.value, target.checked)
    })

    span.textContent = getLabelFromBackend(backend)
    label.append(checkbox, span)
    backendListContent.append(label)
  }

  showTip(e, backendListContent, {
    theme: 'base',
    placement: 'bottom-start',
    trigger: 'click',
    appendTo: document.body,
    interactive: true,
    arrow: false,
  })
}
</script>
