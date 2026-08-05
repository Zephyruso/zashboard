// 组装层 · storage。/storage/zashboard 为设置同步端点,是 mihomo 扩展,
// sing-box 无论走哪条通道都没有,故按 core 轴(syncSettings 能力)门控。
//
// 登录后立刻同步设置的调用会早于内核探测完成,此时 core 仍是 'unknown',
// 直接判定会误伤 mihomo 后端,所以先 coreReady() 等探测有结论再决定。
import {
  deleteStorageAPI as deleteClashStorageAPI,
  getStorageAPI as getClashStorageAPI,
  setStorageAPI as setClashStorageAPI,
} from '@/api/clash'
import { can } from './backend'
import { coreReady } from './version'

export const getStorageAPI = async () => {
  await coreReady()

  if (!can('syncSettings')) return Promise.reject<{ data: Record<string, unknown> }>('unsupported')

  return getClashStorageAPI()
}

export const setStorageAPI = async (value: Record<string, string>) => {
  await coreReady()

  return can('syncSettings') ? setClashStorageAPI(value) : undefined
}

export const deleteStorageAPI = async () => {
  await coreReady()

  return can('syncSettings') ? deleteClashStorageAPI() : undefined
}
