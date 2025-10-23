import {
  CHECK_PROFILE_CONTENT,
  CLEAR_RUNTIME_DIR,
  DELETE_PROFILE,
  DISABLE_AUTO_LAUNCH,
  ENABLE_AUTO_LAUNCH,
  GET_ACTIVE_PROFILE,
  GET_PROFILE_CONTENT,
  GET_RUNTIME_PROFILE_CONTENT,
  SELECT_CORE_FILE,
  SET_ACTIVE_PROFILE,
  SET_PROFILE,
  SET_PROFILE_CONTENT,
  SET_SYSTEM_PROXY,
  START_CORE,
  STOP_CORE,
  TRAY_STORE_UPDATED,
  UNSET_SYSTEM_PROXY,
  UPDATE_CORE_FROM_FILE,
  UPDATE_CORE_FROM_OFFICIAL,
  UPDATE_PROFILE,
  UPDATE_REMOTE_PROFILE,
  UPDATE_SETTINGS,
} from '@main/shared/event'
import { Profile, SettingsKey, SettingsValue } from '@main/shared/type'

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
export const checkProfileContentAPI = async (content: string): Promise<string | number> => {
  return await api.invoke(CHECK_PROFILE_CONTENT, content)
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

// 设置相关API
export const updateSettingsAPI = async (key: SettingsKey, value: SettingsValue): Promise<void> => {
  return await api.invoke(UPDATE_SETTINGS, { key, value })
}

export const clearRuntimeDirAPI = async (): Promise<void> => {
  return await api.invoke(CLEAR_RUNTIME_DIR)
}

export const updateTrayStoreAPI = async (key: string, value: unknown): Promise<void> => {
  return await api.invoke(TRAY_STORE_UPDATED, { key, value: JSON.stringify(value) })
}

// 内核更新相关API
export const updateCoreFromOfficialAPI = async (): Promise<string> => {
  return await api.invoke(UPDATE_CORE_FROM_OFFICIAL)
}

export const updateCoreFromFileAPI = async (filePath: string): Promise<string> => {
  return await api.invoke(UPDATE_CORE_FROM_FILE, filePath)
}

export const selectCoreFileAPI = async (): Promise<string | null> => {
  return await api.invoke(SELECT_CORE_FILE)
}
