import {
  deleteConfigFileAPI,
  getConfigFileAPI,
  getConfigListAPI,
  getRuntimeConfigFileAPI,
  isAutoLaunchEnabledAPI,
  isServiceModeInstalledAPI,
  saveConfigAPI,
} from '@/renderer/src/api/ipc-invoke'
import { Config } from '@/shared/type'
import { computed, ref } from 'vue'

export const isCoreRunning = ref(false)

export const isAutoLaunchEnabled = ref(false)
export const fetchIsAutoLaunchEnabled = async () => {
  isAutoLaunchEnabled.value = await isAutoLaunchEnabledAPI()
}
fetchIsAutoLaunchEnabled()

export const isServiceModeInstalled = ref(false)
export const fetchIsServiceModeInstalled = async () => {
  isServiceModeInstalled.value = await isServiceModeInstalledAPI()
}

export const configList = ref<Config[]>([])
export const activeConfigName = computed(() => configList.value.find((f) => f.isActive)?.name || '')
export const fetchConfigList = async () => {
  configList.value = await getConfigListAPI()
  const active = configList.value.find((f) => f.isActive)

  if (!active) {
    configFile.value = ''
    return
  }

  fetchConfigFileWithName(active.name)
}
export const saveConfig = async (config: Config, content?: string) => {
  await saveConfigAPI(config, content)
  await fetchConfigList()
}
export const deleteConfig = async (name: string) => {
  await deleteConfigFileAPI(name)
  await fetchConfigList()
}

export const configFile = ref('')
export const fetchRunningConfigFile = async () => {
  configFile.value = await getRuntimeConfigFileAPI()
}
export const fetchConfigFileWithName = async (name: string) => {
  configFile.value = await getConfigFileAPI(name)
}
export const deleteConfigFileWithName = async (name: string) => {
  await deleteConfigFileAPI(name)
  await fetchConfigList()
}
