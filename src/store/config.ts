import { getConfigsAPI, patchConfigsAPI } from '@/api'
import type { Config } from '@/types'
import { useStorage } from '@vueuse/core'
import { ref } from 'vue'

export enum LANG {
  EN_US = 'en-US',
  ZH_CN = 'zh-CN',
}

export enum CONNECTIONS_TABLE_ACCESSOR_KEY {
  Details = 'details',
  Close = 'close',
  Type = 'type',
  Process = 'process',
  Host = 'host',
  Rule = 'rule',
  Chains = 'chains',
  DlSpeed = 'dlSpeed',
  UlSpeed = 'ulSpeed',
  Download = 'dl',
  Upload = 'ul',
  ConnectTime = 'connectTime',
  SourceIP = 'sourceIP',
  SourcePort = 'sourcePort',
  Destination = 'destination',
}

// global
export const theme = useStorage<string>('config/theme', 'default')
export const language = useStorage<LANG>('config/language', LANG.EN_US)

// proxies
export const collapseGroupMap = useStorage<Record<string, boolean>>('config/collapse-group-map', {})
export const twoColumns = useStorage('config/twoColumns', true)
export const speedtestUrl = useStorage<string>(
  'config/speedtest-url',
  'http://www.gstatic.com/generate_204',
)
export const speedtestTimeout = useStorage<number>('config/speedtest-timeout', 5000)

// connections
export const useConnectionCard = useStorage('config/use-connecticon-card', true)
export const connectionTableColumns = useStorage<CONNECTIONS_TABLE_ACCESSOR_KEY[]>(
  'config/connection-table-columns',
  [
    CONNECTIONS_TABLE_ACCESSOR_KEY.Host,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Type,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Rule,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Chains,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Download,
    CONNECTIONS_TABLE_ACCESSOR_KEY.Upload,
    CONNECTIONS_TABLE_ACCESSOR_KEY.DlSpeed,
    CONNECTIONS_TABLE_ACCESSOR_KEY.UlSpeed,
    CONNECTIONS_TABLE_ACCESSOR_KEY.ConnectTime,
  ],
)
export const compactConnectionCard = useStorage<boolean>('config/compact-connection-card', true)
export const hostLabelMap = useStorage<Record<string, string>>('config/host-label-map', {})

// configs
export const configs = ref<Config>()
export const fetchConfigs = async () => {
  configs.value = (await getConfigsAPI()).data
}
export const updateConfigs = async (cfg: Record<string, string>) => {
  await patchConfigsAPI(cfg)
  fetchConfigs()
}
