// 后端维护动作的单一来源。
//
// 同一批动作现在有两个入口:设置页的「后端」分组,和侧边栏后端菜单里的二级菜单。
// 各写一遍必然两边跑偏 —— 能力门控、进行中状态、成功提示都得对齐,所以收成一张表。
//
// 进行中状态放在模块级而不是组件里:两个入口打的是同一个后端,从侧边栏点了重启,
// 设置页那颗按钮也该是转的,更不该被并发点第二次。
//
// 需要先收集参数的两个动作(升级内核、更新配置)走弹窗。弹窗的开关也在这里,
// 弹窗本体挂在 App.vue —— 侧边栏常驻但设置页不常驻,挂在设置页里侧边栏就拉不起来。
import { can } from '@/assembly/backend'
import {
  fetchConfigs,
  flushDNSCacheAPI,
  flushFakeIPAPI,
  reloadConfigsAPI,
  suspendServiceAPI,
  updateGeoDataAPI,
} from '@/assembly/config'
import { fetchProxies, flushSmartGroupWeightsAPI, hasSmartGroup } from '@/assembly/proxies'
import { fetchRules } from '@/assembly/rules'
import { restartCoreAPI } from '@/assembly/version'
import { isSettingHidden } from '@/composables/settings'
import { BACKEND_ITEM_KEYS } from '@/config/settingsItems'
import { showConfirmDialog } from '@/helper/confirmDialog'
import { notifyActionPending, showNotification } from '@/helper/notification'
import { notifyRequestError } from '@/helper/requestError'
import { i18n } from '@/i18n'
import { activeBackend } from '@/store/setup'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  ArrowUpCircleIcon,
  PauseCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref, type Component, type Ref } from 'vue'

const k = BACKEND_ITEM_KEYS

export type BackendAction = {
  /** 该动作在设置项显隐配置里的 key,两个入口共用同一份配置 */
  key: string
  /** i18n key */
  label: string
  icon: Component
  /** 请求在飞 —— 按钮转圈并拒绝第二次点击 */
  running: boolean
  /** true 表示这个动作会拉起弹窗,菜单该让位 */
  opensModal: boolean
  run: () => void
}

export const showUpgradeCoreModal = ref(false)
export const showUpdateConfigModal = ref(false)

const reloadAll = () => {
  fetchConfigs()
  fetchProxies()
  // 通道没有规则能力时(dae)这个请求打出去必然 404。
  if (can('rules')) fetchRules()
}

const isCoreRestarting = ref(false)
const isConfigReloading = ref(false)
const isGeoUpdating = ref(false)
const isDNSCacheFlushing = ref(false)
const isFakeIPFlushing = ref(false)
const isSmartWeightsFlushing = ref(false)
const isServiceSuspending = ref(false)

const runOnce = async (
  /** 动作名的 i18n key,用来写「执行中」那条提示 */
  label: string,
  running: Ref<boolean>,
  request: () => Promise<unknown>,
  successMessage: string,
  afterSuccess?: () => void,
  /** 会打断代理服务的动作先问一句(i18n key)。确认弹窗的遮罩盖住了两处入口,不怕重入。 */
  confirm?: { title: string; message: string },
) => {
  if (running.value) return
  if (confirm) {
    const { confirmed } = await showConfirmDialog({
      title: i18n.global.t(confirm.title),
      message: i18n.global.t(confirm.message),
    })
    if (!confirmed) return
  }
  running.value = true
  // 清缓存这类动作几十毫秒就回来,按钮上的转圈只是闪一下 —— 先弹提示占住位置,
  // 结果出来再用同一个 key 顶掉它。
  const notifyKey = notifyActionPending(label)
  try {
    await request()
    afterSuccess?.()
    showNotification({
      key: notifyKey,
      content: successMessage,
      type: 'alert-success',
    })
  } catch (e) {
    notifyRequestError(e, notifyKey)
  } finally {
    running.value = false
  }
}

/** 当前后端/内核下真正能执行的动作,顺序即两处入口的展示顺序 */
export const backendActions = computed<BackendAction[]>(() => {
  if (!activeBackend.value) return []

  const actions: BackendAction[] = []

  if (can('coreUpgrade') && !activeBackend.value?.disableUpgradeCore) {
    actions.push({
      key: k.upgradeCore,
      label: 'upgradeCore',
      icon: ArrowUpCircleIcon,
      running: false,
      opensModal: true,
      run: () => (showUpgradeCoreModal.value = true),
    })
  }

  if (can('coreRestart')) {
    actions.push({
      key: k.restartCore,
      label: 'restartCore',
      icon: ArrowPathRoundedSquareIcon,
      running: isCoreRestarting.value,
      opensModal: false,
      // 内核重启完才有东西可拉,立刻打过去只会撞在重启的空档上。
      run: () =>
        runOnce(
          'restartCore',
          isCoreRestarting,
          restartCoreAPI,
          'restartCoreSuccess',
          () => setTimeout(reloadAll, 500),
          { title: 'restartCore', message: 'restartCoreConfirm' },
        ),
    })
  }

  if (can('reloadConfigs')) {
    actions.push({
      key: k.reloadConfigs,
      label: 'reloadConfigs',
      icon: ArrowPathIcon,
      running: isConfigReloading.value,
      opensModal: false,
      // 重载配置不动连接、也不重启内核,代价小到不值得一次确认。
      run: () =>
        runOnce(
          'reloadConfigs',
          isConfigReloading,
          reloadConfigsAPI,
          'reloadConfigsSuccess',
          reloadAll,
        ),
    })
  }

  if (can('updateConfigs')) {
    actions.push({
      key: k.updateConfigs,
      label: 'updateConfigs',
      icon: PencilSquareIcon,
      running: false,
      opensModal: true,
      run: () => (showUpdateConfigModal.value = true),
    })
  }

  if (can('updateGeoDatabase')) {
    actions.push({
      key: k.updateGeoDatabase,
      label: 'updateGeoDatabase',
      icon: ArrowDownTrayIcon,
      running: isGeoUpdating.value,
      opensModal: false,
      run: () =>
        runOnce(
          'updateGeoDatabase',
          isGeoUpdating,
          updateGeoDataAPI,
          'updateGeoSuccess',
          reloadAll,
        ),
    })
  }

  // dae v0.1.0 的 DNS 缓存只能读,没有清空端点;fakeip 更是 Clash 独有的概念。
  if (can('dnsFlush')) {
    actions.push({
      key: k.flushDNSCache,
      label: 'flushDNSCache',
      icon: TrashIcon,
      running: isDNSCacheFlushing.value,
      opensModal: false,
      run: () =>
        runOnce('flushDNSCache', isDNSCacheFlushing, flushDNSCacheAPI, 'flushDNSCacheSuccess'),
    })

    actions.push({
      key: k.flushFakeIP,
      label: 'flushFakeIP',
      icon: TrashIcon,
      running: isFakeIPFlushing.value,
      opensModal: false,
      run: () => runOnce('flushFakeIP', isFakeIPFlushing, flushFakeIPAPI, 'flushFakeIPSuccess'),
    })
  }

  if (can('suspendService')) {
    actions.push({
      key: k.suspendService,
      label: 'suspendService',
      icon: PauseCircleIcon,
      running: isServiceSuspending.value,
      opensModal: false,
      // 暂停会中断代理服务,而且只能从命令行(dae resume)恢复 —— 必须问一句。
      run: () =>
        runOnce(
          'suspendService',
          isServiceSuspending,
          suspendServiceAPI,
          'suspendServiceSuccess',
          undefined,
          { title: 'suspendService', message: 'suspendServiceConfirm' },
        ),
    })
  }

  if (hasSmartGroup.value) {
    actions.push({
      key: k.flushSmartWeights,
      label: 'flushSmartWeights',
      icon: TrashIcon,
      running: isSmartWeightsFlushing.value,
      opensModal: false,
      run: () =>
        runOnce(
          'flushSmartWeights',
          isSmartWeightsFlushing,
          flushSmartGroupWeightsAPI,
          'flushSmartWeightsSuccess',
        ),
    })
  }

  return actions
})

/**
 * 菜单入口用的子集。设置页那边靠 SettingItem 自己过显隐(编辑模式下还要把隐藏项显出来
 * 好让人点回去),菜单里没有编辑模式,直接按用户藏起来的配置扣掉。
 */
export const menuBackendActions = computed(() =>
  backendActions.value.filter((action) => !isSettingHidden(action.key)),
)
