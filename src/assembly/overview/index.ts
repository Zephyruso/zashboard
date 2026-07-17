// 组装层 · overview 门面。memory / traffic 统计流按后端类型路由,统一返回 { data, close } 流。
import { isSingboxBackend } from '@/assembly/backend'
import * as clash from './clash'

let singboxModule: typeof import('./singbox') | null = null

export const preloadOverviewBackend = async () => {
  if (isSingboxBackend.value && !singboxModule) {
    singboxModule = await import('./singbox')
  }
}

const backend = () => {
  if (!isSingboxBackend.value) {
    return clash
  }
  if (!singboxModule) {
    throw new Error('sing-box overview backend not preloaded')
  }
  return singboxModule
}

export const fetchMemoryAPI = <T>() => backend().fetchMemoryAPI<T>()

export const fetchTrafficAPI = <T>() => backend().fetchTrafficAPI<T>()
