// 组装层 · storage。/storage/zashboard 为 Clash core 提供的设置同步端点,
// sing-box native 不支持,故 sing-box 后端下为 no-op。
import {
  deleteStorageAPI as deleteClashStorageAPI,
  getStorageAPI as getClashStorageAPI,
  setStorageAPI as setClashStorageAPI,
} from '@/api/clash'
import { isSingboxBackend } from './backend'

export const getStorageAPI = () =>
  isSingboxBackend.value
    ? Promise.reject<{ data: Record<string, unknown> }>('unsupported')
    : getClashStorageAPI()

export const setStorageAPI = (value: Record<string, string>) =>
  isSingboxBackend.value ? Promise.resolve() : setClashStorageAPI(value)

export const deleteStorageAPI = () =>
  isSingboxBackend.value ? Promise.resolve() : deleteClashStorageAPI()
