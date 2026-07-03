<template>
  <div
    class="relative flex size-full flex-col overflow-hidden"
    :style="padding"
  >
    <CtrlsBar>
      <div class="flex flex-wrap items-center gap-2 p-2">
        <div class="flex items-center gap-2">
          <span class="badge badge-ghost">订阅 {{ subscriptions.length }}</span>
          <span class="badge badge-ghost">配置 {{ profiles.length }}</span>
          <span class="badge badge-ghost">自动更新 {{ enabledAutoUpdateCount }}</span>
          <span class="badge badge-ghost">异常 {{ syncErrorCount }}</span>
        </div>

        <div class="join min-w-0 flex-1">
          <TextInput
            v-model="filterText"
            placeholder="搜索名称 / 地址 / UA / 规则"
            clearable
            before-close
            input-class="min-w-0 flex-1"
          />
        </div>

        <div class="flex items-center gap-2">
          <button
            class="btn btn-circle btn-sm"
            :disabled="busy || actionLoading"
            @click="refreshWorkspace"
            aria-label="refresh"
          >
            <ArrowPathIcon class="h-4 w-4" />
          </button>
          <button
            class="btn btn-primary btn-sm"
            :disabled="busy || actionLoading"
            @click="openCreateDialog"
          >
            <PlusIcon class="h-4 w-4" />
            添加订阅
          </button>
        </div>
      </div>
    </CtrlsBar>

    <div class="base-container m-3 flex-1 overflow-auto backdrop-blur-none!">
      <table class="table-sm table min-w-[1180px]">
        <thead
          class="bg-base-100 border-base-300/60 sticky top-0 z-10 border-b backdrop-blur-none!"
        >
          <tr>
            <th>订阅名称</th>
            <th>订阅地址</th>
            <th>拉取设置</th>
            <th>自动更新</th>
            <th>同步状态</th>
            <th>快照</th>
            <th>关联配置</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody v-if="filteredSubscriptions.length">
          <tr
            v-for="(subscription, index) in filteredSubscriptions"
            :key="subscription.id"
            :class="[
              index % 2 === 0 ? 'bg-base-150' : 'bg-base-100',
              'hover:bg-primary! hover:text-primary-content!',
            ]"
          >
            <td class="align-top text-sm whitespace-nowrap">
              <div class="max-w-[220px]">
                <div class="truncate text-sm font-semibold">{{ subscription.name }}</div>
                <div class="text-base-content/55 mt-1 text-xs">
                  {{ subscription.originType }}
                </div>
                <div class="text-base-content/55 mt-2 text-xs">
                  更新于 {{ formatTime(subscription.updatedAt) }}
                </div>
              </div>
            </td>
            <td class="align-top text-sm">
              <div class="max-w-[360px] space-y-1 text-xs leading-5 break-all">
                <div
                  v-for="line in getSourceLines(subscription)"
                  :key="line"
                  :title="`${line}\n右键复制完整地址`"
                  class="border-base-300/50 bg-base-200/45 cursor-copy rounded-xl border px-3 py-2"
                  @contextmenu.prevent.stop="handleCopySourceLine(line)"
                >
                  <div class="line-clamp-2 leading-5 break-all whitespace-normal">
                    {{ line }}
                  </div>
                </div>
                <div
                  v-if="!getSourceLines(subscription).length"
                  class="text-base-content/40"
                >
                  暂无订阅地址
                </div>
              </div>
            </td>
            <td class="align-top text-sm whitespace-nowrap">
              <div class="max-w-[240px] space-y-2 text-xs">
                <div class="flex flex-wrap gap-2">
                  <span class="badge badge-outline badge-sm">
                    UA: {{ subscription.fetch?.userAgent || 'Clash' }}
                  </span>
                  <span class="badge badge-ghost badge-sm">
                    源 {{ getSourceLines(subscription).length }}
                  </span>
                </div>
                <div class="text-base-content/55 leading-5">
                  直接拉取订阅地址并解析节点、规则和分组。
                </div>
              </div>
            </td>
            <td class="align-top text-sm whitespace-nowrap">
              <div class="space-y-2 text-xs">
                <div
                  class="badge badge-sm"
                  :class="
                    subscription.autoUpdate?.enabled ? 'badge-success badge-outline' : 'badge-ghost'
                  "
                >
                  {{ subscription.autoUpdate?.enabled ? '已开启' : '已关闭' }}
                </div>
                <div class="text-base-content/60">
                  {{ getAutoUpdateText(subscription) }}
                </div>
              </div>
            </td>
            <td class="align-top text-sm whitespace-nowrap">
              <div class="max-w-[220px] space-y-2 text-xs">
                <div
                  class="badge badge-sm"
                  :class="
                    subscription.sync?.lastSyncError
                      ? 'badge-error badge-outline'
                      : 'badge-success badge-outline'
                  "
                >
                  {{
                    subscription.sync?.lastSyncError
                      ? '同步失败'
                      : subscription.sync?.lastSyncedAt
                        ? '同步正常'
                        : '等待首次同步'
                  }}
                </div>
                <div class="text-base-content/60">
                  最近同步:
                  {{
                    subscription.sync?.lastSyncedAt
                      ? formatTime(subscription.sync.lastSyncedAt)
                      : '-'
                  }}
                </div>
                <div
                  v-if="subscription.sync?.lastSyncError"
                  class="text-error text-xs leading-5 break-all"
                >
                  {{ subscription.sync.lastSyncError }}
                </div>
              </div>
            </td>
            <td class="align-top text-sm whitespace-nowrap">
              <div class="text-base-content/65 space-y-2 text-xs">
                <div>
                  节点:
                  {{ getSetName('node', subscription) }}
                  <span class="text-base-content/45">({{ getNodeCount(subscription) }})</span>
                </div>
                <div>
                  分组:
                  {{ getSetName('group', subscription) }}
                  <span class="text-base-content/45">({{ getGroupCount(subscription) }})</span>
                </div>
                <div>
                  规则:
                  {{ getSetName('rule', subscription) }}
                  <span class="text-base-content/45">({{ getRuleCount(subscription) }})</span>
                </div>
                <div v-if="subscription.revision">版本: {{ subscription.revision }}</div>
              </div>
            </td>
            <td class="align-top text-sm whitespace-nowrap">
              <span class="badge badge-ghost badge-sm">
                {{ getAttachedProfilesCount(subscription.id) }} 个配置
              </span>
            </td>
            <td class="align-top text-sm whitespace-nowrap">
              <div class="flex justify-end gap-2">
                <button
                  class="btn btn-xs btn-outline"
                  :disabled="busy || actionLoading"
                  @click="refreshSubscription(subscription.id)"
                >
                  立即更新
                </button>
                <button
                  class="btn btn-xs"
                  :disabled="busy || actionLoading"
                  @click="openEditDialog(subscription)"
                >
                  修改
                </button>
                <button
                  class="btn btn-xs btn-error btn-outline"
                  :disabled="busy || actionLoading"
                  @click="removeSubscription(subscription)"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="!filteredSubscriptions.length && subscriptions.length"
        class="text-base-content/55 flex min-h-[360px] flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <div class="text-xl font-semibold">没有匹配的订阅</div>
        <p class="max-w-xl text-sm leading-6">
          试试搜索订阅名称、地址、User-Agent、节点集合名或规则集合名。
        </p>
      </div>

      <div
        v-if="!subscriptions.length"
        class="text-base-content/55 flex min-h-[360px] flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <div class="text-2xl font-semibold">还没有任何配置订阅</div>
        <p class="max-w-xl text-sm leading-6">
          先添加一个订阅源，保存后会自动拉取并解析订阅内容，之后就可以在这里继续修改、删除和配置自动更新。
        </p>
        <button
          class="btn btn-primary"
          :disabled="busy || actionLoading"
          @click="openCreateDialog"
        >
          添加第一个订阅
        </button>
      </div>
    </div>

    <DialogWrapper
      v-model="dialogOpen"
      :title="editingId ? '修改配置订阅' : '添加配置订阅'"
      box-class="max-w-4xl"
    >
      <div class="space-y-4 p-1">
        <div class="border-base-300/60 bg-base-200/35 rounded-2xl border px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-ghost badge-sm">
              {{ editingId ? '编辑现有订阅' : '创建新订阅' }}
            </span>
            <span class="badge badge-ghost badge-sm">源地址 {{ sourceCount }}</span>
            <span class="badge badge-ghost badge-sm">
              自动更新 {{ form.autoUpdateEnabled ? '开启' : '关闭' }}
            </span>
          </div>
          <p class="text-base-content/60 mt-2 text-xs leading-5">
            订阅保存后会自动拉取内容，并将节点、分组和规则写入当前仓库快照。
          </p>
        </div>

        <section class="border-base-300/60 overflow-hidden rounded-2xl border">
          <div class="divide-base-300/60 divide-y">
            <label
              class="hover:bg-base-200/35 flex flex-col gap-4 px-4 py-4 transition-colors lg:flex-row lg:items-center lg:justify-between"
            >
              <div class="max-w-sm space-y-1">
                <div class="text-sm font-semibold">订阅名称</div>
                <p class="text-base-content/60 text-xs leading-5">
                  用于区分不同订阅源，建议保持唯一且便于识别。
                </p>
              </div>
              <div class="w-full lg:max-w-md">
                <input
                  v-model="form.name"
                  class="input input-bordered w-full"
                  type="text"
                  placeholder="例如：机场 A 主订阅"
                />
              </div>
            </label>

            <label
              class="hover:bg-base-200/35 flex flex-col gap-4 px-4 py-4 transition-colors lg:flex-row lg:items-center lg:justify-between"
            >
              <div class="max-w-sm space-y-1">
                <div class="text-sm font-semibold">User-Agent</div>
                <p class="text-base-content/60 text-xs leading-5">
                  某些订阅服务会根据请求头返回不同内容，默认使用 Clash。
                </p>
              </div>
              <div class="w-full lg:max-w-md">
                <input
                  v-model="form.userAgent"
                  class="input input-bordered w-full"
                  type="text"
                  list="subscription-ua-list"
                  placeholder="Clash"
                />
                <datalist id="subscription-ua-list">
                  <option value="clash-verge/v2.4.5" />
                  <option value="clash.meta/1.19.20" />
                  <option value="Clash" />
                </datalist>
              </div>
            </label>

            <label
              class="hover:bg-base-200/35 flex flex-col gap-4 px-4 py-4 transition-colors lg:flex-row lg:items-start lg:justify-between"
            >
              <div class="max-w-sm space-y-1">
                <div class="text-sm font-semibold">订阅地址</div>
                <p class="text-base-content/60 text-xs leading-5">
                  支持单个或多个地址，按换行或 `|` 分隔。
                </p>
              </div>
              <div class="w-full space-y-2 lg:max-w-2xl">
                <textarea
                  v-model="form.sourceInput"
                  class="textarea textarea-bordered min-h-[132px] w-full font-mono text-sm leading-6"
                  placeholder="https://example.com/subscription.yaml"
                />
                <div class="text-base-content/55 flex flex-wrap items-center gap-2 text-xs">
                  <span class="badge badge-ghost badge-xs">已识别 {{ sourceCount }} 条地址</span>
                  <span>保存时会按顺序写入后端订阅配置。</span>
                </div>
              </div>
            </label>

            <div
              class="hover:bg-base-200/35 flex flex-col gap-4 px-4 py-4 transition-colors lg:flex-row lg:items-center lg:justify-between"
            >
              <div class="max-w-sm space-y-1">
                <div class="text-sm font-semibold">自动更新</div>
                <p class="text-base-content/60 text-xs leading-5">
                  后端会按设定周期自动刷新订阅，并写回本地仓库。
                </p>
              </div>
              <div class="w-full lg:max-w-2xl">
                <div
                  class="border-base-300/60 bg-base-200/35 flex flex-col gap-3 rounded-2xl border px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div class="flex items-center gap-3">
                    <input
                      v-model="form.autoUpdateEnabled"
                      class="toggle toggle-success"
                      type="checkbox"
                    />
                    <div class="text-sm">
                      {{ form.autoUpdateEnabled ? '已开启自动更新' : '当前不会自动更新' }}
                    </div>
                  </div>
                  <label class="flex items-center gap-3">
                    <span class="text-base-content/60 text-xs whitespace-nowrap">
                      间隔（分钟）
                    </span>
                    <input
                      v-model.number="form.autoUpdateIntervalMinutes"
                      class="input input-bordered w-full md:w-32"
                      type="number"
                      min="5"
                      step="5"
                      :disabled="!form.autoUpdateEnabled"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="border-base-300/50 mt-6 flex items-center justify-end gap-3 border-t px-1 pt-4">
        <button
          class="btn btn-ghost"
          :disabled="saving"
          @click="dialogOpen = false"
        >
          取消
        </button>
        <button
          class="btn btn-primary"
          :disabled="saving || !canSubmit"
          @click="saveSubscription"
        >
          <span
            v-if="saving"
            class="loading loading-spinner loading-sm"
          />
          确认
        </button>
      </div>
    </DialogWrapper>
  </div>
</template>

<script setup lang="ts">
import {
  createSubscriptionAPI,
  deleteSubscriptionAPI,
  queryNodeCacheAPI,
  refreshSubscriptionAPI,
  updateSubscriptionAPI,
} from '@/api/fastproxy'
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import TextInput from '@/components/common/TextInput.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { showNotification } from '@/helper/notification'
import { fromNow } from '@/helper/utils'
import {
  fastProxyBusy,
  fastProxyProfiles,
  fastProxyRepository,
  loadFastProxyWorkspace,
} from '@/store/fastproxyRepository'
import type { FastProxySubscriptionResource } from '@/types/fastproxy'
import { ArrowPathIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { computed, onMounted, reactive, ref, watch } from 'vue'

type SubscriptionFormState = {
  name: string
  sourceInput: string
  userAgent: string
  autoUpdateEnabled: boolean
  autoUpdateIntervalMinutes: number
}

const busy = computed(() => fastProxyBusy.value)
const subscriptions = computed(() => fastProxyRepository.value?.subscriptions || [])
const profiles = computed(() => fastProxyProfiles.value)
const nodeCountsBySubscription = ref<Record<string, number>>({})
const nodeSetMap = computed(() => {
  return new Map((fastProxyRepository.value?.nodeSets || []).map((item) => [item.id, item]))
})
const groupSetMap = computed(() => {
  return new Map((fastProxyRepository.value?.groupSets || []).map((item) => [item.id, item]))
})
const ruleSetMap = computed(() => {
  return new Map((fastProxyRepository.value?.routingRuleSets || []).map((item) => [item.id, item]))
})
async function refreshNodeCounts() {
  const entries = await Promise.all(
    subscriptions.value.map(async (subscription) => {
      try {
        const { data } = await queryNodeCacheAPI({
          subscriptionId: subscription.id,
          limit: 1,
        })
        return [subscription.id, data.total] as const
      } catch {
        return [subscription.id, 0] as const
      }
    }),
  )
  nodeCountsBySubscription.value = Object.fromEntries(entries)
}

const dialogOpen = ref(false)
const saving = ref(false)
const actionLoading = ref(false)
const editingId = ref<string | null>(null)
const filterText = ref('')
const { padding } = usePaddingForViews({
  offsetTop: 0,
  offsetBottom: 0,
})

const form = reactive<SubscriptionFormState>(createEmptyForm())
const sourceCount = computed(() => splitLines(form.sourceInput).length)
const enabledAutoUpdateCount = computed(() => {
  return subscriptions.value.filter((subscription) => subscription.autoUpdate?.enabled).length
})
const syncErrorCount = computed(() => {
  return subscriptions.value.filter((subscription) => subscription.sync?.lastSyncError).length
})
const filteredSubscriptions = computed(() => {
  const keyword = filterText.value.trim().toLowerCase()
  if (!keyword) return subscriptions.value

  return subscriptions.value.filter((subscription) => {
    const haystacks = [
      subscription.name,
      subscription.originType,
      subscription.fetch?.userAgent,
      subscription.revision,
      subscription.sync?.lastSyncError,
      getSetName('node', subscription),
      getSetName('group', subscription),
      getSetName('rule', subscription),
      ...getSourceLines(subscription),
    ]

    return haystacks.some((value) => value?.toLowerCase().includes(keyword))
  })
})

const canSubmit = computed(() => {
  return Boolean(form.name.trim() && sourceCount.value)
})

function createEmptyForm(): SubscriptionFormState {
  return {
    name: '',
    sourceInput: '',
    userAgent: 'Clash',
    autoUpdateEnabled: false,
    autoUpdateIntervalMinutes: 60,
  }
}

function resetForm() {
  Object.assign(form, createEmptyForm())
}

function openCreateDialog() {
  editingId.value = null
  resetForm()
  dialogOpen.value = true
}

function openEditDialog(subscription: FastProxySubscriptionResource) {
  editingId.value = subscription.id
  Object.assign(form, {
    name: subscription.name || '',
    sourceInput: subscription.fetch?.sourceInput || subscription.sourceUrl || '',
    userAgent: subscription.fetch?.userAgent || 'Clash',
    autoUpdateEnabled: Boolean(subscription.autoUpdate?.enabled),
    autoUpdateIntervalMinutes: subscription.autoUpdate?.intervalMinutes || 60,
  })
  dialogOpen.value = true
}

async function refreshWorkspace() {
  await loadFastProxyWorkspace()
  await refreshNodeCounts()
}

async function saveSubscription() {
  if (!canSubmit.value || saving.value) return

  saving.value = true
  try {
    const payload = buildPayload()
    if (editingId.value) {
      await updateSubscriptionAPI(editingId.value, payload)
      showNotification({ content: '配置订阅已更新', type: 'alert-success' })
    } else {
      await createSubscriptionAPI(payload)
      showNotification({ content: '配置订阅已创建', type: 'alert-success' })
    }
    dialogOpen.value = false
    await loadFastProxyWorkspace()
    await refreshNodeCounts()
  } catch (error) {
    showNotification({
      content: extractErrorMessage(
        error,
        editingId.value ? '更新配置订阅失败' : '创建配置订阅失败',
      ),
      type: 'alert-error',
      timeout: 5000,
    })
  } finally {
    saving.value = false
  }
}

async function refreshSubscription(id: string) {
  actionLoading.value = true
  try {
    await refreshSubscriptionAPI(id)
    await loadFastProxyWorkspace()
    await refreshNodeCounts()
    showNotification({ content: '订阅已刷新', type: 'alert-success' })
  } catch (error) {
    showNotification({
      content: extractErrorMessage(error, '刷新订阅失败'),
      type: 'alert-error',
      timeout: 5000,
    })
  } finally {
    actionLoading.value = false
  }
}

async function removeSubscription(subscription: FastProxySubscriptionResource) {
  const confirmed = window.confirm(`确认删除订阅“${subscription.name}”吗？`)
  if (!confirmed) return

  actionLoading.value = true
  try {
    await deleteSubscriptionAPI(subscription.id)
    await loadFastProxyWorkspace()
    await refreshNodeCounts()
    showNotification({ content: '订阅已删除', type: 'alert-success' })
  } catch (error) {
    showNotification({
      content: extractErrorMessage(error, '删除订阅失败'),
      type: 'alert-error',
      timeout: 5000,
    })
  } finally {
    actionLoading.value = false
  }
}

function buildPayload(): Partial<FastProxySubscriptionResource> {
  const sources = splitLines(form.sourceInput)
  return {
    name: form.name.trim(),
    originType: 'clash-subscription',
    sourceUrl: sources[0] || '',
    fetch: {
      sourceInput: sources.join('\n'),
      userAgent: form.userAgent.trim() || 'Clash',
    },
    autoUpdate: {
      enabled: form.autoUpdateEnabled,
      intervalMinutes: form.autoUpdateEnabled
        ? Math.max(5, form.autoUpdateIntervalMinutes || 60)
        : 60,
    },
  }
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|\|/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showNotification({ content: '复制成功', type: 'alert-success', timeout: 2000 })
  } catch {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textArea)
    showNotification({
      content: copied ? '复制成功' : '复制失败',
      type: copied ? 'alert-success' : 'alert-error',
      timeout: 2000,
    })
  }
}

function handleCopySourceLine(line: string) {
  void copyTextToClipboard(line)
}

function getSourceLines(subscription: FastProxySubscriptionResource) {
  return splitLines(subscription.fetch?.sourceInput || subscription.sourceUrl || '')
}

function getAutoUpdateText(subscription: FastProxySubscriptionResource) {
  if (!subscription.autoUpdate?.enabled) {
    return '不会自动更新'
  }
  return `每 ${subscription.autoUpdate.intervalMinutes || 60} 分钟自动更新一次`
}

function getAttachedProfilesCount(subscriptionId: string) {
  return profiles.value.filter((profile) => profile.subscriptionIds?.includes(subscriptionId))
    .length
}

function getSetName(kind: 'node' | 'group' | 'rule', subscription: FastProxySubscriptionResource) {
  if (kind === 'node') {
    return nodeSetMap.value.get(subscription.name)?.name || '-'
  }
  if (kind === 'group') {
    return groupSetMap.value.get(subscription.name)?.name || '-'
  }
  return ruleSetMap.value.get(subscription.name)?.name || '-'
}

function getNodeCount(subscription: FastProxySubscriptionResource) {
  return nodeCountsBySubscription.value[subscription.id] || 0
}

function getGroupCount(subscription: FastProxySubscriptionResource) {
  return groupSetMap.value.get(subscription.name)?.groups?.length || 0
}

function getRuleCount(subscription: FastProxySubscriptionResource) {
  return ruleSetMap.value.get(subscription.name)?.rules?.length || 0
}

function formatTime(value?: string) {
  return value ? fromNow(value) : '-'
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
  () => subscriptions.value.map((subscription) => subscription.id).join('|'),
  () => {
    void refreshNodeCounts()
  },
  { immediate: true },
)

onMounted(() => {
  if (!fastProxyRepository.value) {
    void refreshWorkspace()
  }
})
</script>
