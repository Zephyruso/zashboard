import {
  DELETE_CONFIG,
  DELETE_CONFIG_CONTENT,
  DISABLE_AUTO_LAUNCH,
  ENABLE_AUTO_LAUNCH,
  GET_ACTIVE_CONFIG,
  GET_CLASH_API_ENDPOINT,
  GET_CONFIGS,
  GET_CONFIG_CONTENT,
  GET_RUNTIME_CONFIG_CONTENT,
  INSTALL_SERVICE_MODE,
  IS_AUTO_LAUNCH_ENABLED,
  IS_SERVICE_MODE_INSTALLED,
  REMOVE_SERVICE_MODE,
  RESTART_CORE,
  SET_ACTIVE_CONFIG,
  SET_CONFIG,
  SET_CONFIG_CONTENT,
  START_CORE,
  STOP_CORE,
  UPDATE_CONFIG,
} from '@/shared/event'
import { Config } from '@/shared/type'

const api = window.api

export const startCoreAPI = async (): Promise<void> => {
  return await api.invoke(START_CORE)
}
export const stopCoreAPI = async (): Promise<void> => {
  return await api.invoke(STOP_CORE)
}
export const restartCoreAPI = async (): Promise<void> => {
  return await api.invoke(RESTART_CORE)
}

export const isAutoLaunchEnabledAPI = async (): Promise<boolean> => {
  return await api.invoke(IS_AUTO_LAUNCH_ENABLED)
}
export const enableAutoLaunchAPI = async (): Promise<void> => {
  return await api.invoke(ENABLE_AUTO_LAUNCH)
}
export const disableAutoLaunchAPI = async (): Promise<void> => {
  return await api.invoke(DISABLE_AUTO_LAUNCH)
}

export const isServiceModeInstalledAPI = async (): Promise<boolean> => {
  return await api.invoke(IS_SERVICE_MODE_INSTALLED)
}
export const installServiceModeAPI = async (): Promise<string> => {
  return await api.invoke(INSTALL_SERVICE_MODE)
}
export const removeServiceModeAPI = async (): Promise<string> => {
  return await api.invoke(REMOVE_SERVICE_MODE)
}

export const getClashAPIConfigAPI = async (): Promise<{
  access_control_allow_private_network: boolean
  external_controller: string
  external_ui: string
  external_ui_download_url: string
  secret: string
}> => {
  return await api.invoke(GET_CLASH_API_ENDPOINT)
}

export const getConfigListAPI = async (): Promise<Config[]> => {
  return await api.invoke(GET_CONFIGS)
}
export const getActiveConfigNameAPI = async (): Promise<string> => {
  return await api.invoke(GET_ACTIVE_CONFIG)
}
export const setActiveConfigAPI = async (name: string): Promise<void> => {
  return await api.invoke(SET_ACTIVE_CONFIG, name)
}
export const saveConfigAPI = async (config: Config, content?: string): Promise<void> => {
  return await api.invoke(SET_CONFIG, { config, content })
}
export const updateConfigAPI = async (name: string): Promise<void> => {
  return await api.invoke(UPDATE_CONFIG, name)
}
export const deleteConfigAPI = async (name: string): Promise<void> => {
  return await api.invoke(DELETE_CONFIG, name)
}

export const getConfigFileAPI = async (name: string): Promise<string> => {
  return await api.invoke(GET_CONFIG_CONTENT, name)
}
export const writeConfigFileAPI = async (name: string, config: string): Promise<void> => {
  return await api.invoke(SET_CONFIG_CONTENT, { name, config })
}
export const deleteConfigFileAPI = async (name: string): Promise<void> => {
  return await api.invoke(DELETE_CONFIG_CONTENT, name)
}
export const getRuntimeConfigFileAPI = async (): Promise<string> => {
  return await api.invoke(GET_RUNTIME_CONFIG_CONTENT)
}
