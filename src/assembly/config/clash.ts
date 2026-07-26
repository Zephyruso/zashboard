// Clash REST 后端的 config 组装:拉取 /configs、PATCH /configs,写入门面状态。
import { getConfigsAPI, patchConfigsAPI } from '@/api/clash'
import { configs } from './index'

export const fetchConfigs = async () => {
  configs.value = (await getConfigsAPI()).data
}

export const updateConfigs = async (cfg: Record<string, string | boolean | object | number>) => {
  await patchConfigsAPI(cfg)
  fetchConfigs()
}
