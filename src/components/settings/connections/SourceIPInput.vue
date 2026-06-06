<template>
  <div class="flex w-full flex-col gap-1.5">
    <div class="flex w-full items-center gap-2">
      <slot name="prefix"></slot>
      <TextInput
        class="min-w-0 flex-1"
        :menus="sourceList"
        v-model="sourceIPLabel.key"
        placeholder="IP/CIDR | eui64 | /Regex"
      />

      <slot></slot>
    </div>
    <div class="flex w-full items-center gap-2">
      <ArrowRightCircleIcon
        class="text-base-content/40 h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <TextInput
        class="flex-1"
        v-model="sourceIPLabel.label"
        :placeholder="$t('label')"
      />
      <span
        v-if="sourceIPLabel.scope?.length"
        class="text-base-content/50 max-w-48 shrink-0 truncate text-xs"
        @mouseenter="checkTruncation"
      >
        {{
          backendList
            .filter((b) => sourceIPLabel.scope?.includes(b.uuid))
            .map(getLabelFromBackend)
            .join(', ')
        }}
      </span>
      <button
        v-if="backendList.length > 1"
        type="button"
        class="rounded-field bg-base-200 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center"
        :aria-label="$t('sourceIPLabelScope')"
        :title="$t('sourceIPLabelScope')"
        :aria-pressed="isLocked"
        @click="bindBackendMenu"
      >
        <LockClosedIcon
          v-if="isLocked"
          class="h-4 w-4"
          aria-hidden="true"
        />
        <LockOpenIcon
          v-else
          class="h-4 w-4"
          aria-hidden="true"
        />
      </button>
    </div>
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
import TextInput from '../../common/TextInput.vue'

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
  return Boolean(
    sourceIPLabel.value.scope?.length &&
    sourceIPLabel.value.scope.length < backendList.value.length,
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
