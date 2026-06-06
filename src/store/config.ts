import { getConfigsAPI, isRequestCanceled, patchConfigsAPI } from '@/api'
import type { Config } from '@/types'
import { ref } from 'vue'
import { activeUuid } from './setup'

export const configs = ref<Config>({
  port: 0,
  'socks-port': 0,
  'redir-port': 0,
  'tproxy-port': 0,
  'mixed-port': 0,
  'allow-lan': false,
  'bind-address': '',
  mode: '',
  'mode-list': [],
  modes: [],
  'log-level': '',
  ipv6: false,
  tun: {
    enable: false,
  },
})
let fetchConfigsSequence = 0
let fetchConfigsAbortController: AbortController | undefined

export const fetchConfigs = async () => {
  const sequence = ++fetchConfigsSequence
  const backendUuid = activeUuid.value

  if (!backendUuid) {
    return
  }

  const controller = new AbortController()

  fetchConfigsAbortController?.abort()
  fetchConfigsAbortController = controller

  let data: Config

  try {
    ;({ data } = await getConfigsAPI(controller.signal))
  } catch (error) {
    if (isRequestCanceled(error)) return
    throw error
  } finally {
    if (fetchConfigsAbortController === controller) {
      fetchConfigsAbortController = undefined
    }
  }

  if (fetchConfigsSequence !== sequence || activeUuid.value !== backendUuid) {
    return
  }

  configs.value = data
}
export const updateConfigs = async (
  cfg: Record<string, string | boolean | object | number>,
  signal?: AbortSignal,
) => {
  const backendUuid = activeUuid.value

  if (signal?.aborted || !backendUuid) return

  await patchConfigsAPI(cfg, signal)
  if (signal?.aborted || activeUuid.value !== backendUuid) return

  fetchConfigs()
}
