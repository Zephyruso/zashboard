import { useStorage } from '@/helper/storage'
import type { Backend, BackendType } from '@/types'
import { isEqual, omit } from 'lodash'
import { v4 as uuid } from 'uuid'
import { computed, ref } from 'vue'
import { sourceIPLabelList } from './settings'

// 旧版本的后端结构:没有 `type` 字段;更早的版本还把 sing-box 作为附属通道
// `singboxChannel` 挂在 clash 后端上,后来才拆成独立的 `type: 'singbox'` 条目。
// sing-box 支持已移除,两种形态都直接丢弃。
type LegacyBackend = Omit<Partial<Backend>, 'type'> & { type?: string; singboxChannel?: unknown }

const KNOWN_BACKEND_TYPES: BackendType[] = ['clash', 'dae']

const isKnownBackendType = (type?: string): type is BackendType =>
  KNOWN_BACKEND_TYPES.includes(type as BackendType)

const isLegacyBackend = (item: LegacyBackend) =>
  !isKnownBackendType(item.type) || 'singboxChannel' in item

// 一次性迁移:补全 `type`,丢掉 singboxChannel 附属通道与 sing-box 后端条目。
//
// 注意逐条判断 —— 整表改写会把合法的 dae 条目一起按成 clash:这个函数是在
// 「列表里有任意一条旧记录」时对整张表跑的。
const migrateBackendList = (list: LegacyBackend[]): Backend[] =>
  list
    .filter((item) => item.type !== 'singbox')
    .map((item) => ({
      ...(omit(item, 'singboxChannel') as Backend),
      type: isKnownBackendType(item.type) ? item.type : 'clash',
    }))

export const backendList = useStorage<Backend[]>('setup/api-list', [])

if ((backendList.value as LegacyBackend[]).some(isLegacyBackend)) {
  backendList.value = migrateBackendList(backendList.value as LegacyBackend[])
}

export const activeUuid = useStorage<string>('setup/active-uuid', '')

// 被丢弃的 sing-box 后端可能正是当前激活项,留着会让整个面板对着一个不存在的
// 后端空转。清掉 uuid 后 activeBackend 为空,路由守卫会把用户送回 Setup 页。
if (activeUuid.value && !backendList.value.some((item) => item.uuid === activeUuid.value)) {
  activeUuid.value = ''
}
export const activeBackend = computed(() =>
  backendList.value.find((backend) => backend.uuid === activeUuid.value),
)

// 切换后端的唯一写入口。切换本身只是改一个 uuid,但后续的一切(会话重启、探测、
// 提示)都挂在 activeBackend 的 watch 上,散着写 activeUuid 就没有地方能收口。
export const setActiveBackend = (uuid: string) => {
  activeUuid.value = uuid
}

// 后端管理面板的形态。null = 关闭;list / create / edit 是同一个面板的三种视图,
// 而不是三个弹窗 —— 从列表点进编辑、保存后退回列表,都不该有弹窗开合的闪烁。
//
// 放在 store 而不是 composable:api 层遇到 401 要把编辑框直接摆到用户面前,而按
// eslint.config.ts 的分层约束,api 层只允许依赖 store/setup。
export type BackendManagerView =
  { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; uuid: string }

export const backendManagerView = ref<BackendManagerView | null>(null)

export const openBackendManager = (view: BackendManagerView = { mode: 'list' }) => {
  backendManagerView.value = view
}

export const closeBackendManager = () => {
  backendManagerView.value = null
}

export const switchActiveBackend = (direction: 1 | -1) => {
  if (backendList.value.length < 2) {
    return null
  }

  const currentIndex = backendList.value.findIndex((backend) => backend.uuid === activeUuid.value)
  const startIndex = currentIndex >= 0 ? currentIndex : 0
  const nextIndex = (startIndex + direction + backendList.value.length) % backendList.value.length

  const nextBackend = backendList.value[nextIndex]

  if (!nextBackend) {
    return null
  }

  setActiveBackend(nextBackend.uuid)
  return nextBackend
}

export const addBackend = (backend: Omit<Backend, 'uuid'>) => {
  const currentEnd = backendList.value.find((end) => {
    return isEqual(omit(end, 'uuid'), backend)
  })

  if (currentEnd) {
    setActiveBackend(currentEnd.uuid)
    return currentEnd.uuid
  }

  const id = uuid()

  backendList.value.push({
    ...backend,
    uuid: id,
  })
  setActiveBackend(id)
  return id
}

export const updateBackend = (uuid: string, backend: Omit<Backend, 'uuid'>) => {
  const index = backendList.value.findIndex((end) => end.uuid === uuid)
  if (index !== -1) {
    backendList.value[index] = {
      ...backend,
      uuid,
    }
  }
}

export const removeBackend = (uuid: string) => {
  const wasActive = activeUuid.value === uuid

  backendList.value = backendList.value.filter((end) => end.uuid !== uuid)

  // 删掉的正是当前后端时,顺手落到剩下的第一个。否则 activeBackend 变成 undefined,
  // 路由守卫会当场把用户踢去 setup 页 —— 而他只是在管理面板里删了一条。
  if (wasActive) {
    setActiveBackend(backendList.value[0]?.uuid ?? '')
  }

  sourceIPLabelList.value.forEach((label) => {
    if (label.scope && label.scope.includes(uuid)) {
      label.scope = label.scope.filter((scope) => scope !== uuid)
      if (!label.scope.length) {
        delete label.scope
      }
    }
  })
}
