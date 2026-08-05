// 组装层 · 后端判别与能力表。
//
// 这里只有两条正交的判别轴,且**仅限 assembly 层内部使用**
//(components / views / composables 由 eslint no-restricted-imports 禁止导入):
//
//   channel —— 用户配置的连接通道(activeBackend.type)。确定性事实,同步可知,
//              决定走 sing-box API(gRPC)还是 Clash REST/WS。
//   core    —— 运行时内核品牌。靠 /version 字符串嗅探得来,是启发式猜测,
//              可能误判(分支核 / 兼容核),且拉取完成前为 'unknown'。
//
// 两轴交叉出四种实际在用的 API 形态:
//   A. channel=clash   + core=mihomo   mihomo 的 Clash API
//   B. channel=clash   + core=singbox  sing-box 的 Clash 兼容 API(端点子集 + 少量专属端点)
//   C. channel=clash   + core=honk     honk 的 Clash 兼容 API(又一个端点子集)
//   D. channel=singbox + core=singbox  sing-box API(gRPC)
//
// 能力表据此分两类,一律通过 can() 读取:
//   hard —— 由 channel / apiVersion 决定。确定事实,任何情况下都掰不开。
//   soft —— 由 core 决定。因探测是启发式,允许用户用 displayAllFeatures 强制掰开
//           (提示文案承诺:fork 版内核可能支持官方版没有的功能)。
//
// 注意:能凭响应数据自证的差异(如 rules 开关端点由 rule.uuid 决定、smart 由
// proxy.type 决定)不进此表,就近放在对应的 assembly 子模块里 —— 数据比版本
// 字符串可靠,不该被降级成全局猜测。

import { probeClashChannel } from '@/api/clash'
import { getSingboxUrlFromBackend } from '@/helper/utils'
import { displayAllFeatures } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import type { Backend } from '@/types'
import { computed, ref } from 'vue'

// usbip 需要 sing-box gRPC API v2(ProvideUSBDevices 流)
const USBIP_MIN_API_VERSION = 2
// OpenVPN 需要 sing-box gRPC API v3(SubscribeOpenVPNStatus 流)
const OPENVPN_MIN_API_VERSION = 3

export enum Channel {
  Clash = 'clash',
  Singbox = 'singbox',
}

export enum Core {
  Mihomo = 'mihomo',
  Singbox = 'singbox',
  Honk = 'honk',
  Unknown = 'unknown',
}

export const channel = computed<Channel>(() =>
  activeBackend.value?.type === 'singbox' ? Channel.Singbox : Channel.Clash,
)

// core / apiVersion 由 assembly/version.ts 在探测 /version 后写入,
// 后端切换时先重置为未知,避免沿用上一个后端的结论。
export const core = ref<Core>(Core.Unknown)
export const apiVersion = ref(0)

export const resetCore = () => {
  core.value = Core.Unknown
  apiVersion.value = 0
}

// displayAllFeatures 的适用范围:Clash 通道上跑着非 mihomo 内核(sing-box / honk)时。
// 该开关的语义是「我用的 fork 版内核也支持这些 mihomo 扩展端点,先显示出来」——
// 只有在 Clash 通道上,那些端点才有可能存在。sing-box API(gRPC)通道上它们压根不是
// 同一套协议,掰开只会打出必然失败的请求,所以那里既不显示开关,存量的 true 也不生效。
// core 未探测出结论(Unknown)时不掰,免得凭空点亮一堆按钮。
const isNonMihomoClashCore = computed(
  () =>
    channel.value === Channel.Clash && (core.value === Core.Singbox || core.value === Core.Honk),
)

const isForkCoreOverride = computed(() => isNonMihomoClashCore.value && displayAllFeatures.value)

// 开关自身的可见性与其生效范围保持一致。
export const showDisplayAllFeatures = computed(
  () => !!activeBackend.value && isNonMihomoClashCore.value,
)

const hard = computed(() => {
  const clash = !!activeBackend.value && channel.value === Channel.Clash
  const singbox = !!activeBackend.value && channel.value === Channel.Singbox

  return {
    rules: clash,
    dnsQuery: clash,
    dnsFlush: clash,
    fakeIPFlush: clash,
    coreActions: clash,
    dashboardUpgrade: clash,

    tools: singbox,
    goroutines: singbox,
    startedAt: singbox,
    usbip: singbox && apiVersion.value >= USBIP_MIN_API_VERSION,
    openvpn: singbox && apiVersion.value >= OPENVPN_MIN_API_VERSION,
  }
})

const soft = computed(() => {
  const singbox = core.value === Core.Singbox
  const mihomo = core.value === Core.Mihomo
  const honk = core.value === Core.Honk
  const mihomoOrForkCore = mihomo || isForkCoreOverride.value

  return {
    // ---------- mihomo 内核侧 ----------
    coreUpgrade: mihomoOrForkCore,
    coreRestart: mihomoOrForkCore,
    reloadConfigs: mihomoOrForkCore,
    updateConfigs: mihomoOrForkCore,
    updateGeoDatabase: mihomoOrForkCore,
    coreUpdateCheck: mihomoOrForkCore,
    // /storage/zashboard 设置同步,mihomo 扩展
    syncSettings: mihomoOrForkCore,
    independentLatency: mihomoOrForkCore,
    // ports / tun / allow-lan 等 PATCH /configs 配置块。
    configPatch: mihomo,

    // ---------- sing-box 内核侧 ----------
    // 自定义全局节点
    customGlobalNode: singbox,
    // sing-box 日志 payload 带 "[type]:" 前缀,可据此做类型分面过滤
    logTypeFilter: singbox,
    // sing-box 日志以 "[连接id 耗时]" 开头,可据此从日志跳到对应连接
    logConnectionDetail: singbox,
    // sing-box 切换模式后需要主动断开命中 clash_mode 规则的连接
    disconnectOnModeChange: singbox,

    // ---------- 日志级别集合 ----------
    // /logs?level= 传了内核不认的级别会被 400 掉,WS 随后陷入无限重连,
    // 所以按内核各自支持的取值逐档点亮,拼装见 assembly/logs。
    // trace:sing-box 与 honk 有,mihomo 没有
    traceLogLevel: singbox || honk,
    // fatal / panic:仅 sing-box
    extraLogLevels: singbox,
  }
})

type HardCaps = typeof hard.value
type SoftCaps = typeof soft.value

export type HardCap = keyof HardCaps
export type SoftCap = keyof SoftCaps
export type Cap = HardCap | SoftCap

export const can = (cap: Cap): boolean => {
  if (!activeBackend.value) return false

  const hardCaps = hard.value

  if (cap in hardCaps) return hardCaps[cap as HardCap]

  // displayAllFeatures 的覆盖已在 soft 表内按行决定,这里只查表。
  return soft.value[cap as SoftCap]
}

// 后端连通性探测(供 Setup / EditBackend 测试连接使用)。
export const isSingboxChannelAvailable = (backend: Backend, timeout: number = 10000) => {
  if (!getSingboxUrlFromBackend(backend)) return Promise.resolve(false)
  return import('@/api/singbox/client').then((m) => m.probeSingboxChannel(backend, timeout))
}

export const isBackendAvailable = (backend: Backend, timeout: number = 10000) =>
  backend.type === 'singbox'
    ? isSingboxChannelAvailable(backend, timeout)
    : probeClashChannel(backend, timeout)
