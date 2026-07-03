<template>
  <div v-bind="attrs">
    <section
      class="group base-container collapse w-full"
      :class="isCollapsed ? 'collapse-close' : 'collapse-open'"
    >
      <div
        class="collapse-title cursor-pointer p-5"
        @click="$emit('toggle-group', group.id)"
      >
        <div class="relative flex w-full items-start gap-3 overflow-hidden">
          <div class="flex min-w-0 flex-1 flex-col gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <Bars3Icon
                class="group-drag-handle text-base-content/45 h-4 w-4 shrink-0 cursor-grab"
              />
              <ChevronRightIcon
                class="h-4 w-4 shrink-0 transition-transform"
                :class="!isCollapsed && 'rotate-90'"
              />
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-2 overflow-hidden">
                  <h2 class="truncate text-base font-semibold">{{ group.name }}</h2>
                  <span class="text-base-content/60 shrink-0 text-xs tabular-nums">
                    · {{ groupTypeLabel }} · {{ displayedItemsCount }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="item in visibleItemPreview"
                :key="previewItemKey(item)"
                class="badge badge-outline h-5 min-h-5 max-w-full justify-start rounded-md px-1.5 text-[10px] leading-none"
              >
                <span class="truncate">{{ item.name }}</span>
              </span>
              <span
                v-if="hiddenItemPreviewCount > 0"
                class="badge badge-ghost h-5 min-h-5 rounded-md px-1.5 text-[10px] leading-none"
              >
                +{{ hiddenItemPreviewCount }}
              </span>
              <span
                v-if="displayedItemsCount === 0"
                class="text-base-content/50 text-xs"
              >
                {{ group.regexEnabled ? '没有匹配的节点' : '暂无节点' }}
              </span>
            </div>
          </div>

          <div
            class="absolute top-0 right-0 flex items-center gap-1"
            @click.stop
          >
            <button
              class="btn btn-circle btn-ghost btn-xs text-base-content/70 hover:text-base-content opacity-0 transition-all duration-200 group-hover:opacity-100 [@media(any-pointer:coarse)]:opacity-100"
              type="button"
              title="编辑分组"
              @click="$emit('edit-group', group.id)"
            >
              <PencilSquareIcon class="h-3.5 w-3.5" />
            </button>
            <button
              class="btn btn-circle btn-ghost btn-xs text-base-content/70 hover:text-base-content opacity-0 transition-all duration-200 group-hover:opacity-100 [@media(any-pointer:coarse)]:opacity-100"
              type="button"
              title="添加节点"
              :disabled="group.regexEnabled"
              @click="openAddNodesDialog"
            >
              <PlusIcon class="h-3.5 w-3.5" />
            </button>
            <button
              class="btn btn-circle btn-ghost btn-xs text-base-content/70 hover:text-error opacity-0 transition-all duration-200 group-hover:opacity-100 [@media(any-pointer:coarse)]:opacity-100"
              type="button"
              title="删除分组"
              @click="$emit('delete-group', group.id)"
            >
              <TrashIcon class="h-3.5 w-3.5" />
            </button>
            <label class="ml-1 flex items-center">
              <input
                :checked="group.enabled !== false"
                class="toggle toggle-primary toggle-sm"
                type="checkbox"
                @change="emitGroupEnabled(($event.target as HTMLInputElement).checked)"
              />
            </label>
          </div>
        </div>
      </div>

      <div
        class="collapse-content p-0"
        @transitionend="handleCollapseTransitionEnd"
      >
        <div
          v-if="showCollapseContent"
          class="px-5 pb-5"
        >
          <div
            v-if="group.regexEnabled"
            class="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            <div
              v-for="node in matchedNodes"
              :key="node.id"
              class="border-base-300/50 bg-base-200/35 rounded-2xl border p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium">{{ node.name }}</div>
                  <div class="text-base-content/55 mt-1 truncate text-xs">{{ node.address }}</div>
                </div>
                <div class="badge badge-primary badge-outline badge-sm">Node</div>
              </div>
            </div>

            <div
              v-if="matchedNodes.length === 0"
              class="text-base-content/55 py-8 text-center text-sm"
            >
              没有匹配的节点
            </div>
          </div>

          <Draggable
            v-else
            :model-value="group.items"
            @update:model-value="updateItems"
            item-key="entryId"
            :group="{ name: dragGroupName, pull: true, put: true }"
            :move="handleMove"
            handle=".resource-drag-handle"
            :animation="150"
            ghost-class="routing-ghost"
            class="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            <template #item="{ element: item }">
              <div class="border-base-300/50 bg-base-200/35 rounded-2xl border p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-3">
                    <Bars3Icon
                      class="resource-drag-handle text-base-content/45 h-4 w-4 shrink-0 cursor-grab"
                    />
                    <div class="min-w-0">
                      <div class="truncate text-sm font-medium">{{ item.name }}</div>
                      <div class="text-base-content/55 mt-1 truncate text-xs">
                        {{ item.type === 'group' ? 'Group resource' : item.address }}
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <div
                      class="badge badge-sm"
                      :class="item.type === 'group' ? 'badge-ghost' : 'badge-primary badge-outline'"
                    >
                      {{ item.type === 'group' ? 'Group' : 'Node' }}
                    </div>
                    <button
                      class="btn btn-circle btn-ghost btn-xs"
                      type="button"
                      @click="$emit('remove-item', group.id, item.entryId)"
                    >
                      <XMarkIcon class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </Draggable>
        </div>
      </div>
    </section>

    <DialogWrapper
      v-model="addResourcesDialogOpen"
      title="添加资源"
      box-class="max-w-2xl"
    >
      <div class="space-y-4">
        <input
          v-model.trim="resourceSearch"
          class="input input-bordered w-full"
          type="text"
          placeholder="搜索节点或分组"
        />

        <div class="flex items-center justify-between gap-3">
          <div class="text-base-content/60 text-sm">
            可选 {{ selectableResources.length }} 个，已选 {{ selectedResourceKeys.length }} 个
          </div>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-sm btn-ghost"
              type="button"
              @click="selectAllResources"
            >
              全选
            </button>
            <button
              class="btn btn-sm btn-ghost"
              type="button"
              @click="clearSelectedResources"
            >
              取消全选
            </button>
          </div>
        </div>

        <div
          class="border-base-300/60 max-h-[420px] space-y-2 overflow-y-auto rounded-2xl border p-2"
        >
          <label
            v-for="resource in filteredResources"
            :key="getResourceSelectionKey(resource)"
            class="border-base-300/50 bg-base-200/25 flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2"
            :class="!isResourceSelectable(resource) && 'opacity-45'"
          >
            <input
              v-model="selectedResourceKeys"
              class="checkbox checkbox-sm"
              type="checkbox"
              :value="getResourceSelectionKey(resource)"
              :disabled="!isResourceSelectable(resource)"
            />
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium">{{ resource.name }}</div>
              <div class="text-base-content/55 truncate text-xs">
                {{ resource.type === 'group' ? 'Group resource' : resource.address }}
              </div>
            </div>
            <div
              class="badge badge-sm"
              :class="resource.type === 'group' ? 'badge-ghost' : 'badge-primary badge-outline'"
            >
              {{ resource.type === 'group' ? 'Group' : 'Node' }}
            </div>
          </label>

          <div
            v-if="filteredResources.length === 0"
            class="text-base-content/55 py-8 text-center text-sm"
          >
            没有匹配的资源
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button
            class="btn btn-sm"
            type="button"
            @click="addResourcesDialogOpen = false"
          >
            取消
          </button>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            :disabled="selectedResourceKeys.length === 0"
            @click="confirmAddResources"
          >
            确认
          </button>
        </div>
      </div>
    </DialogWrapper>
  </div>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import {
  Bars3Icon,
  ChevronRightIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref, useAttrs, watch } from 'vue'
import Draggable from 'vuedraggable'

defineOptions({
  inheritAttrs: false,
})

export type RoutingNodeResource = {
  address: string
  id: string
  name: string
  type: 'node'
}

export type RoutingGroupReference = {
  entryId: string
  id: string
  name: string
  type: 'group'
}

export type RoutingNodeReference = {
  address: string
  entryId: string
  id: string
  name: string
  type: 'node'
}

export type RoutingItemReference = RoutingGroupReference | RoutingNodeReference

export type RoutingGroupMode = 'select' | 'url-test' | 'fallback' | 'load-balance' | 'relay'

export type RoutingGroupResource = {
  enabled?: boolean
  groupType: RoutingGroupMode
  id: string
  items: RoutingItemReference[]
  interval?: number
  lazy?: boolean
  matchPattern?: string
  name: string
  raw?: Record<string, unknown>
  regexEnabled?: boolean
  strategy?: 'round-robin' | 'consistent-hashing' | 'sticky-sessions'
  testUrl?: string
  tolerance?: number
  type: 'group'
}

const props = defineProps<{
  availableResources: RoutingItemReference[]
  availableNodes: RoutingNodeResource[]
  canDropItem: (item: RoutingItemReference, targetGroupId: string) => boolean
  collapsedIds: string[]
  dragGroupName: string
  group: RoutingGroupResource
}>()

const emit = defineEmits<{
  'add-resources': [groupId: string, resources: RoutingItemReference[]]
  'delete-group': [groupId: string]
  'edit-group': [groupId: string]
  'remove-item': [parentId: string, entryId: string]
  'toggle-group': [groupId: string]
  'update-group-enabled': [groupId: string, enabled: boolean]
  'update-group-items': [groupId: string, items: RoutingItemReference[]]
}>()

const attrs = useAttrs()

const isCollapsed = computed(() => props.collapsedIds.includes(props.group.id))
const addResourcesDialogOpen = ref(false)
const resourceSearch = ref('')
const selectedResourceKeys = ref<string[]>([])
const showCollapseContent = ref(!isCollapsed.value)
const ITEM_PREVIEW_LIMIT = 4

const matchedNodes = computed(() => {
  const pattern = props.group.matchPattern?.trim()
  if (!pattern) {
    return []
  }

  try {
    const regex = new RegExp(pattern, 'i')
    return props.availableNodes.filter((node) => regex.test(node.name) || regex.test(node.address))
  } catch {
    const keyword = pattern.toLowerCase()
    return props.availableNodes.filter((node) => {
      return (
        node.name.toLowerCase().includes(keyword) || node.address.toLowerCase().includes(keyword)
      )
    })
  }
})

const displayedItemsCount = computed(() => {
  return props.group.regexEnabled ? matchedNodes.value.length : props.group.items.length
})
const groupTypeLabel = computed(() => {
  switch (props.group.groupType) {
    case 'url-test':
      return 'URLTest'
    case 'fallback':
      return 'Fallback'
    case 'load-balance':
      return 'LoadBalance'
    case 'relay':
      return 'Relay'
    default:
      return 'Selector'
  }
})
const previewItems = computed(() => {
  return props.group.regexEnabled ? matchedNodes.value : props.group.items
})
const visibleItemPreview = computed(() => previewItems.value.slice(0, ITEM_PREVIEW_LIMIT))
const hiddenItemPreviewCount = computed(() =>
  Math.max(0, previewItems.value.length - visibleItemPreview.value.length),
)

const existingResourceKeys = computed(() => {
  return new Set(props.group.items.map((item) => `${item.type}:${item.id}`))
})

const filteredResources = computed(() => {
  const keyword = resourceSearch.value.toLowerCase()
  if (!keyword) {
    return props.availableResources
  }

  return props.availableResources.filter((resource) => {
    const searchFields =
      resource.type === 'group' ? [resource.name] : [resource.name, resource.address]

    return searchFields.some((field) => field.toLowerCase().includes(keyword))
  })
})

const selectableResources = computed(() => {
  return filteredResources.value.filter((resource) => isResourceSelectable(resource))
})

const updateItems = (items: RoutingItemReference[]) => {
  const uniqueItems = items.filter((item, index, list) => {
    return (
      list.findIndex((candidate) => candidate.id === item.id && candidate.type === item.type) ===
      index
    )
  })

  emit('update-group-items', props.group.id, uniqueItems)
}

const handleMove = (event: {
  draggedContext: { element: RoutingItemReference }
  from: HTMLElement
  to: HTMLElement
}) => {
  if (event.from === event.to) {
    return true
  }

  return props.canDropItem(event.draggedContext.element, props.group.id)
}

function openAddNodesDialog() {
  resourceSearch.value = ''
  selectedResourceKeys.value = []
  addResourcesDialogOpen.value = true
}

function selectAllResources() {
  selectedResourceKeys.value = selectableResources.value.map((resource) =>
    getResourceSelectionKey(resource),
  )
}

function clearSelectedResources() {
  selectedResourceKeys.value = []
}

function confirmAddResources() {
  if (selectedResourceKeys.value.length === 0) return

  const resources = props.availableResources.filter((resource) => {
    return selectedResourceKeys.value.includes(getResourceSelectionKey(resource))
  })

  emit('add-resources', props.group.id, resources)
  addResourcesDialogOpen.value = false
  selectedResourceKeys.value = []
}

function emitGroupEnabled(enabled: boolean) {
  emit('update-group-enabled', props.group.id, enabled)
}

function getResourceSelectionKey(resource: RoutingItemReference) {
  return `${resource.type}:${resource.id}`
}

function isResourceSelectable(resource: RoutingItemReference) {
  if (existingResourceKeys.value.has(getResourceSelectionKey(resource))) {
    return false
  }

  return props.canDropItem(resource, props.group.id)
}

function previewItemKey(item: RoutingNodeResource | RoutingItemReference) {
  return 'entryId' in item ? item.entryId : `${item.type}:${item.id}`
}

watch(isCollapsed, (collapsed) => {
  if (!collapsed) {
    showCollapseContent.value = true
  }
})

const handleCollapseTransitionEnd = () => {
  if (isCollapsed.value) {
    showCollapseContent.value = false
  }
}
</script>

<style scoped>
.routing-ghost {
  opacity: 0.45;
}
</style>
