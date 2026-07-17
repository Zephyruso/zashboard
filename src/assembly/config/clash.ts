// Clash REST 后端的 config 组装:拉取 /configs、PATCH /configs,写入门面状态。
import { getConfigsAPI, patchConfigsAPI } from '@/api/clash'
import { activeUuid } from '@/store/setup'
import { configs } from './index'

export const fetchConfigs = async () => {
  const backendUuid = activeUuid.value
  const { data } = await getConfigsAPI()

  // 代际守卫:旧后端慢响应不得覆盖新后端的 ports/tun 等设置展示
  if (backendUuid !== activeUuid.value) {
    return
  }
  configs.value = data
}

export const updateConfigs = async (cfg: Record<string, string | boolean | object | number>) => {
  await patchConfigsAPI(cfg)
  fetchConfigs()
}
