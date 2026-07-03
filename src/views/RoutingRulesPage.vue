<template>
  <div
    class="relative flex size-full flex-col overflow-hidden"
    :style="padding"
  >
    <CtrlsBar>
      <div class="flex flex-wrap items-center gap-2 p-2">
        <div class="tabs-box tabs tabs-xs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab"
            :class="activeTab === tab.key && 'tab-active'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <details
          ref="presetDropdownRef"
          class="dropdown"
        >
          <summary
            class="select select-sm flex max-w-64 min-w-40 items-center justify-between gap-2"
          >
            <span class="flex min-w-0 items-center gap-2">
              <QueueListIcon class="h-4 w-4 shrink-0" />
              <span class="truncate">{{ selectedPresetName }}</span>
            </span>
            <ChevronDownIcon class="h-4 w-4 shrink-0" />
          </summary>

          <div
            class="dropdown-content bg-base-100 border-base-300 z-50 mt-2 w-72 rounded-xl border p-1 shadow-xl"
          >
            <div class="flex items-center gap-2 px-2 py-1.5 text-sm font-medium">
              <QueueListIcon class="h-4 w-4" />
              配置预设
            </div>
            <div class="border-base-300 my-1 border-t" />

            <template v-if="routingPresets.length > 0">
              <div
                v-for="preset in routingPresets"
                :key="preset.id"
                class="hover:bg-base-200 flex w-full items-start gap-1 rounded-lg text-sm"
              >
                <button
                  class="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 text-left"
                  type="button"
                  @click="applyRoutingPreset(preset.id)"
                >
                  <CheckIcon
                    class="mt-0.5 h-4 w-4 shrink-0"
                    :class="selectedPresetId === preset.id ? 'opacity-100' : 'opacity-0'"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate">{{ preset.name }}</span>
                    <span
                      v-if="preset.remoteConfigLabel || preset.remoteConfigUrl"
                      class="text-base-content/55 mt-0.5 block truncate text-xs"
                    >
                      {{ preset.remoteConfigLabel || preset.remoteConfigUrl }}
                    </span>
                  </span>
                </button>
                <button
                  v-if="preset.custom"
                  class="btn btn-ghost btn-xs btn-circle mt-1.5 mr-1 shrink-0"
                  type="button"
                  aria-label="删除预设"
                  @click="removeCustomPreset(preset.id)"
                >
                  <TrashIcon class="h-3.5 w-3.5" />
                </button>
              </div>
            </template>
            <div
              v-else
              class="text-base-content/60 px-2 py-3 text-center text-sm"
            >
              暂无保存的预设
            </div>

            <div class="border-base-300 my-1 border-t" />
            <button
              class="hover:bg-base-200 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm"
              type="button"
              @click="openAddPresetDialog"
            >
              <PlusIcon class="h-4 w-4 shrink-0" />
              <span>添加预设</span>
            </button>
          </div>
        </details>

        <div class="hidden flex-1 sm:block" />

        <div class="flex items-center gap-2">
          <button
            class="btn btn-circle btn-sm"
            type="button"
            title="添加当前标签内容"
            @click="openActiveAddDialog"
          >
            <PlusIcon class="h-4 w-4" />
          </button>

          <button
            class="btn btn-circle btn-sm"
            type="button"
            :title="activeTab === 'groups' ? '折叠或展开全部分组' : '折叠或展开全部规则卡片'"
            @click="activeTab === 'groups' ? toggleAllGroups() : toggleAllRuleCards()"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
              data-slot="icon"
              class="h-4 w-4 transition-transform"
              :class="
                activeTab === 'groups'
                  ? allGroupsCollapsed
                    ? 'rotate-180'
                    : ''
                  : allRuleCardsCollapsed
                    ? 'rotate-180'
                    : ''
              "
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m4.5 15.75 7.5-7.5 7.5 7.5"
              />
            </svg>
          </button>

          <button
            class="btn btn-circle btn-sm"
            type="button"
            :disabled="!selectedPreset || deletingPreset"
            :title="deletingPreset ? '删除中…' : '删除当前预设'"
            @click="deleteSelectedPreset"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </CtrlsBar>

    <div class="min-h-0 flex-1 overflow-hidden">
      <div class="flex h-full w-full flex-col p-3">
        <div
          v-if="activeTab === 'groups'"
          class="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-4"
        >
          <Draggable
            v-model="groups"
            item-key="id"
            handle=".group-drag-handle"
            :animation="150"
            ghost-class="routing-ghost"
            class="grid min-h-0 auto-rows-max grid-cols-1 content-start items-start gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:col-span-3"
            @end="queueSaveRoutingWorkspace"
          >
            <template #item="{ element: group }">
              <RoutingRuleGroupBucket
                :available-resources="resourcePool"
                :available-nodes="nodeResources"
                :group="group"
                :collapsed-ids="collapsedGroupIds"
                :can-drop-item="canDropItemIntoGroup"
                drag-group-name="routing-resource-pool"
                @add-resources="addResourcesToActiveCard"
                @delete-group="deleteGroup"
                @edit-group="openEditGroupDialog"
                @toggle-group="toggleActiveCard"
                @remove-item="removeItemFromActiveCard"
                @update-group-enabled="updateGroupEnabled"
                @update-group-items="updateGroupItems"
              />
            </template>
          </Draggable>

          <aside class="base-container hidden min-h-0 flex-col p-4 xl:col-span-1 xl:flex">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold">All Resources</h2>
              </div>
              <div class="badge badge-outline">{{ resourcePool.length }}</div>
            </div>

            <Draggable
              :model-value="resourcePool"
              :sort="false"
              item-key="entryId"
              :group="{ name: 'routing-resource-pool', pull: 'clone', put: false }"
              :clone="cloneResourceReference"
              handle=".resource-drag-handle"
              :animation="150"
              ghost-class="routing-ghost"
              class="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
            >
              <template #item="{ element: resource }">
                <div class="border-base-300/50 bg-base-200/35 rounded-xl border px-3 py-2">
                  <div class="flex items-center gap-3">
                    <Bars3Icon
                      class="resource-drag-handle text-base-content/45 h-4 w-4 shrink-0 cursor-grab"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-sm font-medium">{{ resource.name }}</div>
                      <div class="text-base-content/55 mt-1 truncate text-xs">
                        {{ resource.type === 'group' ? 'Group resource' : resource.address }}
                      </div>
                    </div>
                    <div
                      class="badge badge-sm"
                      :class="
                        resource.type === 'group' ? 'badge-ghost' : 'badge-primary badge-outline'
                      "
                    >
                      {{ resource.type === 'group' ? 'Group' : 'Node' }}
                    </div>
                  </div>
                </div>
              </template>
            </Draggable>
          </aside>
        </div>

        <div
          v-else
          class="h-full min-h-0"
        >
          <Draggable
            v-model="ruleCards"
            item-key="id"
            handle=".rule-card-drag-handle"
            :animation="150"
            ghost-class="routing-ghost"
            class="grid h-full min-h-0 auto-rows-max grid-cols-1 content-start items-start gap-4 overflow-y-auto pr-1 md:grid-cols-2"
            @end="queueSaveRoutingWorkspace"
          >
            <template #item="{ element: card }">
              <div class="min-h-0 self-start">
                <RoutingRuleCard
                  :available-resources="resourcePool"
                  :available-rule-sets="availableRuleSetOptions"
                  :card="card"
                  :collapsed-ids="collapsedRuleCardIds"
                  :rule-set-loading="ruleSetOptionsLoading"
                  @toggle-card="toggleRuleCard"
                  @edit-card="openEditRuleCardDialog"
                  @delete-card="deleteRuleCard"
                  @add-rule="addRuleToCard"
                  @remove-rule="removeRuleFromCard"
                  @search-rule-sets="loadRuleSetOptions"
                  @update-enabled="updateRuleCardEnabled"
                  @update-outbound-target="updateRuleCardOutboundTarget"
                />
              </div>
            </template>
          </Draggable>
        </div>
      </div>
    </div>

    <DialogWrapper
      v-model="addGroupDialogOpen"
      :title="groupDialogTitle"
      box-class="max-w-lg"
      @enter="confirmAddGroup"
    >
      <div class="p-1">
        <div class="grid gap-4">
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">分组名称</span>
            <input
              v-model.trim="newGroupName"
              class="input input-bordered w-full"
              type="text"
              placeholder="例如：Video Route"
            />
          </label>

          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">分组类型</span>
            <select
              v-model="newGroupType"
              class="select select-bordered w-full"
            >
              <option
                v-for="option in groupTypeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <div class="form-control">
            <label class="flex w-full items-center justify-between gap-4">
              <span class="label-text text-sm font-medium">启用</span>
              <input
                v-model="newGroupEnabled"
                class="toggle toggle-primary"
                type="checkbox"
              />
            </label>
          </div>

          <template v-if="supportsHealthCheck">
            <label class="form-control gap-2">
              <span class="label-text text-sm font-medium">测试地址</span>
              <input
                v-model.trim="newGroupTestUrl"
                class="input input-bordered w-full"
                type="text"
                placeholder="https://www.gstatic.com/generate_204"
              />
            </label>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="form-control gap-2">
                <span class="label-text text-sm font-medium">检查间隔</span>
                <input
                  v-model.trim="newGroupInterval"
                  class="input input-bordered w-full"
                  type="number"
                  min="0"
                  placeholder="300"
                />
              </label>

              <label
                v-if="newGroupType === 'url-test'"
                class="form-control gap-2"
              >
                <span class="label-text text-sm font-medium">切换容差</span>
                <input
                  v-model.trim="newGroupTolerance"
                  class="input input-bordered w-full"
                  type="number"
                  min="0"
                  placeholder="50"
                />
              </label>
            </div>

            <div class="form-control">
              <label class="flex w-full items-center justify-between gap-4">
                <span class="label-text text-sm font-medium">懒惰检查</span>
                <input
                  v-model="newGroupLazy"
                  class="toggle toggle-primary"
                  type="checkbox"
                />
              </label>
            </div>
          </template>

          <label
            v-if="newGroupType === 'load-balance'"
            class="form-control gap-2"
          >
            <span class="label-text text-sm font-medium">负载均衡策略</span>
            <select
              v-model="newGroupStrategy"
              class="select select-bordered w-full"
            >
              <option
                v-for="option in loadBalanceStrategyOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <div class="grid min-h-12 gap-4 md:grid-cols-[auto_1fr] md:items-center">
            <label class="flex min-h-12 items-center gap-3">
              <span class="text-sm font-medium">正则</span>
              <input
                v-model="newGroupRegexEnabled"
                class="toggle toggle-primary"
                type="checkbox"
              />
            </label>

            <label
              class="form-control min-h-12 justify-center gap-2"
              :class="!newGroupRegexEnabled && 'pointer-events-none invisible'"
            >
              <input
                v-model.trim="newGroupMatchPattern"
                class="input input-bordered w-full"
                type="text"
                :disabled="!newGroupRegexEnabled"
                placeholder="输入正则或关键字匹配节点"
              />
            </label>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            class="btn btn-sm"
            type="button"
            @click="closeGroupDialog"
          >
            取消
          </button>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            :disabled="!canConfirmAddGroup"
            @click="confirmAddGroup"
          >
            确认
          </button>
        </div>
      </div>
    </DialogWrapper>

    <DialogWrapper
      v-model="ruleCardDialogOpen"
      :title="ruleCardDialogTitle"
      box-class="max-w-md"
      @enter="confirmRuleCardDialog"
    >
      <div class="p-1">
        <div class="grid gap-4">
          <label class="form-control gap-2">
            <span class="label-text text-sm font-medium">出站目标</span>
            <input
              v-model="ruleCardOutboundSearch"
              class="input input-bordered w-full"
              list="rule-card-outbound-options"
              type="text"
              placeholder="搜索并选择节点或分组"
              @input="syncRuleCardOutboundKeyFromSearch"
            />
            <datalist id="rule-card-outbound-options">
              <option
                v-for="resource in resourcePool"
                :key="`${resource.type}:${resource.id}`"
                :value="formatRuleCardOutboundOption(resource)"
              />
            </datalist>
          </label>

          <div class="form-control">
            <label class="flex w-full items-center justify-between gap-4">
              <span class="label-text text-sm font-medium">启用</span>
              <input
                v-model="ruleCardEnabled"
                class="toggle toggle-primary"
                type="checkbox"
              />
            </label>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            class="btn btn-sm"
            type="button"
            @click="closeRuleCardDialog"
          >
            取消
          </button>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            :disabled="!canConfirmRuleCardDialog"
            @click="confirmRuleCardDialog"
          >
            确认
          </button>
        </div>
      </div>
    </DialogWrapper>

    <DialogWrapper
      v-model="presetDialogOpen"
      title="添加预设"
      box-class="max-w-lg"
      @enter="confirmAddPreset"
    >
      <div class="grid gap-4">
        <label class="form-control gap-2">
          <span class="label-text text-sm font-medium">预设名称</span>
          <input
            v-model.trim="newPresetName"
            class="input input-bordered w-full"
            type="text"
            placeholder="例如：自用规则"
          />
        </label>

        <label class="form-control gap-2">
          <span class="label-text text-sm font-medium">配置</span>
          <input
            v-model="newPresetRemoteConfigUrl"
            class="input input-bordered w-full"
            list="routing-remote-config-options"
            type="url"
            placeholder="输入远程配置 URL，或从候选中选择"
          />
          <datalist id="routing-remote-config-options">
            <option
              v-for="option in remoteConfigOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </datalist>
          <span
            v-if="selectedRemoteConfigUrl"
            class="text-base-content/55 truncate text-xs"
          >
            {{
              selectedRemoteConfig
                ? `已选择：${selectedRemoteConfig.label}`
                : selectedRemoteConfigUrl
            }}
          </span>
        </label>

        <div class="flex justify-end gap-2 pt-2">
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            @click="closePresetDialog"
          >
            取消
          </button>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            :disabled="!newPresetName.trim() || presetSaving"
            @click="confirmAddPreset"
          >
            {{ presetSaving ? '生成中…' : '保存' }}
          </button>
        </div>
      </div>
    </DialogWrapper>
  </div>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import RoutingRuleCard from '@/components/routing/RoutingRuleCard.vue'
import RoutingRuleGroupBucket from '@/components/routing/RoutingRuleGroupBucket.vue'
import {
  createGroupSetAPI,
  createMihomoRuleProviderAPI,
  createRoutingRuleSetAPI,
  deleteGroupSetAPI,
  deleteRoutingRuleSetAPI,
  expandRemoteRuleSetAPI,
  fetchRemoteTextAPI,
  searchRuleSourceRepositoryIndexAPI,
  updateGroupSetAPI,
  updateMihomoRuleProviderAPI,
  updateRoutingRuleSetAPI,
} from '@/api/fastproxy'
import { remoteConfigPresets } from '@/config/remoteConfigPresets'
import { usePaddingForViews } from '@/composables/paddingViews'
import { showNotification } from '@/helper/notification'
import type {
  RoutingGroupMode,
  RoutingGroupReference,
  RoutingGroupResource,
  RoutingItemReference,
  RoutingNodeReference,
  RoutingNodeResource,
} from '@/components/routing/RoutingRuleGroupBucket.vue'
import type {
  RuleSetOption,
  RoutingRuleDraft,
  RoutingRuleCardResource,
  RoutingRuleLeaf,
  RoutingRuleTargetReference,
} from '@/components/routing/RoutingRuleCard.vue'
import {
  fastProxyRepository,
  fastProxySelectedCore,
  fastProxySelectedRoutingRuleSetIds,
  loadFastProxyWorkspace,
  updateFastProxyGlobalConfigFields,
} from '@/store/fastproxyRepository'
import type {
  FastProxyCoreId,
  FastProxyGroupSetResource,
  FastProxyMihomoRuleProviderResource,
  FastProxyNormalizedGroup,
  FastProxyNormalizedNode,
  FastProxyNormalizedRule,
  FastProxyRuleSetResource,
  FastProxyRuleSourceIndexEntry,
  FastProxyRoutingRuleCard,
} from '@/types/fastproxy'
import {
  Bars3Icon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  QueueListIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { useStorage } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Draggable from 'vuedraggable'

const { t } = useI18n()
const { padding } = usePaddingForViews()

type RoutingPresetOption = {
  custom?: boolean
  groupSetIds: string[]
  id: string
  name: string
  remoteConfigLabel?: string
  remoteConfigUrl?: string
  ruleSetIds: string[]
}

type CustomRoutingPreset = RoutingPresetOption & {
  custom: true
}

const activeTab = ref<'groups' | 'rules'>('groups')
const presetDropdownRef = ref<HTMLDetailsElement | null>(null)
const selectedPresetId = ref<string | null>(null)
const collapsedGroupIds = ref<string[]>([])
const collapsedRuleCardIds = ref<string[]>([])
const addGroupDialogOpen = ref(false)
const ruleCardDialogOpen = ref(false)
const presetDialogOpen = ref(false)
const editingGroupId = ref<string | null>(null)
const editingRuleCardId = ref<string | null>(null)
const ruleCardOutboundKey = ref('')
const ruleCardOutboundSearch = ref('')
const newPresetName = ref('')
const newPresetRemoteConfigUrl = ref('')
const newGroupName = ref('')
const newGroupType = ref<RoutingGroupMode>('select')
const newGroupEnabled = ref(true)
const newGroupRegexEnabled = ref(false)
const newGroupMatchPattern = ref('')
const newGroupTestUrl = ref('https://www.gstatic.com/generate_204')
const newGroupInterval = ref('300')
const newGroupTolerance = ref('50')
const newGroupLazy = ref(true)
const newGroupStrategy = ref<'round-robin' | 'consistent-hashing' | 'sticky-sessions'>(
  'round-robin',
)
const ruleCardEnabled = ref(true)
const INITIAL_ENTRY_ID = 1000
const INITIAL_RULE_CARD_ID = 3
const INITIAL_RULE_LEAF_ID = 6

const nextEntryId = ref(INITIAL_ENTRY_ID)
const nextRuleCardId = ref(INITIAL_RULE_CARD_ID)
const nextRuleLeafId = ref(INITIAL_RULE_LEAF_ID)

const tabs = computed(() => [
  { key: 'groups' as const, label: t('routingRuleGroups') },
  { key: 'rules' as const, label: t('rules') },
])

const customRoutingPresets = useStorage<CustomRoutingPreset[]>('config/routing-custom-presets', [])

const remoteConfigOptions = computed(() => remoteConfigPresets.flatMap((group) => group.options))

const selectedRemoteConfig = computed(() => {
  return remoteConfigOptions.value.find(
    (option) => option.value === newPresetRemoteConfigUrl.value.trim(),
  )
})

const selectedRemoteConfigUrl = computed(() => newPresetRemoteConfigUrl.value.trim())

const repositoryRoutingPresets = computed<RoutingPresetOption[]>(() => {
  const presetMap = new Map<string, RoutingPresetOption>()
  for (const groupSet of repository.value?.groupSets || []) {
    const name = groupSet.name?.trim()
    if (!name) continue
    const current = presetMap.get(name) || {
      id: name,
      name,
      groupSetIds: [],
      ruleSetIds: [],
    }
    current.groupSetIds.push(groupSet.id)
    presetMap.set(name, current)
  }
  for (const ruleSet of repository.value?.routingRuleSets || []) {
    const name = ruleSet.name?.trim()
    if (!name) continue
    const current = presetMap.get(name) || {
      id: name,
      name,
      groupSetIds: [],
      ruleSetIds: [],
    }
    current.ruleSetIds.push(ruleSet.id)
    presetMap.set(name, current)
  }
  return [...presetMap.values()].sort((left, right) => left.name.localeCompare(right.name))
})

const routingPresets = computed<RoutingPresetOption[]>(() => {
  const wrappedRepositoryPresetKeys = new Set(
    customRoutingPresets.value.map((preset) =>
      getPresetResourceKey(preset.groupSetIds, preset.ruleSetIds),
    ),
  )
  const visibleRepositoryPresets = repositoryRoutingPresets.value.filter((preset) => {
    return !wrappedRepositoryPresetKeys.has(
      getPresetResourceKey(preset.groupSetIds, preset.ruleSetIds),
    )
  })

  return [...visibleRepositoryPresets, ...customRoutingPresets.value].sort((left, right) =>
    left.name.localeCompare(right.name),
  )
})

const selectedPreset = computed(() => {
  return routingPresets.value.find((preset) => preset.id === selectedPresetId.value) || null
})

const selectedPresetName = computed(() => {
  const selectedPreset = routingPresets.value.find((preset) => preset.id === selectedPresetId.value)
  return selectedPreset?.name ?? '配置预设'
})

const groupDialogTitle = computed(() => {
  return editingGroupId.value ? '编辑分组' : '添加分组'
})

const ruleCardDialogTitle = computed(() => {
  return editingRuleCardId.value ? '编辑规则卡片' : '添加规则卡片'
})

const groupTypeOptions: Array<{ label: string; value: RoutingGroupMode }> = [
  { label: '手动选择', value: 'select' },
  { label: '自动选择', value: 'url-test' },
  { label: '自动回退', value: 'fallback' },
  { label: '负载均衡', value: 'load-balance' },
]

const loadBalanceStrategyOptions = [
  { label: 'round-robin', value: 'round-robin' as const },
  { label: 'consistent-hashing', value: 'consistent-hashing' as const },
  { label: 'sticky-sessions', value: 'sticky-sessions' as const },
]

const supportsHealthCheck = computed(() => {
  return ['url-test', 'fallback', 'load-balance'].includes(newGroupType.value)
})

const repository = computed(() => fastProxyRepository.value)
const profilePresetId = computed(() => {
  const configuredRuleSetIds = fastProxySelectedRoutingRuleSetIds.value
  if (!configuredRuleSetIds.length) return null

  let bestPreset: RoutingPresetOption | null = null
  let bestScore = 0

  for (const preset of routingPresets.value) {
    const presetRuleSetIds = new Set(preset.ruleSetIds)
    const score = configuredRuleSetIds.filter((id) => presetRuleSetIds.has(id)).length

    if (score > bestScore) {
      bestPreset = preset
      bestScore = score
    }
  }

  return bestPreset?.id ?? null
})
const nodeResources = ref<RoutingNodeResource[]>([])
const groups = ref<RoutingGroupResource[]>([])
const builtInRuleSetOptions = ref<RuleSetOption[]>([])
const ruleSetOptionQuery = ref('')
const ruleSetOptionSourceFilter = ref<'all' | RuleSetOption['source']>('built-in')
const ruleSetOptionsLoading = ref(false)
const ruleSetOptionsLoadToken = ref(0)
const deletingPreset = ref(false)
const presetSaving = ref(false)
const saveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const savingWorkspace = ref(false)
const saveQueuedWhileBusy = ref(false)
const activeCore = computed<FastProxyCoreId>(() => fastProxySelectedCore.value)
const ruleSourceRepositoryIds = computed(() => {
  const repositoryIds = (repository.value?.ruleSourceRepositories || [])
    .filter((item) => item.builtIn || item.supportedCores?.includes(activeCore.value))
    .map((item) => item.id)
  return repositoryIds.length > 0 ? repositoryIds : ['metacubex-meta-rules-dat']
})
const customRuleSetOptions = computed<RuleSetOption[]>(() => {
  if (activeCore.value === 'sing-box') {
    return (repository.value?.singBoxRuleSets || []).map((item) => ({
      value: item.tag,
      label: item.name,
      description: `自定义 · ${item.tag} · ${item.sourceMode}`,
      source: 'custom' as const,
    }))
  }

  return (repository.value?.mihomoRuleProviders || []).map((item) => ({
    value: item.provider,
    label: item.name,
    description: `自定义 · ${item.provider} · ${item.sourceMode}`,
    source: 'custom' as const,
  }))
})
const availableRuleSetOptions = computed<RuleSetOption[]>(() => {
  const custom = filterRuleSetOptions(customRuleSetOptions.value, ruleSetOptionQuery.value)
  if (ruleSetOptionSourceFilter.value === 'built-in') {
    return builtInRuleSetOptions.value
  }
  if (ruleSetOptionSourceFilter.value === 'custom') {
    return custom
  }
  return dedupeRuleSetOptions([...builtInRuleSetOptions.value, ...custom])
})

const dedupeRuleSetOptions = (items: RuleSetOption[]) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })
}

const filterRuleSetOptions = (items: RuleSetOption[], query: string) => {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return items

  return items.filter((item) =>
    [item.label, item.value, item.description].some((field) =>
      field.toLowerCase().includes(keyword),
    ),
  )
}

const ruleSourceEntryToRuleSetOption = (
  entry: FastProxyRuleSourceIndexEntry,
  core: FastProxyCoreId,
): RuleSetOption | null => {
  const file = entry.files?.[core]
  if (!file) return null

  return {
    value: entry.logicalPath,
    label: entry.logicalPath,
    description:
      core === 'sing-box'
        ? `内置 · sing-box · ${file.format || '-'}`
        : `内置 · mihomo · ${file.behavior || '-'} · ${file.format || '-'}`,
    source: 'built-in',
  }
}

const loadRuleSetOptions = async (options: {
  query: string
  source: 'all' | RuleSetOption['source']
}) => {
  const token = ruleSetOptionsLoadToken.value + 1
  ruleSetOptionsLoadToken.value = token
  ruleSetOptionQuery.value = options.query
  ruleSetOptionSourceFilter.value = options.source

  const repositoryIds = ruleSourceRepositoryIds.value
  const core = activeCore.value
  if (options.source === 'custom' || repositoryIds.length === 0) {
    builtInRuleSetOptions.value = []
    ruleSetOptionsLoading.value = false
    return
  }

  ruleSetOptionsLoading.value = true
  try {
    const results = await Promise.allSettled(
      repositoryIds.map((repositoryId) =>
        searchRuleSourceRepositoryIndexAPI(repositoryId, options.query, {
          core,
          limit: 500,
        }),
      ),
    )

    if (ruleSetOptionsLoadToken.value !== token) return

    builtInRuleSetOptions.value = dedupeRuleSetOptions(
      results.flatMap((result) => {
        if (result.status !== 'fulfilled') return []
        return (result.value.data.entries || [])
          .map((entry) => ruleSourceEntryToRuleSetOption(entry, core))
          .filter((entry): entry is RuleSetOption => Boolean(entry))
      }),
    )
  } finally {
    if (ruleSetOptionsLoadToken.value === token) {
      ruleSetOptionsLoading.value = false
    }
  }
}
const allGroupsCollapsed = computed(() => {
  return groups.value.length > 0 && collapsedGroupIds.value.length === groups.value.length
})

const allRuleCardsCollapsed = computed(() => {
  return ruleCards.value.length > 0 && collapsedRuleCardIds.value.length === ruleCards.value.length
})

const ruleCards = ref<RoutingRuleCardResource[]>([])

const resourcePool = computed(() => {
  const nodeEntries = nodeResources.value.map((node) => ({
    ...node,
    entryId: `palette-${node.id}`,
  }))
  const groupEntries = groups.value.map((group) => ({
    entryId: `palette-${group.id}`,
    id: group.id,
    name: group.name,
    type: 'group' as const,
  }))

  return [...nodeEntries, ...groupEntries]
})

const canConfirmAddGroup = computed(() => {
  const name = newGroupName.value.trim()
  if (!name) return false
  if (hasDuplicateGroupName(name, editingGroupId.value)) return false
  if (newGroupRegexEnabled.value && !newGroupMatchPattern.value.trim()) return false

  if (supportsHealthCheck.value) {
    if (!newGroupTestUrl.value.trim()) return false
    if (Number(newGroupInterval.value) < 0 || Number.isNaN(Number(newGroupInterval.value)))
      return false
  }

  if (newGroupType.value === 'url-test') {
    if (Number(newGroupTolerance.value) < 0 || Number.isNaN(Number(newGroupTolerance.value)))
      return false
  }

  return true
})

const selectedRuleCardOutboundResource = computed(() => {
  return resourcePool.value.find(
    (resource) => `${resource.type}:${resource.id}` === ruleCardOutboundKey.value,
  )
})

const canConfirmRuleCardDialog = computed(() => {
  return Boolean(selectedRuleCardOutboundResource.value)
})

function createEntryId() {
  nextEntryId.value += 1
  return `entry-${nextEntryId.value}`
}

function createRuleId() {
  nextRuleCardId.value += 1
  return `rule-card-${nextRuleCardId.value}`
}

function extractSequentialId(value: string, prefix: string) {
  if (!value.startsWith(prefix)) return null

  const numericPart = Number.parseInt(value.slice(prefix.length), 10)
  return Number.isFinite(numericPart) ? numericPart : null
}

function syncRuleCardIdCounter(cards: RoutingRuleCardResource[]) {
  const maxExistingId = cards.reduce((maxValue, card) => {
    const parsedId = extractSequentialId(card.id, 'rule-card-')
    return parsedId === null ? maxValue : Math.max(maxValue, parsedId)
  }, INITIAL_RULE_CARD_ID)

  nextRuleCardId.value = maxExistingId
}

function hasDuplicateGroupName(name: string, currentGroupId: string | null = null) {
  const normalizedName = name.trim()
  return groups.value.some((group) => {
    return group.name.trim() === normalizedName && group.id !== currentGroupId
  })
}

function createNodeReference(nodeId: string): RoutingNodeReference {
  const node = nodeResources.value.find((item) => item.id === nodeId)
  if (!node) throw new Error(`Node ${nodeId} not found`)

  return {
    entryId: createEntryId(),
    id: node.id,
    name: node.name,
    type: 'node',
    address: node.address,
  }
}

function createGroupReference(groupId: string): RoutingGroupReference {
  const group = groups.value.find((item) => item.id === groupId)
  if (!group) throw new Error(`Group ${groupId} not found`)

  return {
    entryId: createEntryId(),
    id: group.id,
    name: group.name,
    type: 'group',
  }
}

function cloneResourceReference(resource: RoutingItemReference) {
  return resource.type === 'group'
    ? createGroupReference(resource.id)
    : createNodeReference(resource.id)
}

function resetEntityDialogForm() {
  editingGroupId.value = null
  newGroupName.value = ''
  newGroupType.value = 'select'
  newGroupEnabled.value = true
  newGroupRegexEnabled.value = false
  newGroupMatchPattern.value = ''
  newGroupTestUrl.value = 'https://www.gstatic.com/generate_204'
  newGroupInterval.value = '300'
  newGroupTolerance.value = '50'
  newGroupLazy.value = true
  newGroupStrategy.value = 'round-robin'
}

function closeEntityDialog() {
  addGroupDialogOpen.value = false
  resetEntityDialogForm()
}

function fillEntityDialog(target: RoutingGroupResource) {
  newGroupName.value = target.name
  newGroupType.value = target.groupType
  newGroupEnabled.value = target.enabled !== false
  newGroupRegexEnabled.value = target.regexEnabled ?? false
  newGroupMatchPattern.value = target.matchPattern ?? ''
  newGroupTestUrl.value = target.testUrl ?? 'https://www.gstatic.com/generate_204'
  newGroupInterval.value = String(target.interval ?? 300)
  newGroupTolerance.value = String(target.tolerance ?? 50)
  newGroupLazy.value = target.lazy ?? true
  newGroupStrategy.value = target.strategy ?? 'round-robin'
}

function openEditEntityDialog(entityId: string) {
  const targetGroup = groups.value.find((group) => group.id === entityId)
  if (!targetGroup) return

  editingGroupId.value = entityId
  fillEntityDialog(targetGroup)
  addGroupDialogOpen.value = true
}

function confirmEntityDialog() {
  const name = newGroupName.value.trim()
  const matchPattern = newGroupMatchPattern.value.trim()
  const testUrl = newGroupTestUrl.value.trim()
  const interval = Number(newGroupInterval.value)
  const tolerance = Number(newGroupTolerance.value)
  if (!name) return
  if (hasDuplicateGroupName(name, editingGroupId.value)) return
  if (newGroupRegexEnabled.value && !matchPattern) return
  if (supportsHealthCheck.value && !testUrl) return

  const payload = {
    enabled: newGroupEnabled.value,
    groupType: newGroupType.value,
    interval: supportsHealthCheck.value ? interval : undefined,
    lazy: supportsHealthCheck.value ? newGroupLazy.value : undefined,
    matchPattern: newGroupRegexEnabled.value ? matchPattern : undefined,
    name,
    regexEnabled: newGroupRegexEnabled.value,
    strategy: newGroupType.value === 'load-balance' ? newGroupStrategy.value : undefined,
    testUrl: supportsHealthCheck.value ? testUrl : undefined,
    tolerance: newGroupType.value === 'url-test' ? tolerance : undefined,
  }

  if (editingGroupId.value) {
    const targetGroup = groups.value.find((group) => group.id === editingGroupId.value)
    if (!targetGroup) return

    const previousId = targetGroup.id
    const previousName = targetGroup.name
    Object.assign(targetGroup, { ...payload, id: name })
    updateGroupReferences(previousId, previousName, name)
  } else {
    groups.value.push({
      ...payload,
      id: name,
      items: [],
      type: 'group',
    })
    collapsedGroupIds.value = [...collapsedGroupIds.value, name]
  }

  addGroupDialogOpen.value = false
  resetEntityDialogForm()
  queueSaveRoutingWorkspace()
}

function updateGroupReferences(previousId: string, previousName: string, nextName: string) {
  if (previousId === nextName && previousName === nextName) return

  collapsedGroupIds.value = collapsedGroupIds.value.map((id) => (id === previousId ? nextName : id))

  groups.value.forEach((group) => {
    group.items = group.items.map((item) => {
      if (item.type !== 'group') return item
      if (item.id !== previousId && item.name !== previousName) return item
      return {
        ...item,
        id: nextName,
        name: nextName,
      }
    })
  })

  ruleCards.value.forEach((card) => {
    if (
      card.outboundTarget?.type === 'group' &&
      (card.outboundTarget.id === previousId || card.outboundTarget.name === previousName)
    ) {
      card.outboundTarget = {
        ...card.outboundTarget,
        id: nextName,
        name: nextName,
      }
      card.name = nextName
    }
    card.rules = card.rules.map((rule) =>
      rule.target === previousName ? { ...rule, target: nextName } : rule,
    )
  })
}

function toggleActiveCard(cardId: string) {
  const targetIds = activeTab.value === 'groups' ? collapsedGroupIds : collapsedRuleCardIds
  targetIds.value = targetIds.value.includes(cardId)
    ? targetIds.value.filter((id) => id !== cardId)
    : [...targetIds.value, cardId]
}

function removeItemFromCollection(
  collection: RoutingGroupResource[],
  parentId: string,
  entryId: string,
) {
  const target = collection.find((item) => item.id === parentId)
  if (!target) return

  const index = target.items.findIndex((item) => item.entryId === entryId)
  if (index >= 0) {
    target.items.splice(index, 1)
  }
}

function removeItemFromActiveCard(parentId: string, entryId: string) {
  removeItemFromCollection(groups.value, parentId, entryId)
  queueSaveRoutingWorkspace()
}

function addResourcesToCollection(
  collection: RoutingGroupResource[],
  cardId: string,
  resources: RoutingItemReference[],
) {
  const target = collection.find((item) => item.id === cardId)
  if (!target || target.regexEnabled) return

  const newReferences = resources
    .filter((resource) => canDropItemIntoGroup(resource, cardId))
    .map((resource) => {
      return resource.type === 'group'
        ? createGroupReference(resource.id)
        : createNodeReference(resource.id)
    })

  target.items.push(...newReferences)
  queueSaveRoutingWorkspace()
}

function addResourcesToActiveCard(cardId: string, resources: RoutingItemReference[]) {
  addResourcesToCollection(groups.value, cardId, resources)
}

function updateGroupItems(groupId: string, items: RoutingItemReference[]) {
  const targetGroup = groups.value.find((group) => group.id === groupId)
  if (!targetGroup) return
  targetGroup.items = items
  queueSaveRoutingWorkspace()
}

function updateGroupEnabled(groupId: string, enabled: boolean) {
  const targetGroup = groups.value.find((group) => group.id === groupId)
  if (!targetGroup) return
  targetGroup.enabled = enabled
  queueSaveRoutingWorkspace()
}

function groupDependsOn(
  sourceGroupId: string,
  targetGroupId: string,
  visited = new Set<string>(),
): boolean {
  if (sourceGroupId === targetGroupId) return true
  if (visited.has(sourceGroupId)) return false

  visited.add(sourceGroupId)
  const sourceGroup = groups.value.find((group) => group.id === sourceGroupId)
  if (!sourceGroup) return false

  return sourceGroup.items.some((item) => {
    return item.type === 'group' && groupDependsOn(item.id, targetGroupId, visited)
  })
}

function findCardById(cardId: string) {
  return groups.value.find((group) => group.id === cardId)
}

function canDropItemIntoGroup(item: RoutingItemReference, targetGroupId: string) {
  const targetGroup = findCardById(targetGroupId)
  if (!targetGroup) return false
  if (targetGroup.regexEnabled) return false

  const alreadyExists = targetGroup.items.some((existingItem) => {
    return existingItem.id === item.id && existingItem.type === item.type
  })

  if (alreadyExists) return false
  if (item.type !== 'group') return true
  if (item.id === targetGroupId) return false

  return !groupDependsOn(item.id, targetGroupId)
}

function toggleAllGroups() {
  collapsedGroupIds.value = allGroupsCollapsed.value ? [] : groups.value.map((group) => group.id)
}

function openAddGroupDialog() {
  resetEntityDialogForm()
  addGroupDialogOpen.value = true
}

function openEditGroupDialog(groupId: string) {
  openEditEntityDialog(groupId)
}

function closeGroupDialog() {
  closeEntityDialog()
}

function confirmAddGroup() {
  confirmEntityDialog()
}

function createRuleLeafId() {
  nextRuleLeafId.value += 1
  return `rule-leaf-${nextRuleLeafId.value}`
}

function formatRuleCardOutboundOption(
  resource: Pick<RoutingItemReference, 'id' | 'name' | 'type'> & { address?: string },
) {
  if (resource.type === 'group') {
    return `${resource.name} (分组)`
  }

  return resource.address ? `${resource.name} (${resource.address})` : resource.name
}

function syncRuleCardOutboundKeyFromSearch() {
  const normalizedValue = ruleCardOutboundSearch.value.trim()
  const matchedResource = resourcePool.value.find(
    (resource) => formatRuleCardOutboundOption(resource) === normalizedValue,
  )

  ruleCardOutboundKey.value = matchedResource ? `${matchedResource.type}:${matchedResource.id}` : ''
}

function resetRuleCardDialog() {
  editingRuleCardId.value = null
  ruleCardEnabled.value = true
  ruleCardOutboundKey.value = ''
  ruleCardOutboundSearch.value = ''
}

function openAddRuleCardDialog() {
  resetRuleCardDialog()
  ruleCardDialogOpen.value = true
}

function openActiveAddDialog() {
  if (activeTab.value === 'groups') {
    openAddGroupDialog()
    return
  }

  openAddRuleCardDialog()
}

function closePresetDropdown() {
  presetDropdownRef.value?.removeAttribute('open')
}

function applyRoutingPreset(presetId: string) {
  selectedPresetId.value = selectedPresetId.value === presetId ? null : presetId
  closePresetDropdown()
}

function createCustomPresetId() {
  return `custom-preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getPresetResourceKey(groupSetIds: string[], ruleSetIds: string[]) {
  return `groups:${[...groupSetIds].sort().join('|')};rules:${[...ruleSetIds].sort().join('|')}`
}

function getPresetBaseIds() {
  if (selectedPreset.value) {
    return {
      groupSetIds: [...selectedPreset.value.groupSetIds],
      ruleSetIds: [...selectedPreset.value.ruleSetIds],
    }
  }

  const configuredRuleSetIds = fastProxySelectedRoutingRuleSetIds.value

  return {
    groupSetIds: (repository.value?.groupSets || []).map((item) => item.id),
    ruleSetIds: configuredRuleSetIds.length
      ? [...configuredRuleSetIds]
      : (repository.value?.routingRuleSets || []).map((item) => item.id),
  }
}

type RemoteConfigParsedRuleProvider = {
  name: string
  url: string
}

type RemoteConfigParsedRule = Pick<
  RoutingRuleLeaf,
  'condition' | 'target' | 'unsupportedCores' | 'unsupportedReason' | 'value'
> & {
  sourceRule?: Omit<FastProxyNormalizedRule, 'id'>
}

type RemoteConfigParsedResult = {
  groups: RoutingGroupResource[]
  providers: RemoteConfigParsedRuleProvider[]
  ruleCards: RoutingRuleCardResource[]
}

function stripRemoteConfigComment(line: string) {
  const commentIndex = line.indexOf(';')
  return (commentIndex >= 0 ? line.slice(0, commentIndex) : line).trim()
}

function createBuiltInOutboundReference(name: string): RoutingNodeReference {
  return {
    address: 'built-in outbound',
    entryId: createEntryId(),
    id: name,
    name,
    type: 'node',
  }
}

function sanitizeRemoteProviderName(value: string) {
  const lastSegment =
    value
      .trim()
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean)
      .pop() || ''
  return lastSegment.replace(/\.[^.]+$/u, '')
}

function providerNameFromRemoteRuleSetUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const path = decodeURIComponent(parsedUrl.pathname)
    return sanitizeRemoteProviderName(path) || `remote-${Math.random().toString(36).slice(2, 8)}`
  } catch {
    return sanitizeRemoteProviderName(url) || `remote-${Math.random().toString(36).slice(2, 8)}`
  }
}

function splitTrailingAcronymRuleSetName(name: string) {
  const trimmed = name.trim()
  const match = /^(.*?[a-z])([A-Z]{2,})$/.exec(trimmed)
  return match ? `${match[1]}-${match[2]}` : trimmed
}

function splitCamelRuleSetName(name: string) {
  return name
    .trim()
    .replace(/([a-z])([A-Z])|([A-Z])([A-Z][a-z])/g, (_match, lower, upper, acronym, word) => {
      if (lower && upper) return `${lower}-${upper}`
      return `${acronym}-${word}`
    })
}

function normalizeSingBoxGeositeCandidate(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9!]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getSingBoxGeositeNameCandidates(name: string) {
  const trimmed = name.trim()
  return [
    trimmed.toLowerCase(),
    normalizeSingBoxGeositeCandidate(splitTrailingAcronymRuleSetName(trimmed)),
    normalizeSingBoxGeositeCandidate(trimmed),
    normalizeSingBoxGeositeCandidate(splitCamelRuleSetName(trimmed)),
  ].filter((item, index, items) => item && items.indexOf(item) === index)
}

async function getSingBoxBuiltInRuleSetTagFromRemoteSource(source: string) {
  const name = providerNameFromRemoteRuleSetUrl(source)
  if (!name) return ''

  const builtInValues = new Set(builtInRuleSetOptions.value.map((option) => option.value))
  for (const candidate of getSingBoxGeositeNameCandidates(name)) {
    if (
      builtInValues.has(`geo/geosite/${candidate}`) ||
      builtInValues.has(`geosite-${candidate}`)
    ) {
      return `geo/geosite/${candidate}`
    }
    try {
      const { data } = await searchRuleSourceRepositoryIndexAPI(
        'metacubex-meta-rules-dat',
        candidate,
        {
          core: 'sing-box',
          limit: 20,
          pathPrefix: 'geo/geosite',
        },
      )
      const matched = (data.entries || []).some(
        (entry) => entry.logicalPath === `geo/geosite/${candidate}` && entry.files?.['sing-box'],
      )
      if (matched) {
        return `geo/geosite/${candidate}`
      }
    } catch {
      continue
    }
  }
  return ''
}

function ruleWithoutId(rule: FastProxyNormalizedRule): Omit<FastProxyNormalizedRule, 'id'> {
  const clone = { ...rule } as Partial<FastProxyNormalizedRule>
  delete clone.id
  return clone as Omit<FastProxyNormalizedRule, 'id'>
}

function createUnsupportedRemoteRuleSetRule(
  provider: RemoteConfigParsedRuleProvider,
  target: string,
): RemoteConfigParsedRule {
  return {
    condition: 'RULE-SET',
    target,
    unsupportedCores: ['sing-box'] as FastProxyCoreId[],
    unsupportedReason: '未匹配到内置 sing-box 规则集，且远程规则集展开失败',
    value: provider.name,
  }
}

function createExpandedRemoteRuleSetRules(
  rules: FastProxyNormalizedRule[],
  target: string,
): RemoteConfigParsedRule[] {
  return rules.map((rule) => ({
    condition: 'RAW',
    sourceRule: ruleWithoutId(rule),
    target,
    value: rule.raw?.length ? rule.raw : JSON.stringify(ruleWithoutId(rule)),
  }))
}

function parseRemoteProxyGroupLine(line: string) {
  const equalsIndex = line.indexOf('=')
  const content = equalsIndex >= 0 ? line.slice(equalsIndex + 1) : ''
  const parts = content
    .split('`')
    .map((part) => part.trim())
    .filter(Boolean)
  const [name, rawType, ...tokens] = parts
  if (!name) return null

  const groupTypeMap: Record<string, RoutingGroupMode> = {
    fallback: 'fallback',
    load_balance: 'load-balance',
    'load-balance': 'load-balance',
    relay: 'relay',
    select: 'select',
    url_test: 'url-test',
    'url-test': 'url-test',
  }
  const groupType = groupTypeMap[(rawType || 'select').toLowerCase()] || 'select'
  const itemNames: string[] = []
  let matchPattern = ''
  let testUrl = ''
  let interval: number | undefined
  let tolerance: number | undefined

  for (const token of tokens) {
    if (token.startsWith('[]')) {
      itemNames.push(token.slice(2).trim())
      continue
    }
    if (/^https?:\/\//i.test(token)) {
      testUrl = token
      continue
    }
    if (/^\d+(,\d*){0,2}$/.test(token)) {
      const [intervalValue, , toleranceValue] = token.split(',')
      interval = Number(intervalValue) || undefined
      tolerance = Number(toleranceValue) || undefined
      continue
    }
    if (!matchPattern) {
      matchPattern = token
    }
  }

  return {
    group: {
      enabled: true,
      groupType,
      id: name,
      interval,
      items: [],
      lazy: true,
      matchPattern: matchPattern || undefined,
      name,
      regexEnabled: Boolean(matchPattern),
      strategy: groupType === 'load-balance' ? ('round-robin' as const) : undefined,
      testUrl: testUrl || undefined,
      tolerance,
      type: 'group' as const,
    },
    itemNames,
  }
}

async function parseRemoteRuleSetLine(line: string) {
  const equalsIndex = line.indexOf('=')
  const content = equalsIndex >= 0 ? line.slice(equalsIndex + 1) : ''
  const commaIndex = content.indexOf(',')
  if (commaIndex < 0) return null

  const target = content.slice(0, commaIndex).trim()
  const source = content.slice(commaIndex + 1).trim()
  if (!target || !source) return null

  if (/^https?:\/\//i.test(source)) {
    const provider = {
      name: providerNameFromRemoteRuleSetUrl(source),
      url: source,
    }
    const singBoxRuleSetTag = await getSingBoxBuiltInRuleSetTagFromRemoteSource(source)
    const providerPayload = buildRemoteMihomoProviderPayload(provider)
    if (singBoxRuleSetTag) {
      const sourceRule: Omit<FastProxyNormalizedRule, 'id'> = {
        outbound: target,
        raw: [`RULE-SET,${provider.name},${target}`],
        rule_set: [singBoxRuleSetTag],
        mihomoRuleProvider: providerPayload,
      }

      return {
        provider,
        rules: [
          {
            condition: 'RULE-SET',
            sourceRule,
            target,
            value: provider.name,
          },
        ],
        target,
      }
    }

    try {
      const { data } = await expandRemoteRuleSetAPI(source, target)
      if (data.rules?.length) {
        return {
          provider,
          rules: createExpandedRemoteRuleSetRules(data.rules, target),
          target,
        }
      }
    } catch (error) {
      console.warn('remote rule set expansion failed', error)
    }

    return {
      provider,
      rules: [createUnsupportedRemoteRuleSetRule(provider, target)],
      target,
    }
  }

  if (source.startsWith('[]')) {
    const [condition = '', ...values] = source
      .slice(2)
      .split(',')
      .map((item) => item.trim())
    const normalizedCondition = condition.toUpperCase() === 'FINAL' ? 'MATCH' : condition
    return {
      rules: [
        {
          condition: normalizedCondition,
          target,
          value: normalizedCondition === 'MATCH' ? '*' : values.join(','),
        },
      ],
      target,
    }
  }

  return null
}

function createRemoteRuleCard(
  target: string,
  rules: RemoteConfigParsedRule[],
  groupLookup: Map<string, RoutingGroupResource>,
): RoutingRuleCardResource {
  const groupTarget = groupLookup.get(target)
  const outboundTarget: RoutingRuleTargetReference = groupTarget
    ? { id: groupTarget.id, name: groupTarget.name, type: 'group' }
    : { id: target, name: target, type: 'node' }

  return {
    enabled: true,
    id: createRuleId(),
    name: target,
    outboundTarget,
    rules: rules.map((rule) => {
      const ruleId = createRuleLeafId()
      return {
        condition: rule.condition,
        id: ruleId,
        sourceRule: rule.sourceRule ? { ...rule.sourceRule, id: ruleId } : undefined,
        target: rule.target,
        unsupportedCores: rule.unsupportedCores,
        unsupportedReason: rule.unsupportedReason,
        value: rule.value,
      }
    }),
  }
}

async function parseRemoteRoutingConfig(content: string): Promise<RemoteConfigParsedResult> {
  const parsedGroups = []
  const rulesByTarget = new Map<string, RemoteConfigParsedRule[]>()
  const providersByUrl = new Map<string, RemoteConfigParsedRuleProvider>()

  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripRemoteConfigComment(rawLine)
    if (!line) continue

    if (line.startsWith('custom_proxy_group=')) {
      const parsed = parseRemoteProxyGroupLine(line)
      if (parsed) parsedGroups.push(parsed)
      continue
    }

    if (line.startsWith('ruleset=')) {
      const parsed = await parseRemoteRuleSetLine(line)
      if (!parsed) continue
      if (parsed.provider) providersByUrl.set(parsed.provider.url, parsed.provider)
      const rules = rulesByTarget.get(parsed.target) || []
      rules.push(...parsed.rules)
      rulesByTarget.set(parsed.target, rules)
    }
  }

  const groupLookup = new Map(parsedGroups.map((item) => [item.group.name, item.group]))
  const nodeLookup = new Map(nodeResources.value.map((node) => [node.name, node]))
  const groups = parsedGroups.map(({ group, itemNames }) => ({
    ...group,
    items: itemNames
      .map((itemName) => {
        const groupRef = groupLookup.get(itemName)
        if (groupRef) {
          return {
            entryId: createEntryId(),
            id: groupRef.id,
            name: groupRef.name,
            type: 'group' as const,
          }
        }
        const nodeRef = nodeLookup.get(itemName)
        if (nodeRef) {
          return {
            address: nodeRef.address,
            entryId: createEntryId(),
            id: nodeRef.id,
            name: nodeRef.name,
            type: 'node' as const,
          }
        }
        return createBuiltInOutboundReference(itemName)
      })
      .filter((item) => canDropItemIntoParsedGroup(item, group, groupLookup)),
  }))

  return {
    groups,
    providers: [...providersByUrl.values()],
    ruleCards: [...rulesByTarget.entries()].map(([target, rules]) =>
      createRemoteRuleCard(target, rules, groupLookup),
    ),
  }
}

function parsedGroupDependsOn(
  sourceGroupId: string,
  targetGroupId: string,
  groupLookup: Map<string, RoutingGroupResource>,
  visited = new Set<string>(),
): boolean {
  if (sourceGroupId === targetGroupId) return true
  if (visited.has(sourceGroupId)) return false

  visited.add(sourceGroupId)
  const sourceGroup = [...groupLookup.values()].find((group) => group.id === sourceGroupId)
  if (!sourceGroup) return false

  return sourceGroup.items.some((item) => {
    return (
      item.type === 'group' && parsedGroupDependsOn(item.id, targetGroupId, groupLookup, visited)
    )
  })
}

function canDropItemIntoParsedGroup(
  item: RoutingItemReference,
  targetGroup: RoutingGroupResource,
  groupLookup: Map<string, RoutingGroupResource>,
) {
  if (targetGroup.regexEnabled) return false
  if (item.type !== 'group') return true
  if (item.id === targetGroup.id) return false
  return !parsedGroupDependsOn(item.id, targetGroup.id, groupLookup)
}

function matchNodesByPattern(pattern: string) {
  if (!pattern) return []
  return nodeResources.value.filter((node) => {
    try {
      const regex = new RegExp(pattern, 'i')
      return regex.test(node.name) || regex.test(node.address)
    } catch {
      const keyword = pattern.toLowerCase()
      return (
        node.name.toLowerCase().includes(keyword) || node.address.toLowerCase().includes(keyword)
      )
    }
  })
}

function buildGroupOutbounds(group: RoutingGroupResource) {
  const outbounds = group.regexEnabled
    ? matchNodesByPattern(group.matchPattern?.trim() || '').map((node) => node.name)
    : group.items.map((item) => item.name)

  return outbounds.length > 0 ? outbounds : ['DIRECT']
}

async function fetchRemoteRoutingConfig(url: string) {
  try {
    const { data } = await fetchRemoteTextAPI(url)
    return data.content
  } catch (error) {
    throw new Error(extractErrorMessage(error, '远程配置请求失败'))
  }
}

function inferRemoteRuleProviderBehavior(url: string) {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('ip') || lowerUrl.includes('cidr')) return 'ipcidr'
  return 'classical'
}

function buildRemoteMihomoProviderPayload(provider: RemoteConfigParsedRuleProvider) {
  return {
    behavior: inferRemoteRuleProviderBehavior(provider.url),
    format: 'text',
    interval: '86400',
    name: provider.name,
    provider: provider.name,
    sourceMode: 'remote' as const,
    url: provider.url,
  }
}

async function ensureRemoteMihomoRuleProviders(providers: RemoteConfigParsedRuleProvider[]) {
  const existingProviders = repository.value?.mihomoRuleProviders || []
  const existingByName = new Map(existingProviders.map((provider) => [provider.provider, provider]))

  await Promise.all(
    providers.map(async (provider) => {
      const payload = buildRemoteMihomoProviderPayload(provider)
      const existingBySameName = existingByName.get(provider.name)

      if (existingBySameName) {
        const existing = existingBySameName as FastProxyMihomoRuleProviderResource
        await updateMihomoRuleProviderAPI(existing.id, {
          ...existing,
          ...payload,
        })
        return
      }

      await createMihomoRuleProviderAPI(payload)
    }),
  )
}

async function createRemotePresetResources(name: string, remoteConfigUrl: string) {
  const content = await fetchRemoteRoutingConfig(remoteConfigUrl)
  const parsed = await parseRemoteRoutingConfig(content)
  if (parsed.groups.length === 0 && parsed.ruleCards.length === 0) {
    throw new Error('远程配置中没有可解析的 custom_proxy_group 或 ruleset')
  }

  await ensureRemoteMihomoRuleProviders(parsed.providers)
  const groupPayload: Partial<FastProxyGroupSetResource> = {
    groups: parsed.groups.map((group) => {
      return {
        id: group.id,
        outbounds: buildGroupOutbounds(group),
        raw: buildGroupRaw(group),
        tag: group.name,
        type: group.groupType,
      }
    }),
    name,
  }
  const rulePayload: Partial<FastProxyRuleSetResource> = {
    name,
    ruleCards: parsed.ruleCards.map((card) => ({
      enabled: card.enabled,
      id: card.id,
      name: card.name,
      outboundTarget: card.outboundTarget,
      rules: card.rules,
    })),
    rules: parsed.ruleCards.flatMap((card) =>
      card.rules.map((rule) => buildNormalizedRuleFromLeaf(rule)),
    ),
  }

  const [groupResult, ruleResult] = await Promise.all([
    createGroupSetAPI(groupPayload),
    createRoutingRuleSetAPI(rulePayload),
  ])

  return {
    groupSetIds: [groupResult.data.id],
    ruleSetIds: [ruleResult.data.id],
  }
}

function resetPresetDialog() {
  newPresetName.value = ''
  newPresetRemoteConfigUrl.value = ''
}

function openAddPresetDialog() {
  resetPresetDialog()
  presetDialogOpen.value = true
}

function closePresetDialog() {
  presetDialogOpen.value = false
  resetPresetDialog()
}

async function confirmAddPreset() {
  const name = newPresetName.value.trim()
  if (!name || presetSaving.value) return

  const remoteConfigUrl = selectedRemoteConfigUrl.value
  const remoteConfig = selectedRemoteConfig.value
  presetSaving.value = true
  try {
    const baseIds = remoteConfigUrl
      ? await createRemotePresetResources(name, remoteConfigUrl)
      : getPresetBaseIds()
    const preset: CustomRoutingPreset = {
      custom: true,
      groupSetIds: baseIds.groupSetIds,
      id: createCustomPresetId(),
      name,
      remoteConfigLabel: remoteConfig?.label,
      remoteConfigUrl: remoteConfigUrl || undefined,
      ruleSetIds: baseIds.ruleSetIds,
    }

    customRoutingPresets.value = [...customRoutingPresets.value, preset]
    await loadFastProxyWorkspace().catch(() => null)
    selectedPresetId.value = preset.id
    presetDialogOpen.value = false
    resetPresetDialog()
    closePresetDropdown()
    showNotification({
      content: remoteConfigUrl ? '远程预设已生成' : '预设已保存',
      type: 'alert-success',
    })
  } catch (error) {
    showNotification({
      content: extractErrorMessage(error, '添加预设失败'),
      type: 'alert-error',
      timeout: 5000,
    })
  } finally {
    presetSaving.value = false
  }
}

function removeCustomPreset(presetId: string) {
  customRoutingPresets.value = customRoutingPresets.value.filter((preset) => preset.id !== presetId)
  if (selectedPresetId.value === presetId) {
    selectedPresetId.value = profilePresetId.value
  }
}

async function deleteSelectedPreset() {
  const preset = selectedPreset.value
  if (!preset || deletingPreset.value) return

  const confirmed = window.confirm(`确认删除配置“${preset.name}”吗？`)
  if (!confirmed) return

  deletingPreset.value = true
  try {
    if (preset.custom) {
      if (preset.remoteConfigUrl) {
        await Promise.all([
          ...preset.ruleSetIds.map((id) => deleteRoutingRuleSetAPI(id)),
          ...preset.groupSetIds.map((id) => deleteGroupSetAPI(id)),
        ])
        await loadFastProxyWorkspace()
      }
      removeCustomPreset(preset.id)
    } else {
      await Promise.all([
        ...preset.ruleSetIds.map((id) => deleteRoutingRuleSetAPI(id)),
        ...preset.groupSetIds.map((id) => deleteGroupSetAPI(id)),
      ])
      await loadFastProxyWorkspace()
    }

    selectedPresetId.value = null
    showNotification({ content: '配置已删除', type: 'alert-success' })
  } catch (error) {
    showNotification({
      content: extractErrorMessage(error, '删除配置失败'),
      type: 'alert-error',
      timeout: 5000,
    })
  } finally {
    deletingPreset.value = false
  }
}

function openEditRuleCardDialog(cardId: string) {
  const targetCard = ruleCards.value.find((card) => card.id === cardId)
  if (!targetCard) return

  editingRuleCardId.value = cardId
  ruleCardEnabled.value = targetCard.enabled
  ruleCardOutboundKey.value = targetCard.outboundTarget
    ? `${targetCard.outboundTarget.type}:${targetCard.outboundTarget.id}`
    : ''
  ruleCardOutboundSearch.value = targetCard.outboundTarget
    ? formatRuleCardOutboundOption(targetCard.outboundTarget)
    : ''
  ruleCardDialogOpen.value = true
}

function closeRuleCardDialog() {
  ruleCardDialogOpen.value = false
  resetRuleCardDialog()
}

function confirmRuleCardDialog() {
  const selectedOutbound = selectedRuleCardOutboundResource.value
  if (!selectedOutbound) return

  if (editingRuleCardId.value) {
    const targetCard = ruleCards.value.find((card) => card.id === editingRuleCardId.value)
    if (!targetCard) return

    targetCard.enabled = ruleCardEnabled.value
    updateRuleCardOutboundTarget(editingRuleCardId.value, selectedOutbound, false)
  } else {
    const id = createRuleId()
    ruleCards.value.push({
      enabled: ruleCardEnabled.value,
      id,
      name: selectedOutbound.name,
      outboundTarget: {
        id: selectedOutbound.id,
        name: selectedOutbound.name,
        type: selectedOutbound.type,
      },
      rules: [],
    })
    collapsedRuleCardIds.value = [...collapsedRuleCardIds.value, id]
  }

  ruleCardDialogOpen.value = false
  resetRuleCardDialog()
  queueSaveRoutingWorkspace()
}

function toggleRuleCard(cardId: string) {
  collapsedRuleCardIds.value = collapsedRuleCardIds.value.includes(cardId)
    ? collapsedRuleCardIds.value.filter((id) => id !== cardId)
    : [...collapsedRuleCardIds.value, cardId]
}

function toggleAllRuleCards() {
  collapsedRuleCardIds.value = allRuleCardsCollapsed.value
    ? []
    : ruleCards.value.map((card) => card.id)
}

function deleteGroup(groupId: string) {
  const deletedGroup = groups.value.find((group) => group.id === groupId)
  const deletedGroupName = deletedGroup?.name

  groups.value = groups.value.filter((group) => group.id !== groupId)
  groups.value.forEach((group) => {
    group.items = group.items.filter((item) => item.type !== 'group' || item.id !== groupId)
  })
  collapsedGroupIds.value = collapsedGroupIds.value.filter((id) => id !== groupId)

  ruleCards.value = ruleCards.value.flatMap((card) => {
    const targetsDeletedGroup =
      card.outboundTarget?.type === 'group' &&
      (card.outboundTarget.id === groupId || card.outboundTarget.name === deletedGroupName)
    if (targetsDeletedGroup) return []

    return [
      {
        ...card,
        rules: card.rules.filter((rule) => rule.target !== deletedGroupName),
      },
    ]
  })
  collapsedRuleCardIds.value = collapsedRuleCardIds.value.filter((id) =>
    ruleCards.value.some((card) => card.id === id),
  )

  queueSaveRoutingWorkspace()
}

function deleteRuleCard(cardId: string) {
  ruleCards.value = ruleCards.value.filter((card) => card.id !== cardId)
  collapsedRuleCardIds.value = collapsedRuleCardIds.value.filter((id) => id !== cardId)
  queueSaveRoutingWorkspace()
}

function updateRuleCardEnabled(cardId: string, enabled: boolean) {
  const targetCard = ruleCards.value.find((card) => card.id === cardId)
  if (!targetCard) return
  targetCard.enabled = enabled
  queueSaveRoutingWorkspace()
}

function updateRuleCardOutboundTarget(
  cardId: string,
  target: RoutingItemReference,
  shouldQueueSave = true,
) {
  const targetCard = ruleCards.value.find((card) => card.id === cardId)
  if (!targetCard) return

  const outboundTarget: RoutingRuleTargetReference = {
    id: target.id,
    name: target.name,
    type: target.type,
  }

  targetCard.outboundTarget = outboundTarget
  targetCard.name = outboundTarget.name
  targetCard.rules = targetCard.rules.map((rule) => ({
    ...rule,
    target: target.name,
  }))
  if (shouldQueueSave) {
    queueSaveRoutingWorkspace()
  }
}

function addRuleToCard(cardId: string, rule: RoutingRuleDraft) {
  const targetCard = ruleCards.value.find((card) => card.id === cardId)
  if (!targetCard) return

  targetCard.rules.push({
    condition: rule.condition,
    id: createRuleLeafId(),
    target: rule.target,
    value: rule.value,
  })
  queueSaveRoutingWorkspace()
}

function removeRuleFromCard(cardId: string, ruleId: string) {
  const targetCard = ruleCards.value.find((card) => card.id === cardId)
  if (!targetCard) return

  targetCard.rules = targetCard.rules.filter((rule) => rule.id !== ruleId)
  queueSaveRoutingWorkspace()
}

const RULE_RESERVED_KEYS = new Set([
  'id',
  'type',
  'mode',
  'rules',
  'action',
  'outbound',
  'raw',
  'mihomoRuleProvider',
  'unsupportedCores',
  'unsupportedReason',
])
const SAVE_DEBOUNCE_MS = 500
const BUILT_IN_OUTBOUND_TAGS = new Set(['DIRECT', 'GLOBAL', 'REJECT', 'REJECT-DROP', 'BLOCK'])

function mapSingBoxGroupType(type: string): RoutingGroupMode {
  switch (type) {
    case 'selector':
      return 'select'
    case 'urltest':
      return 'url-test'
    default:
      return (type as RoutingGroupMode) || 'select'
  }
}

function normalizeLoadBalanceStrategy(strategy: unknown): RoutingGroupResource['strategy'] {
  if (
    strategy === 'round-robin' ||
    strategy === 'consistent-hashing' ||
    strategy === 'sticky-sessions'
  ) {
    return strategy
  }
  return undefined
}

function getActiveNodes(): FastProxyNormalizedNode[] {
  return (repository.value?.nodeSets || []).flatMap((item) => item.nodes || [])
}

function normalizeBuiltInOutboundTag(outbound: string) {
  const normalized = outbound.trim().toUpperCase()
  if (normalized === 'BLOCK') return 'REJECT'
  return normalized
}

function isBuiltInOutboundTag(outbound: string) {
  return BUILT_IN_OUTBOUND_TAGS.has(outbound.trim().toUpperCase())
}

function getActiveGroups(): FastProxyNormalizedGroup[] {
  if (selectedPreset.value) {
    const selectedIds = new Set(selectedPreset.value.groupSetIds)
    return (repository.value?.groupSets || [])
      .filter((item) => selectedIds.has(item.id))
      .flatMap((item) => item.groups || [])
  }
  return (repository.value?.groupSets || []).flatMap((item) => item.groups || [])
}

function getActiveRules(): FastProxyNormalizedRule[] {
  if (selectedPreset.value) {
    const selectedIds = new Set(selectedPreset.value.ruleSetIds)
    return (repository.value?.routingRuleSets || [])
      .filter((item) => selectedIds.has(item.id))
      .flatMap((item) => item.rules || [])
  }
  const ruleSetIds = new Set(fastProxySelectedRoutingRuleSetIds.value)
  const ruleSets = repository.value?.routingRuleSets || []
  const selectedRuleSets = ruleSetIds.size
    ? ruleSets.filter((item) => ruleSetIds.has(item.id))
    : ruleSets
  return selectedRuleSets.flatMap((item) => item.rules || [])
}

function getActiveStoredRuleCards(): FastProxyRoutingRuleCard[] {
  if (selectedPreset.value) {
    const selectedIds = new Set(selectedPreset.value.ruleSetIds)
    return (repository.value?.routingRuleSets || [])
      .filter((item) => selectedIds.has(item.id))
      .flatMap((item) => item.ruleCards || [])
  }
  const ruleSetIds = new Set(fastProxySelectedRoutingRuleSetIds.value)
  const ruleSets = repository.value?.routingRuleSets || []
  const selectedRuleSets = ruleSetIds.size
    ? ruleSets.filter((item) => ruleSetIds.has(item.id))
    : ruleSets
  return selectedRuleSets.flatMap((item) => item.ruleCards || [])
}

function buildNodeResources(
  nodes: FastProxyNormalizedNode[],
  extraOutbounds: string[],
  groupsSource: FastProxyNormalizedGroup[],
): RoutingNodeResource[] {
  const groupTags = new Set(groupsSource.map((group) => group.tag))
  const resources = nodes.map((node) => ({
    id: node.tag,
    type: 'node' as const,
    name: node.tag,
    address: node.server || node.type,
  }))
  const knownNodeIds = new Set(resources.map((item) => item.id))
  for (const outbound of extraOutbounds) {
    const builtInOutbound = normalizeBuiltInOutboundTag(outbound)
    if (
      !outbound ||
      !isBuiltInOutboundTag(outbound) ||
      groupTags.has(outbound) ||
      knownNodeIds.has(builtInOutbound)
    ) {
      continue
    }
    resources.push({
      id: builtInOutbound,
      type: 'node',
      name: builtInOutbound,
      address: 'built-in outbound',
    })
    knownNodeIds.add(builtInOutbound)
  }
  return resources
}

function createReferenceFromTag(
  outbound: string,
  groupLookup: Map<string, { id: string; name: string }>,
  nodeLookup: Map<string, RoutingNodeResource>,
): RoutingItemReference | null {
  const group = groupLookup.get(outbound)
  if (group) {
    return {
      entryId: createEntryId(),
      id: group.id,
      name: group.name,
      type: 'group',
    }
  }
  const node = nodeLookup.get(outbound)
  if (node) {
    return {
      entryId: createEntryId(),
      id: node.id,
      name: node.name,
      type: 'node',
      address: node.address,
    }
  }
  const builtInOutbound = normalizeBuiltInOutboundTag(outbound)
  if (isBuiltInOutboundTag(outbound)) {
    const builtInNode = nodeLookup.get(builtInOutbound)
    if (builtInNode) {
      return {
        entryId: createEntryId(),
        id: builtInNode.id,
        name: builtInNode.name,
        type: 'node',
        address: builtInNode.address,
      }
    }
  }
  return null
}

function reserveUniqueId(
  preferredId: string | undefined,
  fallbackId: string,
  usedIds: Set<string>,
) {
  const baseId = preferredId?.trim() || fallbackId
  let id = baseId
  let suffix = 2
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }
  usedIds.add(id)
  return id
}

function buildGroupsFromSource(
  groupsSource: FastProxyNormalizedGroup[],
  nodeSource: RoutingNodeResource[],
): { changed: boolean; groups: RoutingGroupResource[] } {
  let changed = false
  const usedGroupIds = new Set<string>()
  const normalizedGroups = groupsSource.map((group, index) => ({
    group,
    id: reserveUniqueId(group.id, `group-${index + 1}`, usedGroupIds),
  }))
  const groupLookup = new Map(
    normalizedGroups.map(({ group, id }) => [group.tag, { id, name: group.tag }]),
  )
  const nodeLookup = new Map(nodeSource.map((node) => [node.id, node]))

  const groups = normalizedGroups.map(({ group, id }) => {
    const sourceOutbounds = group.outbounds || []
    const items = sourceOutbounds
      .map((outbound) => createReferenceFromTag(outbound, groupLookup, nodeLookup))
      .filter((item): item is RoutingItemReference => item !== null)

    if (
      items.length !== sourceOutbounds.length ||
      items.some((item, index) => item.name !== sourceOutbounds[index])
    ) {
      changed = true
    }

    return {
      enabled: true,
      groupType: mapSingBoxGroupType(group.type),
      id,
      interval: typeof group.raw?.interval === 'number' ? group.raw.interval : undefined,
      lazy: typeof group.raw?.lazy === 'boolean' ? group.raw.lazy : undefined,
      matchPattern:
        typeof group.raw?.matchPattern === 'string' ? group.raw.matchPattern : undefined,
      name: group.tag,
      raw: group.raw,
      regexEnabled: group.raw?.regexEnabled === true,
      strategy: normalizeLoadBalanceStrategy(group.raw?.strategy),
      testUrl: typeof group.raw?.url === 'string' ? group.raw.url : undefined,
      tolerance: typeof group.raw?.tolerance === 'number' ? group.raw.tolerance : undefined,
      type: 'group' as const,
      items,
    }
  })

  return { changed, groups }
}

function getRuleFieldEntries(rule: FastProxyNormalizedRule): Array<[string, unknown]> {
  return Object.entries(rule).filter(
    ([key, value]) => !RULE_RESERVED_KEYS.has(key) && value != null,
  )
}

function formatRuleCondition(field: string): string {
  return field.replaceAll('_', '-').toUpperCase()
}

function formatRuleLeafValue(value: unknown): string | string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function buildRuleLeafs(rule: FastProxyNormalizedRule, outboundName: string) {
  if (rule.raw?.length) {
    return [
      {
        condition: 'RAW',
        id: createRuleLeafId(),
        target: outboundName,
        unsupportedCores: rule.unsupportedCores,
        unsupportedReason: rule.unsupportedReason,
        value: rule.raw,
      },
    ]
  }

  if (rule.type === 'logical') {
    return [
      {
        condition: `LOGICAL-${(rule.mode || 'or').toUpperCase()}`,
        id: createRuleLeafId(),
        target: outboundName,
        unsupportedCores: rule.unsupportedCores,
        unsupportedReason: rule.unsupportedReason,
        value:
          rule.rules?.map((child) => child.raw?.[0] || formatRuleCondition(child.type || 'rule')) ||
          [],
      },
    ]
  }

  const entries = getRuleFieldEntries(rule)
  if (entries.length === 0) {
    return [
      {
        condition: 'MATCH',
        id: createRuleLeafId(),
        target: outboundName,
        unsupportedCores: rule.unsupportedCores,
        unsupportedReason: rule.unsupportedReason,
        value: '*',
      },
    ]
  }

  return entries.map(([field, value]) => ({
    condition: formatRuleCondition(field),
    id: createRuleLeafId(),
    target: outboundName,
    unsupportedCores: rule.unsupportedCores,
    unsupportedReason: rule.unsupportedReason,
    value: formatRuleLeafValue(value),
  }))
}

function resolveOutboundTarget(
  outboundName: string,
  groupsSource: RoutingGroupResource[],
  nodesSource: RoutingNodeResource[],
): RoutingRuleTargetReference | null {
  const groupTarget = groupsSource.find(
    (group) => group.name === outboundName || group.id === outboundName,
  )
  if (groupTarget) {
    return { id: groupTarget.id, name: groupTarget.name, type: 'group' }
  }

  const nodeTarget = nodesSource.find(
    (node) => node.name === outboundName || node.id === outboundName,
  )
  if (nodeTarget) {
    return { id: nodeTarget.id, name: nodeTarget.name, type: 'node' }
  }

  if (isBuiltInOutboundTag(outboundName)) {
    const builtInOutbound = normalizeBuiltInOutboundTag(outboundName)
    const builtInTarget = nodesSource.find(
      (node) => node.name === builtInOutbound || node.id === builtInOutbound,
    )
    if (builtInTarget) {
      return { id: builtInTarget.id, name: builtInTarget.name, type: 'node' }
    }
  }

  return null
}

function getRuleCardSignature(card: Pick<RoutingRuleCardResource, 'rules' | 'outboundTarget'>) {
  return JSON.stringify({
    outbound: card.outboundTarget?.name || '',
    rules: card.rules.map((rule) => ({
      condition: rule.condition,
      target: rule.target,
      value: rule.value,
    })),
  })
}

function buildRuleCardsFromSource(
  rulesSource: FastProxyNormalizedRule[],
  groupsSource: RoutingGroupResource[],
  nodesSource: RoutingNodeResource[],
): RoutingRuleCardResource[] {
  return rulesSource.flatMap((rule, index) => {
    const outboundName = rule.outbound || getRawRuleTarget(rule.raw?.[0] || '') || 'direct'
    const outboundTarget = resolveOutboundTarget(outboundName, groupsSource, nodesSource)
    if (!outboundTarget) return []

    const card = {
      enabled: true,
      id: rule.id,
      name: outboundTarget.name || `Rule ${index + 1}`,
      outboundTarget,
      rules: buildRuleLeafs(rule, outboundTarget.name),
      sourceRule: rule,
      sourceSignature: '',
    }
    card.sourceSignature = getRuleCardSignature(card)
    return [card]
  })
}

function buildRuleCardsFromStoredCards(
  cards: FastProxyRoutingRuleCard[],
): RoutingRuleCardResource[] {
  return cards.map((card) => ({
    enabled: card.enabled !== false,
    id: card.id,
    name: card.name,
    outboundTarget: card.outboundTarget
      ? {
          id: card.outboundTarget.id,
          name: card.outboundTarget.name,
          type: card.outboundTarget.type === 'group' ? 'group' : 'node',
        }
      : null,
    rules: card.rules || [],
    sourceRule: card.sourceRule,
    sourceSignature: card.sourceSignature,
  }))
}

function sanitizeRuleCards(
  cards: RoutingRuleCardResource[],
  groupsSource: RoutingGroupResource[],
  nodesSource: RoutingNodeResource[],
) {
  let changed = false

  const sanitizedCards = cards.flatMap((card) => {
    const outboundName = card.outboundTarget?.name || card.name
    const outboundTarget = resolveOutboundTarget(outboundName, groupsSource, nodesSource)
    if (!outboundTarget) {
      changed = true
      return []
    }

    const nextRules = (card.rules || []).map((rule) => ({
      ...rule,
      target: outboundTarget.name,
    }))

    if (
      card.outboundTarget?.id !== outboundTarget.id ||
      card.outboundTarget?.name !== outboundTarget.name ||
      card.outboundTarget?.type !== outboundTarget.type ||
      card.name !== outboundTarget.name ||
      nextRules.some((rule, index) => rule.target !== card.rules[index]?.target)
    ) {
      changed = true
    }

    return [
      {
        ...card,
        name: outboundTarget.name,
        outboundTarget,
        rules: nextRules,
      },
    ]
  })

  return {
    changed,
    cards: sanitizedCards,
  }
}

function serializeRuleCards(): FastProxyRoutingRuleCard[] {
  return ruleCards.value.map((card) => ({
    enabled: card.enabled,
    id: card.id,
    name: card.outboundTarget?.name || card.name,
    outboundTarget: card.outboundTarget,
    rules: card.rules,
    sourceRule: card.sourceRule,
    sourceSignature: card.sourceSignature,
  }))
}

function getActivePersistenceTargets() {
  const preset = selectedPreset.value
  const repositoryValue = repository.value
  const configuredRuleSetId = fastProxySelectedRoutingRuleSetIds.value[0]

  return {
    groupSetId: preset?.groupSetIds[0] || repositoryValue?.groupSets[0]?.id || null,
    ruleSetId:
      preset?.ruleSetIds[0] ||
      configuredRuleSetId ||
      repositoryValue?.routingRuleSets[0]?.id ||
      null,
    name: preset?.name || 'Routing Rules',
  }
}

function buildGroupRaw(group: RoutingGroupResource) {
  const raw = { ...(group.raw || {}) }
  if (group.testUrl) raw.url = group.testUrl
  if (typeof group.interval === 'number') raw.interval = group.interval
  if (typeof group.tolerance === 'number') raw.tolerance = group.tolerance
  if (typeof group.lazy === 'boolean') raw.lazy = group.lazy
  if (group.strategy) raw.strategy = group.strategy
  if (group.regexEnabled) {
    raw.regexEnabled = true
    raw.matchPattern = group.matchPattern?.trim() || ''
  } else {
    delete raw.regexEnabled
    delete raw.matchPattern
  }
  return raw
}

function buildNormalizedGroups(): FastProxyNormalizedGroup[] {
  return groups.value.map((group) => {
    return {
      id: group.id,
      outbounds: buildGroupOutbounds(group),
      raw: buildGroupRaw(group),
      tag: group.name,
      type: group.groupType,
    }
  })
}

function normalizeRuleValue(value: string | string[]) {
  return Array.isArray(value) ? value : [value]
}

function getClashRuleType(condition: string) {
  const ruleKey = condition.toLowerCase().replaceAll('-', '_')
  const ruleTypeMap: Record<string, string> = {
    domain: 'DOMAIN',
    domain_keyword: 'DOMAIN-KEYWORD',
    domain_regex: 'DOMAIN-REGEX',
    domain_suffix: 'DOMAIN-SUFFIX',
    geoip: 'GEOIP',
    geosite: 'GEOSITE',
    ip_cidr: 'IP-CIDR',
    source_ip_cidr: 'SRC-IP-CIDR',
    package_name: 'PROCESS-NAME',
    port: 'DST-PORT',
    process_name: 'PROCESS-NAME',
    rule_set: 'RULE-SET',
  }
  return ruleTypeMap[ruleKey] || ruleKey.toUpperCase().replaceAll('_', '-')
}

function buildRawRuleLines(condition: string, value: string | string[], target: string) {
  const ruleType = getClashRuleType(condition)
  if (ruleType === 'MATCH') return [`MATCH,${target}`]
  return normalizeRuleValue(value).map((item) => `${ruleType},${item},${target}`)
}

function isSingBoxRuleSetValue(value: string) {
  return (
    value.startsWith('geoip-') ||
    value.startsWith('geosite-') ||
    value.startsWith('geo/') ||
    value.startsWith('geo-lite/')
  )
}

function inferUnsupportedCoresForRuleLeaf(rule: RoutingRuleCardResource['rules'][number]) {
  if (rule.unsupportedCores?.includes('sing-box')) {
    return rule.unsupportedCores
  }
  const ruleKey = rule.condition.toLowerCase().replaceAll('-', '_')
  if (ruleKey !== 'rule_set') {
    return rule.unsupportedCores
  }
  if (rule.sourceRule?.rule_set?.length) {
    return rule.unsupportedCores
  }
  if (normalizeRuleValue(rule.value).every(isSingBoxRuleSetValue)) {
    return rule.unsupportedCores
  }
  return [...(rule.unsupportedCores || []), 'sing-box' as FastProxyCoreId]
}

function inferUnsupportedReasonForRuleLeaf(rule: RoutingRuleCardResource['rules'][number]) {
  const unsupportedCores = inferUnsupportedCoresForRuleLeaf(rule)
  if (!unsupportedCores?.includes('sing-box')) {
    return rule.unsupportedReason
  }
  return rule.unsupportedReason || '未匹配到内置 sing-box 规则集'
}

function replaceRawRuleTarget(raw: string, target: string) {
  const parts = splitTopLevelCommaParts(raw)
  if (parts.length === 0) return raw
  const ruleType = parts[0].toUpperCase()
  if (ruleType === 'MATCH' && parts.length >= 2) {
    parts[1] = target
    return parts.join(',')
  }
  if (['AND', 'OR', 'NOT'].includes(ruleType) && parts.length >= 3) {
    parts[parts.length - 1] = target
    return parts.join(',')
  }
  if (parts.length >= 3) {
    parts[2] = target
    return parts.join(',')
  }
  return raw
}

function sourceRuleFromLeaf(rule: RoutingRuleCardResource['rules'][number]) {
  if (!rule.sourceRule) return null
  return {
    ...rule.sourceRule,
    id: rule.id,
    outbound: rule.target,
    raw: rule.sourceRule.raw?.map((line) => replaceRawRuleTarget(line, rule.target)),
  } as FastProxyNormalizedRule
}

function buildNormalizedRuleFromLeaf(rule: RoutingRuleCardResource['rules'][number]) {
  const sourceRule = sourceRuleFromLeaf(rule)
  if (sourceRule) {
    return sourceRule
  }

  const ruleKey = rule.condition.toLowerCase().replaceAll('-', '_')
  if (ruleKey === 'raw') {
    return {
      id: rule.id,
      raw: normalizeRawRuleLines(rule.value),
      unsupportedCores: inferUnsupportedCoresForRuleLeaf(rule),
      unsupportedReason: inferUnsupportedReasonForRuleLeaf(rule),
    }
  }

  const normalized: FastProxyNormalizedRule = {
    id: rule.id,
    outbound: rule.target,
    raw: buildRawRuleLines(ruleKey, rule.value, rule.target),
    unsupportedCores: inferUnsupportedCoresForRuleLeaf(rule),
    unsupportedReason: inferUnsupportedReasonForRuleLeaf(rule),
  }

  if (ruleKey !== 'match') {
    const ruleValues = normalizeRuleValue(rule.value)
    normalized[ruleKey] = ruleValues
  }

  return normalized
}

function normalizeRawRuleLines(value: string | string[]) {
  return normalizeRuleValue(value)
    .map((line) =>
      line
        .replace(/^\s*#\s*-?\s*/, '')
        .replace(/^\s*-\s*/, '')
        .trim(),
    )
    .filter(Boolean)
}

function getRawRuleTarget(raw: string) {
  const parts = splitTopLevelCommaParts(raw)
  return parts.length > 1 ? parts[parts.length - 1].trim() : ''
}

function splitTopLevelCommaParts(value: string) {
  const parts: string[] = []
  let depth = 0
  let start = 0

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
    } else if (char === ',' && depth === 0) {
      parts.push(value.slice(start, index))
      start = index + 1
    }
  }

  parts.push(value.slice(start))
  return parts.map((part) => part.trim()).filter(Boolean)
}

function buildNormalizedRules(): FastProxyNormalizedRule[] {
  return ruleCards.value.flatMap((card) => {
    if (!card.enabled) return []
    if (card.sourceRule && card.sourceSignature === getRuleCardSignature(card)) {
      return [card.sourceRule]
    }
    return card.rules.map((rule) => buildNormalizedRuleFromLeaf(rule))
  })
}

function getGroupSetPayload(
  targetId: string | null,
  fallbackName: string,
): Partial<FastProxyGroupSetResource> {
  const existing = targetId
    ? repository.value?.groupSets.find((item) => item.id === targetId)
    : undefined
  return {
    ...(existing || {}),
    groups: buildNormalizedGroups(),
    name: existing?.name || fallbackName,
  }
}

function getRuleSetPayload(
  targetId: string | null,
  fallbackName: string,
): Partial<FastProxyRuleSetResource> {
  const existing = targetId
    ? repository.value?.routingRuleSets.find((item) => item.id === targetId)
    : undefined
  return {
    ...(existing || {}),
    name: existing?.name || fallbackName,
    ruleCards: serializeRuleCards(),
    rules: buildNormalizedRules(),
  }
}

async function saveRoutingWorkspaceNow() {
  if (savingWorkspace.value) {
    saveQueuedWhileBusy.value = true
    return
  }

  savingWorkspace.value = true
  try {
    const targets = getActivePersistenceTargets()
    const groupPayload = getGroupSetPayload(targets.groupSetId, targets.name)
    const rulePayload = getRuleSetPayload(targets.ruleSetId, targets.name)

    const [, ruleResult] = await Promise.all([
      targets.groupSetId
        ? updateGroupSetAPI(targets.groupSetId, groupPayload)
        : createGroupSetAPI(groupPayload),
      targets.ruleSetId
        ? updateRoutingRuleSetAPI(targets.ruleSetId, rulePayload)
        : createRoutingRuleSetAPI(rulePayload),
    ])

    const persistedRuleSetId = targets.ruleSetId || ruleResult.data.id
    if (persistedRuleSetId && !targets.ruleSetId) {
      await updateFastProxyGlobalConfigFields({ routingRuleSetIds: [persistedRuleSetId] })
    }
    await loadFastProxyWorkspace()
  } catch (error) {
    showNotification({
      content: extractErrorMessage(error, '保存路由配置失败'),
      type: 'alert-error',
      timeout: 5000,
    })
  } finally {
    savingWorkspace.value = false
    if (saveQueuedWhileBusy.value) {
      saveQueuedWhileBusy.value = false
      queueSaveRoutingWorkspace()
    }
  }
}

function queueSaveRoutingWorkspace() {
  if (saveTimer.value) {
    clearTimeout(saveTimer.value)
  }
  saveTimer.value = setTimeout(() => {
    saveTimer.value = null
    void saveRoutingWorkspaceNow()
  }, SAVE_DEBOUNCE_MS)
}

function reconcileCollapsedIds(currentIds: string[], previousIds: string[], nextIds: string[]) {
  const previousIdSet = new Set(previousIds)
  if (previousIds.length === 0) {
    return nextIds
  }

  const nextIdSet = new Set(nextIds)
  const preservedIds = currentIds.filter((id) => nextIdSet.has(id))
  const newIds = nextIds.filter((id) => !previousIdSet.has(id))
  return [...preservedIds, ...newIds]
}

function syncRoutingWorkspace() {
  const sourceGroups = getActiveGroups()
  const sourceRules = getActiveRules()
  const storedRuleCards = getActiveStoredRuleCards()
  const sourceNodes = getActiveNodes()
  const referencedOutbounds = [
    ...sourceGroups.flatMap((group) => group.outbounds || []),
    ...sourceRules
      .map((rule) => rule.outbound || getRawRuleTarget(rule.raw?.[0] || ''))
      .filter(Boolean),
  ]
  const nextNodes = buildNodeResources(sourceNodes, referencedOutbounds, sourceGroups)
  const groupBuildResult = buildGroupsFromSource(sourceGroups, nextNodes)
  const nextGroups = groupBuildResult.groups
  const previousGroupIds = groups.value.map((group) => group.id)
  const previousRuleCardIds = ruleCards.value.map((card) => card.id)

  nodeResources.value = nextNodes
  groups.value = nextGroups
  const builtRuleCards = storedRuleCards.length
    ? buildRuleCardsFromStoredCards(storedRuleCards)
    : buildRuleCardsFromSource(sourceRules, nextGroups, nextNodes)
  const sourceRuleCardsChanged =
    storedRuleCards.length === 0 && builtRuleCards.length !== sourceRules.length
  const ruleCardSanitizeResult = sanitizeRuleCards(builtRuleCards, nextGroups, nextNodes)
  const nextRuleCards = ruleCardSanitizeResult.cards
  ruleCards.value = nextRuleCards
  syncRuleCardIdCounter(nextRuleCards)
  collapsedGroupIds.value = reconcileCollapsedIds(
    collapsedGroupIds.value,
    previousGroupIds,
    nextGroups.map((group) => group.id),
  )
  collapsedRuleCardIds.value = reconcileCollapsedIds(
    collapsedRuleCardIds.value,
    previousRuleCardIds,
    nextRuleCards.map((card) => card.id),
  )

  if (groupBuildResult.changed || sourceRuleCardsChanged || ruleCardSanitizeResult.changed) {
    queueSaveRoutingWorkspace()
  }
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response &&
    'data' in error.response
  ) {
    const data = error.response.data as { message?: string; detail?: string }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message
    }
    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail
    }
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

watch(
  [repository, fastProxySelectedRoutingRuleSetIds, selectedPresetId],
  () => {
    syncRoutingWorkspace()
  },
  { immediate: true },
)

watch(
  [repository, activeCore],
  () => {
    builtInRuleSetOptions.value = []
    ruleSetOptionQuery.value = ''
    ruleSetOptionSourceFilter.value = 'built-in'
  },
  { immediate: true },
)

watch(
  routingPresets,
  (presets) => {
    if (selectedPresetId.value) {
      if (!presets.some((preset) => preset.id === selectedPresetId.value)) {
        selectedPresetId.value = null
      }
      return
    }
    if (profilePresetId.value) {
      selectedPresetId.value = profilePresetId.value
      return
    }
    if (!selectedPresetId.value && presets.length === 1) {
      selectedPresetId.value = presets[0].id
    }
  },
  { immediate: true },
)

watch(profilePresetId, (presetId) => {
  if (presetId) {
    selectedPresetId.value = presetId
  }
})

onMounted(async () => {
  if (!repository.value) {
    await loadFastProxyWorkspace().catch(() => null)
  }
})

onBeforeUnmount(() => {
  if (!saveTimer.value) return
  clearTimeout(saveTimer.value)
  saveTimer.value = null
  void saveRoutingWorkspaceNow()
})
</script>

<style scoped>
.routing-ghost {
  opacity: 0.45;
}
</style>
