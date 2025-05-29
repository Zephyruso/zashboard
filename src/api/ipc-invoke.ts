import {
  CLEAR_RUNTIME_DIR,
  DELETE_PROFILE,
  DISABLE_AUTO_LAUNCH,
  ENABLE_AUTO_LAUNCH,
  GET_ACTIVE_PROFILE,
  GET_CLASH_API_ENDPOINT,
  GET_PROFILE_CONTENT,
  GET_RUNTIME_PROFILE_CONTENT,
  INSTALL_BINARY,
  IS_BINARY_INSTALLED,
  SET_ACTIVE_PROFILE,
  SET_PROFILE,
  SET_PROFILE_CONTENT,
  SET_SYSTEM_PROXY,
  START_CORE,
  STOP_CORE,
  UNINSTALL_BINARY,
  UNSET_SYSTEM_PROXY,
  UPDATE_PROFILE,
  UPDATE_REMOTE_PROFILE,
  UPDATE_SETTINGS,
} from '@/shared/event'
import { Profile } from '@/shared/type'

const api = window.api

export const startCoreAPI = async (): Promise<void> => {
  return await api.invoke(START_CORE)
}
export const stopCoreAPI = async (): Promise<void> => {
  return await api.invoke(STOP_CORE)
}

export const enableAutoLaunchAPI = async (): Promise<void> => {
  return await api.invoke(ENABLE_AUTO_LAUNCH)
}
export const disableAutoLaunchAPI = async (): Promise<void> => {
  return await api.invoke(DISABLE_AUTO_LAUNCH)
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

export const getActiveProfileUuidAPI = async (): Promise<string> => {
  return await api.invoke(GET_ACTIVE_PROFILE)
}
export const setActiveProfileAPI = async (profileUuid: string): Promise<void> => {
  return await api.invoke(SET_ACTIVE_PROFILE, profileUuid)
}
export const saveProfileAPI = async (profile: Profile, content?: string): Promise<void> => {
  return await api.invoke(SET_PROFILE, { profile, content })
}
export const updateRemoteProfileAPI = async (profileUuid: string): Promise<void> => {
  return await api.invoke(UPDATE_REMOTE_PROFILE, profileUuid)
}
export const updateProfileAPI = async (
  profile: Partial<Profile> & { uuid: string },
): Promise<void> => {
  return await api.invoke(UPDATE_PROFILE, profile)
}
export const deleteProfileAPI = async (profileUuid: string): Promise<void> => {
  return await api.invoke(DELETE_PROFILE, profileUuid)
}

export const getProfileContentAPI = async (profileUuid: string): Promise<string> => {
  return await api.invoke(GET_PROFILE_CONTENT, profileUuid)
}
export const writeProfileContentAPI = async (
  profileUuid: string,
  profile: string,
): Promise<void> => {
  return await api.invoke(SET_PROFILE_CONTENT, { profileUuid, profile })
}

export const getRuntimeProfileContentAPI = async (): Promise<string> => {
  return await api.invoke(GET_RUNTIME_PROFILE_CONTENT)
}

// 系统代理相关API
export const setSystemProxyAPI = async (): Promise<void> => {
  return await api.invoke(SET_SYSTEM_PROXY)
}
export const unsetSystemProxyAPI = async (): Promise<void> => {
  return await api.invoke(UNSET_SYSTEM_PROXY)
}

// 二进制安装相关API
export const isBinaryInstalledAPI = async (): Promise<boolean> => {
  return await api.invoke(IS_BINARY_INSTALLED)
}
export const installBinaryAPI = async (): Promise<string> => {
  return await api.invoke(INSTALL_BINARY)
}
export const uninstallBinaryAPI = async (): Promise<string> => {
  return await api.invoke(UNINSTALL_BINARY)
}

// 设置相关API
export const updateSettingsAPI = async (key: string, value: string): Promise<void> => {
  return await api.invoke(UPDATE_SETTINGS, { key, value })
}

export const clearRuntimeDirAPI = async (): Promise<void> => {
  return await api.invoke(CLEAR_RUNTIME_DIR)
}
