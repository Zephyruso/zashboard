import { getConfigsAPI, patchConfigsAPI } from '@renderer/api'
import type { Config } from '@renderer/types'
import { ref } from 'vue'

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
export const fetchConfigs = async () => {
  configs.value = (await getConfigsAPI()).data
}
export const updateConfigs = async (cfg: Record<string, string | boolean | object | number>) => {
  await patchConfigsAPI(cfg)
  fetchConfigs()
}
