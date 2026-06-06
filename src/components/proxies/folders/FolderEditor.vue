<template>
  <div
    v-if="folder"
    class="flex flex-1 flex-col gap-3 overflow-y-auto p-3 text-sm"
  >
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="btn btn-circle btn-ghost btn-xs"
        :aria-label="$t('close')"
        :title="$t('close')"
        @click="$emit('close')"
      >
        <ArrowLeftIcon
          class="h-4 w-4"
          aria-hidden="true"
        />
      </button>
      <input
        class="input input-sm input-bordered flex-1"
        :value="displayName"
        @input="onNameInput(($event.target as HTMLInputElement).value)"
        :placeholder="$t('folder_name')"
      />
      <button
        type="button"
        class="btn btn-circle btn-ghost btn-xs text-error"
        :aria-label="$t('delete')"
        @click="onDelete"
        :title="$t('delete')"
      >
        <TrashIcon
          class="h-4 w-4"
          aria-hidden="true"
        />
      </button>
    </div>

    <section>
      <div class="text-base-content/70 mb-1.5 text-xs font-medium uppercase">
        {{ $t('folder_rules') }}
      </div>
      <div class="flex flex-col gap-1.5">
        <div
          v-for="(rule, idx) in folder.rules"
          :key="idx"
          class="border-base-300 flex items-center gap-1.5 rounded-md border p-1.5"
        >
          <select
            class="select select-xs select-bordered shrink-0"
            :value="rule.type"
            @change="onRuleTypeChange(idx, ($event.target as HTMLSelectElement).value)"
          >
            <option value="auto">{{ $t('folder_rule_auto') }}</option>
            <option value="regex">{{ $t('folder_rule_regex') }}</option>
            <option value="excludeRegex">{{ $t('folder_rule_exclude_regex') }}</option>
          </select>
          <select
            v-if="rule.type === 'auto'"
            class="select select-xs select-bordered flex-1"
            :value="(rule as Extract<FolderRule, { type: 'auto' }>).value"
            @change="
              updateRule(idx, {
                type: 'auto',
                value: ($event.target as HTMLSelectElement).value as 'nodeOnly' | 'hasGroup',
              })
            "
          >
            <option value="hasGroup">{{ $t('folder_auto_hasGroup') }}</option>
            <option value="nodeOnly">{{ $t('folder_auto_nodeOnly') }}</option>
          </select>
          <input
            v-else
            class="input input-xs input-bordered flex-1"
            :class="rule.type === 'excludeRegex' ? 'input-error' : ''"
            :value="(rule as { pattern: string }).pattern"
            placeholder="^(JP|KR)-"
            @input="
              updateRule(idx, {
                type: rule.type,
                pattern: ($event.target as HTMLInputElement).value,
              } as FolderRule)
            "
          />
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-xs"
            aria-label="Remove rule"
            title="Remove rule"
            @click="removeRule(idx)"
          >
            <XMarkIcon
              class="h-3.5 w-3.5"
              aria-hidden="true"
            />
          </button>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-xs justify-start gap-1"
          @click="addRule"
        >
          <PlusIcon
            class="h-3.5 w-3.5"
            aria-hidden="true"
          />
          {{ $t('folder_add_rule') }}
        </button>
      </div>
    </section>

    <section>
      <div class="text-base-content/70 mb-1.5 text-xs font-medium uppercase">
        {{ $t('folder_preview') }} ({{ matched.length }})
      </div>
      <div class="bg-base-200/50 border-base-300 max-h-40 overflow-y-auto rounded-md border p-2">
        <div
          v-if="matched.length"
          class="flex flex-wrap gap-1"
        >
          <span
            v-for="name in matched"
            :key="name"
            class="badge badge-sm badge-ghost bg-base-100 max-w-full truncate"
          >
            {{ name }}
          </span>
        </div>
        <div
          v-else
          class="text-base-content/40 py-2 text-center text-xs"
        >
          {{ $t('folder_no_matches') }}
        </div>
      </div>
    </section>

    <section>
      <div
        class="text-base-content/70 mb-1.5 flex items-center gap-2 text-xs font-medium uppercase"
      >
        <span>{{ $t('folder_manual_includes') }} ({{ folder.manualIncludes.length }})</span>
      </div>
      <input
        v-model="filterText"
        class="input input-xs input-bordered mb-1.5 w-full"
        :placeholder="$t('folder_filter_placeholder')"
      />
      <div class="border-base-300 max-h-64 overflow-y-auto rounded-md border">
        <label
          v-for="name in filteredGroups"
          :key="name"
          class="hover:bg-base-200 flex cursor-pointer items-center gap-2 px-2 py-1.5"
        >
          <input
            type="checkbox"
            class="checkbox checkbox-xs"
            :checked="folder.manualIncludes.includes(name)"
            @change="onToggle(name, ($event.target as HTMLInputElement).checked)"
          />
          <span class="flex-1 truncate text-xs">{{ name }}</span>
        </label>
        <div
          v-if="!filteredGroups.length"
          class="text-base-content/40 px-2 py-3 text-center text-xs"
        >
          {{ $t('folder_no_matches') }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { proxyGroupList } from '@/store/proxies'
import {
  addGroupToFolder,
  folders,
  groupMatchesFolderRule,
  removeFolder,
  removeManualInclude,
  updateFolder,
  type FolderRule,
} from '@/store/proxyFolders'
import { ArrowLeftIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { displayFolderName } from './folderName'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()

const folder = computed(() => folders.value.find((f) => f.id === props.id))
const displayName = computed(() => (folder.value ? displayFolderName(folder.value.name) : ''))
const filterText = ref('')

const onNameInput = (v: string) => {
  if (!folder.value) return
  updateFolder(folder.value.id, { name: v })
}

const onDelete = () => {
  if (!folder.value) return
  if (!confirm(t('folder_delete_confirm', { name: displayName.value }))) return
  removeFolder(folder.value.id)
  emit('close')
}

const addRule = () => {
  if (!folder.value) return
  updateFolder(folder.value.id, {
    rules: [...folder.value.rules, { type: 'regex', pattern: '' }],
  })
}

const updateRule = (idx: number, rule: FolderRule) => {
  if (!folder.value) return
  const next = [...folder.value.rules]
  next[idx] = rule
  updateFolder(folder.value.id, { rules: next })
}

const removeRule = (idx: number) => {
  if (!folder.value) return
  const next = [...folder.value.rules]
  next.splice(idx, 1)
  updateFolder(folder.value.id, { rules: next })
}

const onRuleTypeChange = (idx: number, type: string) => {
  if (type === 'auto') {
    updateRule(idx, { type: 'auto', value: 'hasGroup' })
  } else if (type === 'regex' || type === 'excludeRegex') {
    updateRule(idx, { type, pattern: '' })
  }
}

const onToggle = (groupName: string, checked: boolean) => {
  if (!folder.value) return
  if (checked) {
    addGroupToFolder(groupName, folder.value.id)
  } else {
    removeManualInclude(groupName, folder.value.id)
  }
}

const filteredGroups = computed(() => {
  const kw = filterText.value.trim().toLowerCase()
  if (!kw) return proxyGroupList.value
  return proxyGroupList.value.filter((n) => n.toLowerCase().includes(kw))
})

const matched = computed(() => {
  if (!folder.value) return []
  return proxyGroupList.value.filter((n) => groupMatchesFolderRule(n, folder.value!.id))
})
</script>
