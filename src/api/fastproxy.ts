import { getApiBaseUrl, getUrlFromBackend } from '@/helper/utils'
import { activeBackend } from '@/store/setup'
import type { Backend } from '@/types'
import type {
  FastProxyBootstrapPayload,
  FastProxyCoreId,
  FastProxyCoreInventory,
  FastProxyCoreUpdateInfo,
  FastProxyGitHubTokenSetting,
  FastProxyGlobalConfig,
  FastProxyGroupSetResource,
  FastProxyHealthCheckSample,
  FastProxyImportResult,
  FastProxyManagedInbound,
  FastProxyMihomoRuleProviderPage,
  FastProxyMihomoRuleProviderResource,
  FastProxyNodeCachePage,
  FastProxyNodeSetFile,
  FastProxyNodeSetResource,
  FastProxyNormalizedNode,
  FastProxyNormalizedRule,
  FastProxyOperationEventPage,
  FastProxyProfileResource,
  FastProxyRepositoryBootstrap,
  FastProxyRuleSetResource,
  FastProxyRuleSourceIndex,
  FastProxyRuleSourceRepository,
  FastProxyRuleSourceRepositoryPage,
  FastProxyRuleSourceSelectableFiles,
  FastProxyRuleSourceTree,
  FastProxyRuntimeResource,
  FastProxyRuntimeResourceInventory,
  FastProxyRuntimeStatus,
  FastProxySingBoxRuleSetPage,
  FastProxySingBoxRuleSetResource,
  FastProxySubscriptionResource,
} from '@/types/fastproxy'
import axios, { type AxiosRequestConfig } from 'axios'

const fastProxyRequest = <T>(config: AxiosRequestConfig) => {
  const backend = activeBackend.value
  if (!backend) {
    throw new Error('No active backend selected')
  }

  return axios.request<T>({
    ...config,
    baseURL: getApiBaseUrl(backend),
    headers: {
      ...(config.headers || {}),
      ...(backend.password ? { Authorization: `Bearer ${backend.password}` } : {}),
    },
  })
}

const fastProxyPath = (path: string) => {
  return import.meta.env.DEV ? path : `/api${path}`
}

export const detectBackendFlavor = async (
  backend: Omit<Backend, 'uuid'>,
  timeout: number = 5000,
): Promise<'fastproxy' | 'controller' | 'unknown'> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const fastProxyEndpoint = import.meta.env.DEV
      ? `${getApiBaseUrl(backend)}/health`
      : `${getUrlFromBackend(backend)}/api/health`
    const fastProxyResponse = await fetch(fastProxyEndpoint, {
      signal: controller.signal,
      headers: backend.password ? { Authorization: `Bearer ${backend.password}` } : undefined,
    })
    if (fastProxyResponse.ok) {
      const payload = await fastProxyResponse.json().catch(() => null)
      if (payload?.service === 'fastproxy-server') {
        return 'fastproxy'
      }
    }
  } catch {}

  try {
    const controllerEndpoint = import.meta.env.DEV
      ? `${getApiBaseUrl(backend)}/version`
      : `${getUrlFromBackend(backend)}/version`
    const controllerResponse = await fetch(controllerEndpoint, {
      signal: controller.signal,
      headers: backend.password ? { Authorization: `Bearer ${backend.password}` } : undefined,
    })
    if (controllerResponse.ok) {
      return 'controller'
    }
  } catch {
  } finally {
    clearTimeout(timeoutId)
  }
  return 'unknown'
}

export const fetchFastProxyBootstrapAPI = () => {
  return fastProxyRequest<FastProxyBootstrapPayload>({
    method: 'GET',
    url: fastProxyPath('/bootstrap'),
  })
}

export const fetchRepositoryBootstrapAPI = () => {
  return fastProxyRequest<FastProxyRepositoryBootstrap>({
    method: 'GET',
    url: fastProxyPath('/repository/bootstrap'),
  })
}

export const fetchCoreInventoryAPI = () => {
  return fastProxyRequest<FastProxyCoreInventory>({
    method: 'GET',
    url: fastProxyPath('/cores'),
  })
}

export const checkCoreUpdateAPI = (core: FastProxyCoreId) => {
  return fastProxyRequest<FastProxyCoreUpdateInfo>({
    method: 'POST',
    url: fastProxyPath(`/cores/${encodeURIComponent(core)}/check-update`),
  })
}

export const updateCoreAPI = (core: FastProxyCoreId) => {
  return fastProxyRequest<FastProxyCoreUpdateInfo>({
    method: 'POST',
    url: fastProxyPath(`/cores/${encodeURIComponent(core)}/update`),
  })
}

export const uploadCoreAPI = (core: FastProxyCoreId, file: File, version?: string) => {
  const data = new FormData()
  data.append('file', file)
  if (version) {
    data.append('version', version)
  }
  return fastProxyRequest({
    method: 'POST',
    url: fastProxyPath(`/cores/${encodeURIComponent(core)}/upload`),
    data,
  })
}

export const fetchGitHubTokenSettingAPI = () => {
  return fastProxyRequest<FastProxyGitHubTokenSetting>({
    method: 'GET',
    url: fastProxyPath('/settings/github-token'),
  })
}

export const saveGitHubTokenSettingAPI = (token: string) => {
  return fastProxyRequest<FastProxyGitHubTokenSetting>({
    method: 'PUT',
    url: fastProxyPath('/settings/github-token'),
    data: { token },
  })
}

export const fetchRuntimeStatusAPI = () => {
  return fastProxyRequest<FastProxyRuntimeStatus>({
    method: 'GET',
    url: fastProxyPath('/runtime/status'),
  })
}

export const selectRuntimeCoreAPI = (core: FastProxyCoreId) => {
  return fastProxyRequest<FastProxyGlobalConfig>({
    method: 'PUT',
    url: fastProxyPath('/runtime/core'),
    data: { core },
  })
}

export const fetchRuntimeResourcesAPI = () => {
  return fastProxyRequest<FastProxyRuntimeResourceInventory>({
    method: 'GET',
    url: fastProxyPath('/runtime/resources'),
  })
}

export const uploadRuntimeResourceAPI = (file: File, name?: string) => {
  const data = new FormData()
  data.append('file', file)
  if (name?.trim()) {
    data.append('name', name.trim())
  }
  return fastProxyRequest<FastProxyRuntimeResource>({
    method: 'POST',
    url: fastProxyPath('/runtime/resources/upload'),
    data,
  })
}

export const runRuntimeLifecycleAPI = (
  action: 'start' | 'stop' | 'restart' | 'restart-and-apply',
) => {
  return fastProxyRequest<FastProxyRuntimeStatus>({
    method: 'POST',
    url: fastProxyPath(`/runtime/${action}`),
  })
}

export const fetchProfilesAPI = () => {
  return fastProxyRequest<FastProxyProfileResource[]>({
    method: 'GET',
    url: fastProxyPath('/profiles'),
  })
}

export const createProfileAPI = (payload: Partial<FastProxyProfileResource>) => {
  return fastProxyRequest<FastProxyProfileResource>({
    method: 'POST',
    url: fastProxyPath('/profiles'),
    data: payload,
  })
}

export const updateProfileAPI = (id: string, payload: Partial<FastProxyProfileResource>) => {
  return fastProxyRequest<FastProxyProfileResource>({
    method: 'PUT',
    url: fastProxyPath(`/profiles/${encodeURIComponent(id)}`),
    data: payload,
  })
}

export const deleteProfileAPI = (id: string) => {
  return fastProxyRequest<void>({
    method: 'DELETE',
    url: fastProxyPath(`/profiles/${encodeURIComponent(id)}`),
  })
}

export const fetchGlobalConfigAPI = () => {
  return fastProxyRequest<FastProxyGlobalConfig>({
    method: 'GET',
    url: fastProxyPath('/repository/config'),
  })
}

export const updateGlobalConfigAPI = (config: FastProxyGlobalConfig) => {
  return fastProxyRequest<FastProxyGlobalConfig>({
    method: 'PUT',
    url: fastProxyPath('/repository/config'),
    data: config,
  })
}

export const fetchGlobalConfigInboundsAPI = () => {
  return fastProxyRequest<FastProxyManagedInbound[]>({
    method: 'GET',
    url: fastProxyPath('/repository/config/inbounds'),
  })
}

export const updateGlobalConfigInboundsAPI = (inbounds: FastProxyManagedInbound[]) => {
  return fastProxyRequest<FastProxyGlobalConfig>({
    method: 'PUT',
    url: fastProxyPath('/repository/config/inbounds'),
    data: { inbounds },
  })
}

export const fetchSubscriptionsAPI = () => {
  return fastProxyRequest<FastProxySubscriptionResource[]>({
    method: 'GET',
    url: fastProxyPath('/repository/subscriptions'),
  })
}

export const createSubscriptionAPI = (payload: Partial<FastProxySubscriptionResource>) => {
  return fastProxyRequest<FastProxySubscriptionResource>({
    method: 'POST',
    url: fastProxyPath('/repository/subscriptions'),
    data: payload,
  })
}

export const updateSubscriptionAPI = (
  id: string,
  payload: Partial<FastProxySubscriptionResource>,
) => {
  return fastProxyRequest<FastProxySubscriptionResource>({
    method: 'PUT',
    url: fastProxyPath(`/repository/subscriptions/${encodeURIComponent(id)}`),
    data: payload,
  })
}

export const deleteSubscriptionAPI = (id: string) => {
  return fastProxyRequest<void>({
    method: 'DELETE',
    url: fastProxyPath(`/repository/subscriptions/${encodeURIComponent(id)}`),
  })
}

export const refreshSubscriptionAPI = (id: string) => {
  return fastProxyRequest<FastProxySubscriptionResource>({
    method: 'POST',
    url: fastProxyPath(`/repository/subscriptions/${encodeURIComponent(id)}/refresh`),
  })
}

export const fetchNodeSetsAPI = () => {
  return fastProxyRequest<FastProxyNodeSetResource[]>({
    method: 'GET',
    url: fastProxyPath('/repository/node-sets'),
  })
}

export const fetchNodeSetFilesAPI = () => {
  return fastProxyRequest<FastProxyNodeSetFile[]>({
    method: 'GET',
    url: fastProxyPath('/repository/node-sets/files'),
  })
}

export const queryNodeCacheAPI = (options?: {
  offset?: number
  limit?: number
  q?: string
  protocol?: string
  address?: string
  tag?: string
  source?: string
  subscriptionId?: string
  nodeSetId?: string
}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(options || {})) {
    if (value === undefined || value === '') continue
    query.set(key, String(value))
  }
  return fastProxyRequest<FastProxyNodeCachePage>({
    method: 'GET',
    url: `${fastProxyPath('/repository/nodes')}${query.toString() ? `?${query.toString()}` : ''}`,
  })
}

export const fetchSingBoxRuleSetsAPI = () => {
  return fastProxyRequest<FastProxySingBoxRuleSetResource[]>({
    method: 'GET',
    url: fastProxyPath('/repository/sing-box-rule-sets'),
  })
}

export const querySingBoxRuleSetsAPI = (options?: {
  offset?: number
  limit?: number
  q?: string
}) => {
  const query = new URLSearchParams()
  if (typeof options?.offset === 'number') {
    query.set('offset', String(options.offset))
  }
  if (typeof options?.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  if (options?.q?.trim()) {
    query.set('q', options.q.trim())
  }
  return fastProxyRequest<FastProxySingBoxRuleSetPage>({
    method: 'GET',
    url: `${fastProxyPath('/repository/sing-box-rule-sets/page')}${query.toString() ? `?${query.toString()}` : ''}`,
  })
}

export const fetchMihomoRuleProvidersAPI = () => {
  return fastProxyRequest<FastProxyMihomoRuleProviderResource[]>({
    method: 'GET',
    url: fastProxyPath('/repository/mihomo-rule-providers'),
  })
}

export const queryMihomoRuleProvidersAPI = (options?: {
  offset?: number
  limit?: number
  q?: string
}) => {
  const query = new URLSearchParams()
  if (typeof options?.offset === 'number') {
    query.set('offset', String(options.offset))
  }
  if (typeof options?.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  if (options?.q?.trim()) {
    query.set('q', options.q.trim())
  }
  return fastProxyRequest<FastProxyMihomoRuleProviderPage>({
    method: 'GET',
    url: `${fastProxyPath('/repository/mihomo-rule-providers/page')}${query.toString() ? `?${query.toString()}` : ''}`,
  })
}

export const fetchRoutingRuleSetsAPI = () => {
  return fastProxyRequest<FastProxyRuleSetResource[]>({
    method: 'GET',
    url: fastProxyPath('/repository/routing-rule-sets'),
  })
}

export const fetchRuleSourceRepositoriesAPI = () => {
  return fastProxyRequest<FastProxyRuleSourceRepository[]>({
    method: 'GET',
    url: fastProxyPath('/repository/rule-source-repositories'),
  })
}

export const queryRuleSourceRepositoriesAPI = (options?: {
  offset?: number
  limit?: number
  q?: string
}) => {
  const query = new URLSearchParams()
  if (typeof options?.offset === 'number') {
    query.set('offset', String(options.offset))
  }
  if (typeof options?.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  if (options?.q?.trim()) {
    query.set('q', options.q.trim())
  }
  return fastProxyRequest<FastProxyRuleSourceRepositoryPage>({
    method: 'GET',
    url: `${fastProxyPath('/repository/rule-source-repositories/page')}${query.toString() ? `?${query.toString()}` : ''}`,
  })
}

export const createRuleSourceRepositoryAPI = (payload: Partial<FastProxyRuleSourceRepository>) => {
  return fastProxyRequest<FastProxyRuleSourceRepository>({
    method: 'POST',
    url: fastProxyPath('/repository/rule-source-repositories'),
    data: payload,
  })
}

export const updateRuleSourceRepositoryAPI = (
  id: string,
  payload: Partial<FastProxyRuleSourceRepository>,
) => {
  return fastProxyRequest<FastProxyRuleSourceRepository>({
    method: 'PUT',
    url: fastProxyPath(`/repository/rule-source-repositories/${encodeURIComponent(id)}`),
    data: payload,
  })
}

export const deleteRuleSourceRepositoryAPI = (id: string) => {
  return fastProxyRequest<void>({
    method: 'DELETE',
    url: fastProxyPath(`/repository/rule-source-repositories/${encodeURIComponent(id)}`),
  })
}

export const browseRuleSourceRepositoryTreeAPI = (id: string, core: string, path?: string) => {
  const query = new URLSearchParams({ core })
  if (path?.trim()) {
    query.set('path', path.trim())
  }
  return fastProxyRequest<FastProxyRuleSourceTree>({
    method: 'GET',
    url: `${fastProxyPath(`/repository/rule-source-repositories/${encodeURIComponent(id)}/tree`)}?${query.toString()}`,
  })
}

export const fetchRuleSourceRepositoryIndexAPI = (
  id: string,
  path?: string,
  options?: { offset?: number; limit?: number; flat?: boolean },
) => {
  const query = new URLSearchParams()
  if (path?.trim()) {
    query.set('path', path.trim())
  }
  if (typeof options?.offset === 'number') {
    query.set('offset', String(options.offset))
  }
  if (typeof options?.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  if (options?.flat) {
    query.set('flat', 'true')
  }
  return fastProxyRequest<FastProxyRuleSourceIndex>({
    method: 'GET',
    url: `${fastProxyPath(`/repository/rule-source-repositories/${encodeURIComponent(id)}/index`)}${query.toString() ? `?${query.toString()}` : ''}`,
  })
}

export const searchRuleSourceRepositoryIndexAPI = (
  id: string,
  queryText: string,
  options?: {
    offset?: number
    limit?: number
    core?: string
    format?: string
    behavior?: string
    kind?: string
    pathPrefix?: string
  },
) => {
  const query = new URLSearchParams({ q: queryText })
  if (typeof options?.offset === 'number') {
    query.set('offset', String(options.offset))
  }
  if (typeof options?.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  if (options?.core) {
    query.set('core', options.core)
  }
  if (options?.format) {
    query.set('format', options.format)
  }
  if (options?.behavior) {
    query.set('behavior', options.behavior)
  }
  if (options?.kind) {
    query.set('kind', options.kind)
  }
  if (options?.pathPrefix) {
    query.set('pathPrefix', options.pathPrefix)
  }
  return fastProxyRequest<FastProxyRuleSourceIndex>({
    method: 'GET',
    url: `${fastProxyPath(`/repository/rule-source-repositories/${encodeURIComponent(id)}/index/search`)}?${query.toString()}`,
  })
}

export const refreshRuleSourceRepositoryIndexAPI = (id: string) => {
  return fastProxyRequest<FastProxyRuleSourceIndex>({
    method: 'POST',
    url: fastProxyPath(
      `/repository/rule-source-repositories/${encodeURIComponent(id)}/index/refresh`,
    ),
  })
}

export const refreshRuleSourceSelectableFilesAPI = (id: string, core: string) => {
  const query = new URLSearchParams({ core })
  return fastProxyRequest<FastProxyRuleSourceSelectableFiles>({
    method: 'POST',
    url: `${fastProxyPath(`/repository/rule-source-repositories/${encodeURIComponent(id)}/selectable-files/refresh`)}?${query.toString()}`,
  })
}

export const fetchRemoteTextAPI = (url: string) => {
  return fastProxyRequest<{ content: string }>({
    method: 'POST',
    url: fastProxyPath('/repository/remote-text/fetch'),
    data: { url },
  })
}

export const expandRemoteRuleSetAPI = (source: string, outbound: string) => {
  return fastProxyRequest<{ rules?: FastProxyNormalizedRule[]; warnings?: string[] }>({
    method: 'POST',
    url: fastProxyPath('/repository/remote-rule-set/expand'),
    data: { source, outbound },
  })
}

export const createSingBoxRuleSetAPI = (payload: Partial<FastProxySingBoxRuleSetResource>) => {
  return fastProxyRequest<FastProxySingBoxRuleSetResource>({
    method: 'POST',
    url: fastProxyPath('/repository/sing-box-rule-sets'),
    data: payload,
  })
}

export const updateSingBoxRuleSetAPI = (
  id: string,
  payload: Partial<FastProxySingBoxRuleSetResource>,
) => {
  return fastProxyRequest<FastProxySingBoxRuleSetResource>({
    method: 'PUT',
    url: fastProxyPath(`/repository/sing-box-rule-sets/${encodeURIComponent(id)}`),
    data: payload,
  })
}

export const deleteSingBoxRuleSetAPI = (id: string) => {
  return fastProxyRequest<void>({
    method: 'DELETE',
    url: fastProxyPath(`/repository/sing-box-rule-sets/${encodeURIComponent(id)}`),
  })
}

export const createMihomoRuleProviderAPI = (
  payload: Partial<FastProxyMihomoRuleProviderResource>,
) => {
  return fastProxyRequest<FastProxyMihomoRuleProviderResource>({
    method: 'POST',
    url: fastProxyPath('/repository/mihomo-rule-providers'),
    data: payload,
  })
}

export const updateMihomoRuleProviderAPI = (
  id: string,
  payload: Partial<FastProxyMihomoRuleProviderResource>,
) => {
  return fastProxyRequest<FastProxyMihomoRuleProviderResource>({
    method: 'PUT',
    url: fastProxyPath(`/repository/mihomo-rule-providers/${encodeURIComponent(id)}`),
    data: payload,
  })
}

export const deleteMihomoRuleProviderAPI = (id: string) => {
  return fastProxyRequest<void>({
    method: 'DELETE',
    url: fastProxyPath(`/repository/mihomo-rule-providers/${encodeURIComponent(id)}`),
  })
}

export const createRoutingRuleSetAPI = (payload: Partial<FastProxyRuleSetResource>) => {
  return fastProxyRequest<FastProxyRuleSetResource>({
    method: 'POST',
    url: fastProxyPath('/repository/routing-rule-sets'),
    data: payload,
  })
}

export const updateRoutingRuleSetAPI = (id: string, payload: Partial<FastProxyRuleSetResource>) => {
  return fastProxyRequest<FastProxyRuleSetResource>({
    method: 'PUT',
    url: fastProxyPath(`/repository/routing-rule-sets/${encodeURIComponent(id)}`),
    data: payload,
  })
}

export const deleteRoutingRuleSetAPI = (id: string) => {
  return fastProxyRequest<void>({
    method: 'DELETE',
    url: fastProxyPath(`/repository/routing-rule-sets/${encodeURIComponent(id)}`),
  })
}

export const fetchGroupSetsAPI = () => {
  return fastProxyRequest<FastProxyGroupSetResource[]>({
    method: 'GET',
    url: fastProxyPath('/repository/group-sets'),
  })
}

export const createGroupSetAPI = (payload: Partial<FastProxyGroupSetResource>) => {
  return fastProxyRequest<FastProxyGroupSetResource>({
    method: 'POST',
    url: fastProxyPath('/repository/group-sets'),
    data: payload,
  })
}

export const updateGroupSetAPI = (id: string, payload: Partial<FastProxyGroupSetResource>) => {
  return fastProxyRequest<FastProxyGroupSetResource>({
    method: 'PUT',
    url: fastProxyPath(`/repository/group-sets/${encodeURIComponent(id)}`),
    data: payload,
  })
}

export const deleteGroupSetAPI = (id: string) => {
  return fastProxyRequest<void>({
    method: 'DELETE',
    url: fastProxyPath(`/repository/group-sets/${encodeURIComponent(id)}`),
  })
}

export const queryOperationEventsAPI = (options?: {
  offset?: number
  limit?: number
  since?: string
  until?: string
  severity?: string
  eventType?: string
  resourceType?: string
  resourceId?: string
  profileId?: string
  core?: string
}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(options || {})) {
    if (value === undefined || value === '') continue
    query.set(key, String(value))
  }
  return fastProxyRequest<FastProxyOperationEventPage>({
    method: 'GET',
    url: `${fastProxyPath('/operation-events')}${query.toString() ? `?${query.toString()}` : ''}`,
  })
}

export const fetchLatestNodeHealthAPI = (options?: {
  nodeId?: string
  checkType?: string
  limit?: number
}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(options || {})) {
    if (value === undefined || value === '') continue
    query.set(key, String(value))
  }
  return fastProxyRequest<FastProxyHealthCheckSample[]>({
    method: 'GET',
    url: `${fastProxyPath('/repository/nodes/health/latest')}${query.toString() ? `?${query.toString()}` : ''}`,
  })
}

export const importClashSubscriptionAPI = (payload: {
  name?: string
  sourceUrl?: string
  content: string
}) => {
  return fastProxyRequest<FastProxyImportResult>({
    method: 'POST',
    url: fastProxyPath('/repository/imports/clash'),
    data: payload,
  })
}

export const importPlainNodesAPI = (payload: { name?: string; content: string }) => {
  return fastProxyRequest<FastProxyImportResult>({
    method: 'POST',
    url: fastProxyPath('/repository/imports/plain-nodes'),
    data: payload,
  })
}

export const createManualNodeAPI = (payload: { name?: string; node: FastProxyNormalizedNode }) => {
  return fastProxyRequest<FastProxyImportResult>({
    method: 'POST',
    url: fastProxyPath('/repository/imports/manual-node'),
    data: payload,
  })
}

export const deleteManualNodeAPI = (payload: { name: string; tag: string }) => {
  return fastProxyRequest<FastProxyImportResult>({
    method: 'DELETE',
    url: fastProxyPath('/repository/imports/manual-node'),
    data: payload,
  })
}
