// 组装层 · 后端判别与能力表。
//
// 这里只有两条正交的判别轴,且**仅限 assembly 层内部使用**
//(components / views / composables 由 eslint no-restricted-imports 禁止导入):
//
//   channel —— 用户配置的连接通道(activeBackend.type)。确定性事实,同步可知,
//              决定走 dae 的 REST API 还是 Clash REST/WS。
//   core    —— 运行时内核品牌。靠 /version 字符串嗅探得来,是启发式猜测,
//              可能误判(分支核 / 兼容核),且拉取完成前为 'unknown'。
//
// 两轴交叉出三种实际在用的 API 形态:
//   A. channel=clash + core=mihomo   mihomo 的 Clash API
//   B. channel=clash + core=honk     honk 的 Clash 兼容 API(端点子集)
//   C. channel=dae   + core=unknown  dae 的 REST API(只读监控 + reload/suspend)
//
// 能力表据此分两类,一律通过 can() 读取:
//   hard —— 由 channel 决定。确定事实,任何情况下都掰不开。
//   soft —— 由 core 决定。因探测是启发式,允许用户用 displayAllFeatures 强制掰开
//           (提示文案承诺:fork 版内核可能支持官方版没有的功能)。
//
// 两张表允许出现同名能力(如 reloadConfigs:两条通道各有各的端点),can() 取并集。
// 这么取是安全的,前提是一条不变式:**soft 表每一项都以 core 为条件,而 dae 通道下
// 从不写 core(恒为 Unknown),故软能力对 dae 全表为假** —— 见 assembly/version.ts。
//
// 两条通道都提供的端点不进表:can() 会恒真,徒增一层查表。直接调即可 ——
// 形状不一致的(如 DNS 查询的应答)在 assembly 各域的方言里归一,而不是靠门控。
//
// 注意:能凭响应数据自证的差异(如 rules 开关端点由 rule.uuid 决定、smart 由
// proxy.type 决定)不进此表,就近放在对应的 assembly 子模块里 —— 数据比版本
// 字符串可靠,不该被降级成全局猜测。

import { probeClashChannel } from '@/api/clash'
import { probeDaeChannel } from '@/api/dae'
import type { ProbeResult } from '@/helper/connectivity'
import { displayAllFeatures } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import type { Backend } from '@/types'
import { computed, ref } from 'vue'

export enum Channel {
  Clash = 'clash',
  Dae = 'dae',
}

export enum Core {
  Mihomo = 'mihomo',
  Honk = 'honk',
  Unknown = 'unknown',
}

export const channel = computed<Channel>(() =>
  activeBackend.value?.type === 'dae' ? Channel.Dae : Channel.Clash,
)

// core 由 assembly/version.ts 在探测 /version 后写入,
// 后端切换时先重置为未知,避免沿用上一个后端的结论。
// dae 通道不写它 —— dae 不是 Clash 内核,拿版本串去猜品牌毫无意义。
export const core = ref<Core>(Core.Unknown)

export const resetCore = () => {
  core.value = Core.Unknown
}

// displayAllFeatures 的适用范围:Clash 通道上跑着非 mihomo 内核(honk)时。
// 该开关的语义是「我用的 fork 版内核也支持这些 mihomo 扩展端点,先显示出来」——
// 只有在 Clash 通道上,那些端点才有可能存在。dae 通道上它们压根不是同一套协议,
// 掰开只会打出必然失败的请求,所以那里既不显示开关,存量的 true 也不生效。
// core 未探测出结论(Unknown)时不掰,免得凭空点亮一堆按钮。
const isNonMihomoCore = computed(() => channel.value === Channel.Clash && core.value === Core.Honk)

const isForkCoreOverride = computed(() => isNonMihomoCore.value && displayAllFeatures.value)

// 开关自身的可见性与其生效范围保持一致。
export const showDisplayAllFeatures = computed(() => !!activeBackend.value && isNonMihomoCore.value)

// 硬能力 —— 由 channel 决定。掰不开,也不该掰:通道决定的是协议,不是版本差异。
const hard = computed(() => {
  const clash = channel.value === Channel.Clash
  const dae = channel.value === Channel.Dae

  return {
    // ---------- Clash 通道独有 ----------
    // /rules 与 /providers/rules。dae 的路由规则不经 API 暴露,整条路由隐藏。
    rules: clash,
    // /providers/proxies 与订阅信息
    proxyProviders: clash,
    // PUT /proxies/{group}。dae 的组策略写在配置文件里,API 只读。
    proxySelect: clash,
    // 单节点 / 单组测速。dae 只有全量的 POST /api/nodes/check,没有按目标测的端点。
    proxyLatencyTest: clash,
    // configs.mode(rule / global / direct)
    modeSwitch: clash,
    // /logs WS。dae 没有日志流,整条路由隐藏。
    logStream: clash,
    // 断开单条 / 全部连接。dae 只读连接表。
    connectionActions: clash,
    // /cache/dns/flush 与 /cache/fakeip/flush。dae v0.1.0 的 DNS 缓存只能读,
    // 没有清空端点 —— 这是端点缺失,不是形状差异,所以进表。
    dnsFlush: clash,

    // ---------- dae 通道独有 ----------
    // POST /api/suspend。会中断代理服务,调用点需要二次确认。
    suspendService: dae,
    // POST /api/reload。Clash 侧的同名能力由 soft 表按内核给出。
    reloadConfigs: dae,
    // GET /api/dns/cache。Clash 侧没有读取 DNS 缓存的端点,只有清空。
    dnsCache: dae,
  }
})

const soft = computed(() => {
  const mihomo = core.value === Core.Mihomo
  const honk = core.value === Core.Honk
  const mihomoOrForkCore = mihomo || isForkCoreOverride.value

  return {
    // ---------- mihomo 内核侧 ----------
    coreUpgrade: mihomoOrForkCore,
    coreRestart: mihomoOrForkCore,
    // 面板自升级 /upgrade/ui。honk 没有任何 /upgrade* 路由。
    dashboardUpgrade: mihomoOrForkCore,
    reloadConfigs: mihomoOrForkCore,
    updateConfigs: mihomoOrForkCore,
    updateGeoDatabase: mihomoOrForkCore,
    // /storage/zashboard 设置同步,mihomo 扩展
    syncSettings: mihomoOrForkCore,
    independentLatency: mihomoOrForkCore,
    coreUpdateCheck: mihomo,
    // ports / tun / allow-lan 等 PATCH /configs 配置块。
    configPatch: mihomo,

    // ---------- 日志级别集合 ----------
    // /logs?level= 传了内核不认的级别会被 400 掉,WS 随后陷入无限重连,
    // 所以按内核各自支持的取值逐档点亮,拼装见 assembly/logs。
    // trace:honk 有,mihomo 没有
    traceLogLevel: honk,
    // silent:mihomo 有,honk 没有
    silentLogLevel: mihomo,

    // ---------- honk 内核侧 ----------
    // GET /stats:honk 独有的用户态运行时快照。方向与上面那批相反,
    // 故不接 displayAllFeatures —— 那个开关说的是「我的 fork 也支持 mihomo 扩展」。
    runtimeStats: honk,
  }
})

export type HardCap = keyof typeof hard.value
export type SoftCap = keyof typeof soft.value
export type Cap = HardCap | SoftCap

export const can = (cap: Cap): boolean => {
  if (!activeBackend.value) return false

  // 两表取并集:一个能力可能两条通道各有各的端点(reloadConfigs)。
  // 安全性来自文件顶部那条不变式 —— soft 表对 dae 全表为假,所以 hard 表里
  // 写 `clash` 的那些能力不会被 soft 表偷偷点亮。
  // displayAllFeatures 的覆盖已在 soft 表内按行决定,这里只查表。
  const hardCaps = hard.value as Partial<Record<Cap, boolean>>
  const softCaps = soft.value as Partial<Record<Cap, boolean>>

  return (hardCaps[cap] ?? false) || (softCaps[cap] ?? false)
}

// 后端连通性探测(供 Setup / EditBackend / 连接失败页使用)。
// 按通道选对应的探测,结果形状统一成 ProbeResult:成功带耗时,失败带可诊断的分类,
// 由 helper/connectivity 的 describeProbeFailure 翻译成给用户看的一句话。
export const probeBackend = async (
  backend: Backend,
  timeout: number = 10000,
  signal?: AbortSignal,
): Promise<ProbeResult> => {
  if (backend.type === 'dae') {
    return probeDaeChannel(backend, timeout, signal)
  }
  return probeClashChannel(backend, timeout, signal)
}

export const isBackendAvailable = (backend: Backend, timeout: number = 10000) =>
  probeBackend(backend, timeout).then((result) => result.ok)
