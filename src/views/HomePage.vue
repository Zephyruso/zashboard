<template>
  <div class="bg-base-200/40 min-h-full px-3 pt-4 pb-24 sm:px-5 md:pb-6 lg:px-6">
    <main class="mx-auto flex w-full flex-col gap-5">
      <section class="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div class="border-base-300 bg-base-100 rounded-xl border p-3 shadow-sm sm:p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 class="text-lg font-semibold">运行控制</h2>
                <span class="badge badge-sm badge-ghost">目标 {{ selectedCore }}</span>
                <span
                  class="badge badge-sm"
                  :class="
                    runtimeSwitchChecked ? 'badge-success font-medium text-white' : 'badge-ghost'
                  "
                >
                  {{ runtimeSwitchChecked ? `运行 ${runningCore || selectedCore}` : '未运行' }}
                </span>
              </div>
              <div class="text-base-content/55 mt-1 truncate text-xs">
                版本 {{ selectedCoreVersionText }}
              </div>
            </div>

            <label
              v-if="isFastProxy"
              class="flex min-h-9 items-center gap-2"
            >
              <input
                class="toggle toggle-primary toggle-sm"
                type="checkbox"
                :checked="runtimeSwitchChecked"
                :disabled="runtimeAction !== null"
                aria-label="启动或停止运行时"
                @change="handleRuntimeToggle"
              />
              <span class="text-sm font-medium">
                {{ runtimeSwitchChecked ? '运行中' : '已停止' }}
              </span>
            </label>
          </div>

          <div
            class="mt-4 grid gap-3 lg:grid-cols-[minmax(140px,0.75fr)_minmax(170px,1fr)_minmax(170px,0.9fr)_auto]"
          >
            <label class="form-control">
              <span class="label min-h-0 py-0 pb-1">
                <span class="label-text text-xs font-medium">{{ $t('homeSelectedCore') }}</span>
              </span>
              <select
                class="select select-bordered select-sm w-full"
                :value="selectedCore"
                :disabled="!isFastProxy || runtimeAction !== null"
                aria-label="选择内核"
                @change="handleCoreChange"
              >
                <option value="mihomo">mihomo</option>
                <option value="sing-box">sing-box</option>
              </select>
              <span class="text-base-content/55 mt-1 text-xs">
                {{ pendingCoreSwitch ? `运行中仍是 ${runningCore}` : '配置目标核心' }}
              </span>
            </label>

            <label class="form-control">
              <span class="label min-h-0 py-0 pb-1">
                <span class="label-text text-xs font-medium">路由规则</span>
              </span>
              <select
                class="select select-bordered select-sm w-full"
                :value="selectedRoutingRuleSetId"
                :disabled="!isFastProxy || runtimeAction !== null || routingRuleSets.length === 0"
                aria-label="选择路由规则"
                @change="handleRoutingRuleSetChange"
              >
                <option
                  v-for="ruleSet in routingRuleSets"
                  :key="ruleSet.id"
                  :value="ruleSet.id"
                >
                  {{ ruleSet.name }}
                </option>
              </select>
              <span class="text-base-content/55 mt-1 line-clamp-1 text-xs">
                {{ selectedRoutingRuleSetName }}
              </span>
            </label>

            <label
              v-if="runtimeSwitchChecked"
              class="form-control"
            >
              <span class="label min-h-0 py-0 pb-1">
                <span class="label-text text-xs font-medium">代理模式</span>
              </span>
              <div
                class="join w-full"
                role="radiogroup"
                aria-label="选择代理模式"
              >
                <input
                  v-for="mode in proxyModeList"
                  :key="mode"
                  class="btn join-item btn-sm flex-1 px-2 text-xs"
                  type="radio"
                  name="home-proxy-mode"
                  :value="mode"
                  :aria-label="proxyModeLabel(mode)"
                  :checked="currentProxyMode === mode"
                  :disabled="proxyModeUpdating"
                  @change="handleProxyModeChange(mode)"
                />
              </div>
              <span class="text-base-content/55 mt-1 truncate text-xs">
                当前 {{ proxyModeLabel(currentProxyMode) }}
              </span>
            </label>

            <div
              v-if="isFastProxy"
              class="flex items-center gap-2 self-center"
            >
              <button
                v-if="runtimeSwitchChecked"
                class="btn btn-outline btn-sm"
                :disabled="runtimeAction !== null"
                title="重启"
                aria-label="重启运行时"
                @click="runRuntimeAction('restart')"
              >
                <ArrowPathIcon
                  class="h-4 w-4"
                  :class="runtimeAction === 'restart' && 'animate-spin'"
                />
                重启
              </button>
              <button
                v-if="runtimeSwitchChecked && pendingRestart"
                class="btn btn-primary btn-sm"
                :disabled="runtimeAction !== null"
                title="应用并重启"
                aria-label="应用配置并重启运行时"
                @click="runRuntimeAction('restart-and-apply')"
              >
                <CheckCircleIcon
                  v-if="runtimeAction !== 'restart-and-apply'"
                  class="h-4 w-4"
                />
                <ArrowPathIcon
                  v-else
                  class="h-4 w-4 animate-spin"
                />
                应用重启
              </button>
            </div>
          </div>

          <div
            v-if="!isFastProxy"
            class="border-base-300 bg-base-200/45 mt-5 rounded-lg border p-4"
          >
            <div class="text-sm font-medium">当前后端仍使用控制器模式。</div>
            <div class="text-base-content/60 mt-1 text-sm">
              首页会保留旧的代理与监控入口，不显示 FastProxy 仓库操作。
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                class="btn btn-primary btn-sm"
                @click="router.push({ name: ROUTE_NAME.proxies })"
              >
                {{ $t('proxies') }}
              </button>
              <button
                class="btn btn-outline btn-sm"
                @click="router.push({ name: ROUTE_NAME.setup })"
              >
                {{ $t('setup') }}
              </button>
            </div>
          </div>

          <p
            v-if="runtimeError"
            class="text-error mt-4 text-sm"
          >
            {{ runtimeError }}
          </p>
        </div>

        <aside class="border-base-300 bg-base-100 rounded-xl border p-3 shadow-sm sm:p-4">
          <h2 class="text-base font-semibold">{{ statusTitle }}</h2>

          <template v-if="isFastProxy">
            <dl class="mt-3 grid gap-x-3 gap-y-2 text-sm sm:grid-cols-[4.5rem_minmax(0,1fr)]">
              <dt class="text-base-content/50 text-xs font-medium">数据目录</dt>
              <dd class="min-w-0 truncate font-medium">{{ bootstrap?.dataDir || '-' }}</dd>

              <dt class="text-base-content/50 text-xs font-medium">路由规则</dt>
              <dd class="min-w-0 truncate font-medium">
                {{ selectedRoutingRuleSetName }}
                <span class="text-base-content/50 font-normal">
                  / {{ routingRuleSets.length }} 个可用
                </span>
              </dd>
            </dl>

            <div class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-for="stat in repositoryStats"
                :key="stat.label"
                class="badge badge-outline h-6 gap-0.5 px-1.5 text-[11px]"
              >
                <span class="text-base-content/55">{{ stat.label }}</span>
                <span class="font-semibold">{{ stat.value }}</span>
              </span>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                class="btn btn-primary btn-sm"
                @click="router.push({ name: ROUTE_NAME.configManagement })"
              >
                {{ $t('configManagement') }}
              </button>
              <button
                class="btn btn-outline btn-sm"
                @click="router.push({ name: ROUTE_NAME.configSubscriptions })"
              >
                {{ $t('configSubscriptions') }}
              </button>
              <button
                class="btn btn-ghost btn-sm"
                @click="router.push({ name: ROUTE_NAME.kernelManagement })"
              >
                {{ $t('kernelManagement') }}
              </button>
            </div>
          </template>
        </aside>
      </section>

      <section class="border-base-300 bg-base-100 rounded-xl border p-4 shadow-sm sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">运行概览</h2>
            <div class="text-base-content/55 mt-1 text-sm">
              连接、流量和拓扑卡片已经并入首页，作为统一的运行面板。
            </div>
          </div>

          <button
            class="btn btn-outline btn-sm"
            @click="showOverviewCardSettingsDialog = true"
          >
            <Cog6ToothIcon class="h-4 w-4" />
            卡片设置
          </button>
        </div>

        <div class="mt-5 flex flex-col gap-3">
          <component
            v-for="item in visibleOverviewCards"
            :key="item.card"
            :is="overviewCardComponents[item.card]"
          />
        </div>
      </section>

      <ConnectionStatsCard v-if="showConnectionStatsCard" />
    </main>

    <OverviewCardSettingsDialog v-model="showOverviewCardSettingsDialog" />
  </div>
</template>

<script setup lang="ts">
import OverviewCardSettingsDialog from '@/components/overview/OverviewCardSettingsDialog.vue'
import ChartsCard from '@/components/overview/ChartsCard.vue'
import ConnectionStatsCard from '@/components/overview/ConnectionStatsCard.vue'
import NetworkCard from '@/components/overview/NetworkCard.vue'
import ProviderTrafficOverview from '@/components/overview/ProviderTrafficOverview.vue'
import RuleHitCountCard from '@/components/overview/RuleHitCountCard.vue'
import TopologyCharts from '@/components/overview/TopologyCharts.vue'
import { disconnectByIdAPI, isSingBox } from '@/api'
import { OVERVIEW_CARD, ROUTE_NAME } from '@/constant'
import { showNotification } from '@/helper/notification'
import { configs, fetchConfigs, updateConfigs } from '@/store/config'
import { activeConnections } from '@/store/connections'
import {
  fastProxyBootstrap,
  fastProxyRepository,
  fastProxyRoutingRuleSets,
  fastProxyRuntimeStatus,
  fastProxySelectedCore,
  fastProxySelectedCoreVersionText,
  fastProxySelectedRoutingRuleSetIds,
  loadFastProxyCoreInventory,
  loadFastProxyWorkspace,
  runFastProxyRuntimeLifecycle,
  selectFastProxyRoutingRuleSet,
  selectFastProxyRuntimeCore,
} from '@/store/fastproxyRepository'
import { initRuntimePanelData, stopRuntimePanelData } from '@/store/runtimePanel'
import { automaticDisconnection, overviewCardOrder } from '@/store/settings'
import { activeBackendFlavor } from '@/store/setup'
import type { FastProxyCoreId } from '@/types/fastproxy'
import { ArrowPathIcon, CheckCircleIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline'
import type { Component } from 'vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const runtimeAction = ref<'start' | 'stop' | 'restart' | 'restart-and-apply' | null>(null)
const runtimeError = ref('')
const proxyModeUpdating = ref(false)
const showOverviewCardSettingsDialog = ref(false)
const isFastProxy = computed(() => activeBackendFlavor.value === 'fastproxy')
const bootstrap = computed(() => fastProxyBootstrap.value)
const selectedCore = computed(() => fastProxySelectedCore.value)
const selectedCoreVersionText = computed(() => fastProxySelectedCoreVersionText.value)
const runningCore = computed(() => fastProxyRuntimeStatus.value?.core || '')
const runtimeStateLabel = computed(() => fastProxyRuntimeStatus.value?.state || 'stopped')
const runtimeSwitchChecked = computed(() =>
  ['running', 'starting'].includes(runtimeStateLabel.value),
)
const pendingCoreSwitch = computed(() =>
  Boolean(runningCore.value && runningCore.value !== selectedCore.value),
)
const pendingRestart = computed(
  () => Boolean(fastProxyRuntimeStatus.value?.pendingRestart) || pendingCoreSwitch.value,
)
const defaultProxyModes = ['direct', 'rule', 'global']
const currentProxyMode = computed(() => configs.value.mode || 'rule')
const proxyModeList = computed(() => {
  const configuredModes = configs.value?.['mode-list']?.length
    ? configs.value['mode-list']
    : configs.value?.modes

  return configuredModes?.length ? configuredModes : defaultProxyModes
})
const shouldTranslateProxyModes = computed(() =>
  proxyModeList.value.every((mode) => defaultProxyModes.includes(mode.toLowerCase())),
)
const proxyModeLabel = (mode: string) => {
  if (!shouldTranslateProxyModes.value) return mode
  if (mode.toLowerCase() === 'direct') return '直连'
  if (mode.toLowerCase() === 'rule') return '规则'
  if (mode.toLowerCase() === 'global') return '全局'
  return mode
}
const isRoutingRuleSetSupported = (supportedCores?: FastProxyCoreId[]) => {
  return !supportedCores?.length || supportedCores.includes(selectedCore.value)
}
const routingRuleSets = computed(() =>
  fastProxyRoutingRuleSets.value.filter((ruleSet) =>
    isRoutingRuleSetSupported(ruleSet.supportedCores),
  ),
)
const activeRoutingRuleSetId = computed(() => fastProxySelectedRoutingRuleSetIds.value[0] || '')
const activeRoutingRuleSetSupported = computed(() => {
  if (!activeRoutingRuleSetId.value) return false
  const activeRuleSet = fastProxyRoutingRuleSets.value.find(
    (ruleSet) => ruleSet.id === activeRoutingRuleSetId.value,
  )
  return Boolean(activeRuleSet && isRoutingRuleSetSupported(activeRuleSet.supportedCores))
})
const defaultRoutingRuleSetId = computed(() => routingRuleSets.value[0]?.id || '')
const selectedRoutingRuleSetId = computed(() =>
  activeRoutingRuleSetSupported.value
    ? activeRoutingRuleSetId.value
    : defaultRoutingRuleSetId.value,
)
const selectedRoutingRuleSetName = computed(() => {
  if (!selectedRoutingRuleSetId.value) return '暂无可用路由规则集'
  return (
    routingRuleSets.value.find((ruleSet) => ruleSet.id === selectedRoutingRuleSetId.value)?.name ||
    '已绑定的路由规则集不在当前仓库中'
  )
})
const repositoryStats = computed(() => {
  const repository = fastProxyRepository.value
  return [
    { label: '订阅', value: repository?.subscriptions.length ?? 0 },
    { label: '节点集', value: repository?.nodeSets.length ?? 0 },
    { label: '路由规则', value: repository?.routingRuleSets.length ?? 0 },
    { label: '规则源', value: repository?.ruleSourceRepositories.length ?? 0 },
  ]
})

const statusTitle = computed(() => (isFastProxy.value ? '仓库概览' : '控制器状态'))
const showConnectionStatsCard = computed(() =>
  overviewCardOrder.value.some(
    (card) => card.card === OVERVIEW_CARD.ConnectionHistory && card.visible,
  ),
)
const visibleOverviewCards = computed(() =>
  overviewCardOrder.value.filter(
    (card) => card.visible && card.card !== OVERVIEW_CARD.ConnectionHistory,
  ),
)
const overviewCardComponents: Partial<Record<OVERVIEW_CARD, Component>> = {
  [OVERVIEW_CARD.ChartsCard]: ChartsCard,
  [OVERVIEW_CARD.NetworkCard]: NetworkCard,
  [OVERVIEW_CARD.ProviderTrafficOverview]: ProviderTrafficOverview,
  [OVERVIEW_CARD.TopologyCharts]: TopologyCharts,
  [OVERVIEW_CARD.RuleHitCountCard]: RuleHitCountCard,
}

const handleCoreChange = async (event: Event) => {
  const core = (event.target as HTMLSelectElement).value as FastProxyCoreId
  runtimeAction.value = 'restart-and-apply'
  runtimeError.value = ''
  try {
    await selectFastProxyRuntimeCore(core)
    await loadFastProxyCoreInventory()
    showNotification({
      content: `已选择 ${core}，应用并重启后生效`,
      type: 'alert-success',
    })
  } catch (error) {
    runtimeError.value = error instanceof Error ? error.message : '切换内核失败'
    showNotification({ content: runtimeError.value, type: 'alert-error' })
  } finally {
    runtimeAction.value = null
  }
}

const handleRoutingRuleSetChange = async (event: Event) => {
  const ruleSetId = (event.target as HTMLSelectElement).value
  if (!ruleSetId) return

  runtimeAction.value = 'restart-and-apply'
  runtimeError.value = ''
  try {
    await selectFastProxyRoutingRuleSet(ruleSetId)
    showNotification({
      content: '路由规则已选择，应用并重启后生效',
      type: 'alert-success',
    })
  } catch (error) {
    runtimeError.value = error instanceof Error ? error.message : '选择路由规则失败'
    showNotification({ content: runtimeError.value, type: 'alert-error' })
  } finally {
    runtimeAction.value = null
  }
}

const handleRuntimeToggle = async (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  await runRuntimeAction(checked ? 'start' : 'stop')
}

const handleProxyModeChange = async (mode: string) => {
  if ((configs.value.mode || 'rule') === mode || proxyModeUpdating.value) return

  const previousMode = configs.value.mode
  proxyModeUpdating.value = true
  runtimeError.value = ''
  configs.value = { ...configs.value, mode }
  try {
    await updateConfigs({ mode })
    if (isSingBox.value && automaticDisconnection.value) {
      activeConnections.value.forEach((connection) => {
        if (connection.rule.includes('clash_mode')) {
          disconnectByIdAPI(connection.id)
        }
      })
    }
    showNotification({ content: `已切换到${proxyModeLabel(mode)}模式`, type: 'alert-success' })
  } catch (error) {
    configs.value = { ...configs.value, mode: previousMode }
    runtimeError.value = error instanceof Error ? error.message : '切换代理模式失败'
    showNotification({ content: runtimeError.value, type: 'alert-error' })
  } finally {
    proxyModeUpdating.value = false
  }
}

const loadRuntimeConfigs = async () => {
  if (!runtimeSwitchChecked.value) return
  await fetchConfigs().catch(() => undefined)
}

const runRuntimeAction = async (action: 'start' | 'stop' | 'restart' | 'restart-and-apply') => {
  runtimeAction.value = action
  runtimeError.value = ''
  try {
    const status = await runFastProxyRuntimeLifecycle(action)
    showNotification({ content: runtimeActionLabel(action) + '已完成', type: 'alert-success' })
    await Promise.all([loadFastProxyWorkspace(), loadFastProxyCoreInventory()])
    if (status.state === 'running') {
      await loadRuntimeConfigs()
      await initRuntimePanelData()
    } else {
      stopRuntimePanelData()
    }
  } catch (error) {
    runtimeError.value =
      error instanceof Error ? error.message : runtimeActionLabel(action) + '失败'
    showNotification({ content: runtimeError.value, type: 'alert-error' })
    await loadFastProxyWorkspace().catch(() => undefined)
  } finally {
    runtimeAction.value = null
  }
}

const runtimeActionLabel = (action: 'start' | 'stop' | 'restart' | 'restart-and-apply') => {
  if (action === 'start') return '启动'
  if (action === 'stop') return '停止'
  if (action === 'restart') return '重启'
  return '应用并重启'
}

const defaultRoutingRuleSetSyncing = ref(false)

const ensureDefaultRoutingRuleSet = async () => {
  if (
    !isFastProxy.value ||
    defaultRoutingRuleSetSyncing.value ||
    activeRoutingRuleSetSupported.value ||
    !defaultRoutingRuleSetId.value
  ) {
    return
  }

  defaultRoutingRuleSetSyncing.value = true
  try {
    await selectFastProxyRoutingRuleSet(defaultRoutingRuleSetId.value)
  } catch (error) {
    runtimeError.value = error instanceof Error ? error.message : '选择默认路由规则失败'
  } finally {
    defaultRoutingRuleSetSyncing.value = false
  }
}

watch(
  [isFastProxy, activeRoutingRuleSetId, activeRoutingRuleSetSupported, defaultRoutingRuleSetId],
  () => {
    ensureDefaultRoutingRuleSet()
  },
  { immediate: true },
)

watch(runtimeSwitchChecked, () => {
  loadRuntimeConfigs()
})

onMounted(async () => {
  if (isFastProxy.value) {
    await Promise.all([loadFastProxyWorkspace(), loadFastProxyCoreInventory()])
    await ensureDefaultRoutingRuleSet()
    await loadRuntimeConfigs()
  }
})
</script>
