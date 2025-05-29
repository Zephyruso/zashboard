import { Config } from '@/shared/type'
import {
  deleteConfigFileAPI,
  getConfigFileAPI,
  getConfigListAPI,
  getRuntimeConfigFileAPI,
  isAutoLaunchEnabledAPI,
  isCoreRunningAPI,
  setConfigAPI,
} from '@renderer/ipc'
import { ref } from 'vue'

export const isCoreRunning = ref(false)
export const fetchIsCoreRunning = async () => {
  isCoreRunning.value = await isCoreRunningAPI()
}
fetchIsCoreRunning()

export const isAutoLaunchEnabled = ref(false)
export const fetchIsAutoLaunchEnabled = async () => {
  isAutoLaunchEnabled.value = await isAutoLaunchEnabledAPI()
}
fetchIsAutoLaunchEnabled()

export const configFileList = ref<Config[]>([])
export const fetchConfigFileList = async () => {
  configFileList.value = await getConfigListAPI()
}
export const setConfig = async (config: Config, content?: string) => {
  await setConfigAPI(config, content)
  await fetchConfigFileList()
}
export const removeConfig = async (name: string) => {
  await deleteConfigFileAPI(name)
  await fetchConfigFileList()
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
  await fetchConfigFileList()
}
