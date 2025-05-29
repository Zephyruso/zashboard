import {
  DELETE_CONFIG,
  DELETE_CONFIG_CONTENT,
  DISABLE_AUTO_LAUNCH,
  ENABLE_AUTO_LAUNCH,
  GET_ACTIVE_CONFIG,
  GET_CONFIGS,
  GET_CONFIG_CONTENT,
  GET_RUNTIME_CONFIG_CONTENT,
  IS_AUTO_LAUNCH_ENABLED,
  IS_CORE_RUNNING,
  RESTART_CORE,
  SET_ACTIVE_CONFIG,
  SET_CONFIG,
  SET_CONFIG_CONTENT,
  START_CORE,
  STOP_CORE,
  UPDATE_CONFIG,
} from '@/shared/event'
import { Config } from '@/shared/type'

const api = window.api as {
  invoke: (event: string, ...args: any[]) => any
}

export const isCoreRunningAPI = async () => {
  return await api.invoke(IS_CORE_RUNNING)
}
export const startCoreAPI = async () => {
  return await api.invoke(START_CORE)
}
export const stopCoreAPI = async () => {
  return await api.invoke(STOP_CORE)
}
export const restartCoreAPI = async () => {
  return await api.invoke(RESTART_CORE)
}

export const isAutoLaunchEnabledAPI = async () => {
  return await api.invoke(IS_AUTO_LAUNCH_ENABLED)
}
export const enableAutoLaunchAPI = async () => {
  return await api.invoke(ENABLE_AUTO_LAUNCH)
}
export const disableAutoLaunchAPI = async () => {
  return await api.invoke(DISABLE_AUTO_LAUNCH)
}

export const getConfigListAPI = async () => {
  return await api.invoke(GET_CONFIGS)
}
export const getActiveConfigAPI = async () => {
  return await api.invoke(GET_ACTIVE_CONFIG)
}
export const setActiveConfigAPI = async (name: string) => {
  return await api.invoke(SET_ACTIVE_CONFIG, name)
}
export const setConfigAPI = async (config: Config, content?: string) => {
  return await api.invoke(SET_CONFIG, config, content)
}
export const updateConfigAPI = async (name: string) => {
  return await api.invoke(UPDATE_CONFIG, name)
}
export const deleteConfigAPI = async (name: string) => {
  return await api.invoke(DELETE_CONFIG, name)
}

export const getConfigFileAPI = async (name: string) => {
  return await api.invoke(GET_CONFIG_CONTENT, name)
}
export const setConfigFileAPI = async (name: string, config: string) => {
  return await api.invoke(SET_CONFIG_CONTENT, name, config)
}
export const deleteConfigFileAPI = async (name: string) => {
  return await api.invoke(DELETE_CONFIG_CONTENT, name)
}
export const getRuntimeConfigFileAPI = async () => {
  return await api.invoke(GET_RUNTIME_CONFIG_CONTENT)
}
