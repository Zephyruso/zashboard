import {
  proxyGroupEntryOrder,
  proxyGroupFolderAssignments,
  proxyGroupFolderChildOrder,
  proxyGroupFolderMetaMap,
} from '@/store/settings'
import { ref, type InjectionKey } from 'vue'

export type ProxyGroupEntry = {
  key: string
  type: 'group'
  name: string
  displayName?: string
}

export type ProxyGroupFolderEntry = {
  key: string
  type: 'folder'
  id: string
  name: string
  emoji?: string
  span: number
  height: ProxyGroupFolderHeight
  custom?: boolean
  children: ProxyGroupEntry[]
}

export type ProxyPageEntry = ProxyGroupEntry | ProxyGroupFolderEntry
export type ProxyGroupFolderHeight = 'compact' | 'normal' | 'tall' | 'open'

export type ProxyGroupDragPayload =
  | {
      type: 'entry'
      key: string
      groupName?: string
    }
  | {
      type: 'group'
      name: string
    }

export type ProxyLayoutDropTarget =
  | {
      type: 'entry'
      key: string
      groupName?: string
    }
  | {
      type: 'folder'
      key: string
      folderId: string
    }
  | {
      type: 'folder-child'
      folderId: string
      groupName: string
    }
  | {
      type: 'column'
      sectionKey: string
      columnIndex: number
    }

export type ProxyLayoutPointerStarter = (
  event: PointerEvent,
  payload: ProxyGroupDragPayload,
  options?: {
    allowNoLayoutDrag?: boolean
  },
) => void

type ParsedGroupName = {
  folderName: string
  displayName: string
}

type FolderHint = {
  id: string
  name: string
  displayName?: string
}

export const PROXY_GROUP_MAX_COLUMNS = 5
export const PROXY_GROUP_DRAG_MIME = 'application/x-zashboard-proxy-layout'
export const PROXY_GROUP_ROOT_FOLDER_ID = '__root__'
export const PROXY_LAYOUT_POINTER_START_KEY: InjectionKey<ProxyLayoutPointerStarter> = Symbol(
  'proxy-layout-pointer-start',
)
export const proxyLayoutPointerDropTarget = ref<ProxyLayoutDropTarget>()

let activeProxyLayoutDragPayload: ProxyGroupDragPayload | undefined

const namedSeparators = [' / ', '｜', ' | ', ' - ']

const staticFolderRules: {
  name: string
  emoji: string
  match: (groupName: string) => boolean
}[] = [
  {
    name: '基础选择',
    emoji: '🎛️',
    match: (name) =>
      [
        '节点选择',
        '手动选择',
        '自动选择',
        '省流选择',
        '高级选择',
        '中转选择',
        '落地选择',
        '节点轮询',
        '全部轮询中转选择',
        '全部轮询落地选择',
        '全部落地轮询',
      ].includes(name),
  },
  {
    name: '媒体服务',
    emoji: '🎬',
    match: (name) =>
      [
        '油管视频',
        '奈飞视频',
        '国外媒体',
        '国内媒体',
        'Disney+',
        'DisneyPlus',
        'Spotify',
        'TikTok',
        'Twitch',
      ].includes(name),
  },
  {
    name: '应用服务',
    emoji: '🧩',
    match: (name) =>
      [
        '电报消息',
        '电报信息',
        '人工智能',
        '苹果微软',
        '大件下载',
        'Ai平台',
        'AI平台',
        '验证服务',
        '谷歌FCM',
        '微软Bing',
        '微软云盘',
        '微软服务',
        '苹果服务',
        '游戏平台',
        '哔哩哔哩',
        '网易音乐',
        '全球直连',
        '广告拦截',
        '应用净化',
        '漏网之鱼',
      ].includes(name),
  },
  {
    name: '地区策略',
    emoji: '🌏',
    match: (name) =>
      name === '千里' ||
      /^(全部|美国|香港|日本|坡县|新加坡|台湾|韩国|加拿大|越南|英国|法国|德国|印度|澳大利亚|泰国|巴西|荷兰|其他)(自动|手动|轮询)?$/.test(
        name,
      ),
  },
  {
    name: '端口专用',
    emoji: '🔌',
    match: (name) => /^\d{4,5}(端口|download|ssh|lan|lunxun)?/.test(name),
  },
]

const folderKey = (id: string) => `folder:${id}`

const createFolderId = (name: string) => name

const parseNamedFolder = (groupName: string): ParsedGroupName | undefined => {
  for (const separator of namedSeparators) {
    if (!groupName.includes(separator)) {
      continue
    }

    const [folderName, ...rest] = groupName.split(separator)
    const displayName = rest.join(separator)

    if (folderName && displayName) {
      return { folderName, displayName }
    }
  }
}

const getStaticFolderRule = (groupName: string) => {
  return staticFolderRules.find((rule) => rule.match(groupName))
}

const getDefaultFolderEmoji = (id: string) => {
  return staticFolderRules.find((rule) => createFolderId(rule.name) === id)?.emoji
}

const getFolderHint = (groupName: string): FolderHint | undefined => {
  const namedFolder = parseNamedFolder(groupName)

  if (namedFolder) {
    return {
      id: createFolderId(namedFolder.folderName),
      name: namedFolder.folderName,
      displayName: namedFolder.displayName,
    }
  }

  const staticRule = getStaticFolderRule(groupName)

  if (!staticRule) {
    return undefined
  }

  return {
    id: createFolderId(staticRule.name),
    name: staticRule.name,
  }
}

const createGroupEntry = (name: string, displayName?: string): ProxyGroupEntry => ({
  key: `group:${name}`,
  type: 'group',
  name,
  displayName,
})

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export const normalizeProxyGroupColumns = (value: number) => {
  return clamp(Number.isFinite(value) ? value : 1, 1, PROXY_GROUP_MAX_COLUMNS)
}

export const normalizeFolderSpan = (value: number | undefined, columns: number) => {
  return clamp(Number.isFinite(value) ? Number(value) : 1, 1, normalizeProxyGroupColumns(columns))
}

export const normalizeFolderHeight = (
  value: ProxyGroupFolderHeight | undefined,
): ProxyGroupFolderHeight => {
  return value && ['compact', 'normal', 'tall', 'open'].includes(value) ? value : 'normal'
}

const mergeStoredOrder = <T extends { key: string }>(entries: T[], storedOrder: string[]) => {
  const orderMap = new Map(storedOrder.map((key, index) => [key, index]))

  return [...entries].sort((a, b) => {
    const aOrder = orderMap.get(a.key)
    const bOrder = orderMap.get(b.key)

    if (aOrder === undefined && bOrder === undefined) {
      return 0
    }
    if (aOrder === undefined) {
      return 1
    }
    if (bOrder === undefined) {
      return -1
    }
    return aOrder - bOrder
  })
}

const applyChildOrder = (folderId: string, children: ProxyGroupEntry[]) => {
  const orderMap = new Map(
    (proxyGroupFolderChildOrder.value[folderId] ?? []).map((name, index) => [name, index]),
  )

  return [...children].sort((a, b) => {
    const aOrder = orderMap.get(a.name)
    const bOrder = orderMap.get(b.name)

    if (aOrder === undefined && bOrder === undefined) {
      return 0
    }
    if (aOrder === undefined) {
      return 1
    }
    if (bOrder === undefined) {
      return -1
    }
    return aOrder - bOrder
  })
}

const mergeOrderKeys = (currentKeys: string[], storedKeys: string[]) => {
  const currentKeySet = new Set(currentKeys)
  const ordered = storedKeys.filter((key) => currentKeySet.has(key))
  const orderedSet = new Set(ordered)

  return [...ordered, ...currentKeys.filter((key) => !orderedSet.has(key))]
}

export const buildProxyGroupFolders = (groupNames: string[], columns = 1): ProxyPageEntry[] => {
  const entries: ProxyPageEntry[] = []
  const folderMap = new Map<string, ProxyGroupFolderEntry>()

  const pushFolderChild = (hint: FolderHint, child?: ProxyGroupEntry) => {
    const meta = proxyGroupFolderMetaMap.value[hint.id]
    let folder = folderMap.get(hint.id)

    if (!folder) {
      folder = {
        key: folderKey(hint.id),
        type: 'folder',
        id: hint.id,
        name: meta?.name || hint.name,
        emoji: meta?.emoji || getDefaultFolderEmoji(hint.id),
        span: normalizeFolderSpan(meta?.span, columns),
        height: normalizeFolderHeight(meta?.height),
        custom: meta?.custom,
        children: [],
      }
      folderMap.set(hint.id, folder)
      entries.push(folder)
    }

    if (child) {
      folder.children.push(child)
    }
  }

  for (const name of groupNames) {
    const assignedFolderId = proxyGroupFolderAssignments.value[name]
    const folderHint = getFolderHint(name)

    if (assignedFolderId === PROXY_GROUP_ROOT_FOLDER_ID) {
      entries.push(createGroupEntry(name, folderHint?.displayName))
      continue
    }

    if (assignedFolderId) {
      pushFolderChild(
        {
          id: assignedFolderId,
          name: proxyGroupFolderMetaMap.value[assignedFolderId]?.name || assignedFolderId,
        },
        createGroupEntry(name, folderHint?.displayName),
      )
      continue
    }

    if (folderHint) {
      pushFolderChild(folderHint, createGroupEntry(name, folderHint.displayName))
      continue
    }

    entries.push(createGroupEntry(name))
  }

  for (const [id, meta] of Object.entries(proxyGroupFolderMetaMap.value)) {
    if (meta.custom) {
      pushFolderChild({
        id,
        name: meta.name || id,
      })
    }
  }

  for (const folder of folderMap.values()) {
    folder.children = applyChildOrder(folder.id, folder.children)
  }

  return mergeStoredOrder(entries, proxyGroupEntryOrder.value)
}

export const setProxyLayoutDragPayload = (event: DragEvent, payload: ProxyGroupDragPayload) => {
  activeProxyLayoutDragPayload = payload
  event.dataTransfer?.setData(PROXY_GROUP_DRAG_MIME, JSON.stringify(payload))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

export const clearProxyLayoutDragPayload = () => {
  activeProxyLayoutDragPayload = undefined
}

export const getProxyLayoutDragPayload = (event: DragEvent) => {
  const raw = event.dataTransfer?.getData(PROXY_GROUP_DRAG_MIME)

  if (!raw) {
    const types = Array.from(event.dataTransfer?.types ?? [])
    return types.includes(PROXY_GROUP_DRAG_MIME) ? activeProxyLayoutDragPayload : undefined
  }

  try {
    activeProxyLayoutDragPayload = JSON.parse(raw) as ProxyGroupDragPayload
    return activeProxyLayoutDragPayload
  } catch {
    return undefined
  }
}

export const getDraggedProxyGroupName = (payload: ProxyGroupDragPayload | undefined) => {
  if (!payload) {
    return undefined
  }

  if (payload.type === 'group') {
    return payload.name
  }

  return payload.groupName
}

export const getProxyLayoutDropTarget = (
  clientX: number,
  clientY: number,
): ProxyLayoutDropTarget | undefined => {
  if (typeof document === 'undefined') {
    return undefined
  }

  const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  const folderChild = target?.closest<HTMLElement>('[data-proxy-folder-child-name]')

  if (folderChild?.dataset.proxyFolderId && folderChild.dataset.proxyFolderChildName) {
    return {
      type: 'folder-child',
      folderId: folderChild.dataset.proxyFolderId,
      groupName: folderChild.dataset.proxyFolderChildName,
    }
  }

  const layoutItem = target?.closest<HTMLElement>('[data-proxy-layout-key]')

  if (layoutItem?.dataset.proxyLayoutKey) {
    if (layoutItem.dataset.proxyFolderId) {
      return {
        type: 'folder',
        key: layoutItem.dataset.proxyLayoutKey,
        folderId: layoutItem.dataset.proxyFolderId,
      }
    }

    return {
      type: 'entry',
      key: layoutItem.dataset.proxyLayoutKey,
      groupName: layoutItem.dataset.proxyGroupName,
    }
  }

  const layoutColumn = target?.closest<HTMLElement>('[data-proxy-layout-column]')
  const columnIndex = Number(layoutColumn?.dataset.proxyLayoutColumn)

  if (Number.isInteger(columnIndex)) {
    return {
      type: 'column',
      sectionKey: layoutColumn?.dataset.proxyLayoutSection ?? '',
      columnIndex,
    }
  }

  return undefined
}

export const createProxyGroupFolder = () => {
  const id = `custom:${Date.now().toString(36)}`

  proxyGroupFolderMetaMap.value = {
    ...proxyGroupFolderMetaMap.value,
    [id]: {
      custom: true,
      emoji: '📁',
      height: 'normal',
      name: '新文件夹',
      span: 1,
    },
  }
  proxyGroupEntryOrder.value = [...proxyGroupEntryOrder.value, folderKey(id)]

  return id
}

export const updateProxyGroupFolderMeta = (
  folderId: string,
  patch: {
    emoji?: string
    height?: ProxyGroupFolderHeight
    name?: string
    span?: number
  },
) => {
  proxyGroupFolderMetaMap.value = {
    ...proxyGroupFolderMetaMap.value,
    [folderId]: {
      ...proxyGroupFolderMetaMap.value[folderId],
      ...patch,
    },
  }
}

export const resetProxyGroupFolderMeta = (folderId: string) => {
  if (proxyGroupFolderMetaMap.value[folderId]?.custom) {
    proxyGroupFolderMetaMap.value = {
      ...proxyGroupFolderMetaMap.value,
      [folderId]: {
        custom: true,
        emoji: '📁',
        height: 'normal',
        name: '新文件夹',
        span: 1,
      },
    }
    return
  }

  const nextMeta = { ...proxyGroupFolderMetaMap.value }
  delete nextMeta[folderId]
  proxyGroupFolderMetaMap.value = nextMeta
}

export const removeProxyGroupFolder = (folderId: string) => {
  const nextMeta = { ...proxyGroupFolderMetaMap.value }
  delete nextMeta[folderId]
  proxyGroupFolderMetaMap.value = nextMeta

  const nextAssignments = { ...proxyGroupFolderAssignments.value }
  for (const [groupName, assignedFolderId] of Object.entries(nextAssignments)) {
    if (assignedFolderId === folderId) {
      delete nextAssignments[groupName]
    }
  }
  proxyGroupFolderAssignments.value = nextAssignments

  const nextChildOrder = { ...proxyGroupFolderChildOrder.value }
  delete nextChildOrder[folderId]
  proxyGroupFolderChildOrder.value = nextChildOrder

  proxyGroupEntryOrder.value = proxyGroupEntryOrder.value.filter(
    (key) => key !== folderKey(folderId),
  )
}

export const setProxyGroupFolder = (groupName: string, folderId?: string) => {
  const nextAssignments = { ...proxyGroupFolderAssignments.value }

  if (folderId) {
    nextAssignments[groupName] = folderId
  } else {
    nextAssignments[groupName] = PROXY_GROUP_ROOT_FOLDER_ID
  }

  proxyGroupFolderAssignments.value = nextAssignments
}

export const resetProxyGroupFolderAssignment = (groupName: string) => {
  const nextAssignments = { ...proxyGroupFolderAssignments.value }
  delete nextAssignments[groupName]
  proxyGroupFolderAssignments.value = nextAssignments
}

export const moveProxyPageEntry = (dragKey: string, targetKey: string, currentKeys: string[]) => {
  if (dragKey === targetKey) {
    return
  }

  const nextOrder = mergeOrderKeys(currentKeys, proxyGroupEntryOrder.value).filter(
    (key) => key !== dragKey,
  )
  const targetIndex = nextOrder.indexOf(targetKey)

  if (targetIndex === -1) {
    nextOrder.push(dragKey)
  } else {
    nextOrder.splice(targetIndex, 0, dragKey)
  }

  proxyGroupEntryOrder.value = nextOrder
}

export const moveProxyPageEntryAfter = (
  dragKey: string,
  targetKey: string,
  currentKeys: string[],
) => {
  if (dragKey === targetKey) {
    return
  }

  const nextOrder = mergeOrderKeys(currentKeys, proxyGroupEntryOrder.value).filter(
    (key) => key !== dragKey,
  )
  const targetIndex = nextOrder.indexOf(targetKey)

  if (targetIndex === -1) {
    nextOrder.push(dragKey)
  } else {
    nextOrder.splice(targetIndex + 1, 0, dragKey)
  }

  proxyGroupEntryOrder.value = nextOrder
}

export const moveProxyPageEntryToEnd = (dragKey: string, currentKeys: string[]) => {
  const nextOrder = mergeOrderKeys(currentKeys, proxyGroupEntryOrder.value).filter(
    (key) => key !== dragKey,
  )

  nextOrder.push(dragKey)
  proxyGroupEntryOrder.value = nextOrder
}

export const moveProxyGroupInFolder = (
  folderId: string,
  groupName: string,
  targetGroupName: string | undefined,
  currentChildren: string[],
) => {
  const nextOrder = mergeOrderKeys(
    currentChildren,
    proxyGroupFolderChildOrder.value[folderId] ?? [],
  ).filter((name) => name !== groupName)
  const targetIndex = targetGroupName ? nextOrder.indexOf(targetGroupName) : -1

  if (targetIndex === -1) {
    nextOrder.push(groupName)
  } else {
    nextOrder.splice(targetIndex, 0, groupName)
  }

  proxyGroupFolderChildOrder.value = {
    ...proxyGroupFolderChildOrder.value,
    [folderId]: nextOrder,
  }
}

export const resetProxyGroupLayout = () => {
  proxyGroupFolderMetaMap.value = {}
  proxyGroupFolderAssignments.value = {}
  proxyGroupEntryOrder.value = []
  proxyGroupFolderChildOrder.value = {}
}
