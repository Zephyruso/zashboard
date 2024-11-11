import { activeBackend } from '@/store/setup'
import type { Proxy } from '@/types'
import { useWebSocket } from '@vueuse/core'
import axios from 'axios'

axios.interceptors.request.use((config) => {
  config.baseURL = activeBackend.value?.protocol + '://' + activeBackend.value?.host + ':' + activeBackend.value?.port
  config.headers['Authorization'] = 'Bearer ' + activeBackend.value?.password
  return config
})

export const fetchProxiesAPI = () => {
  return axios.get<{ proxies: Record<string, Proxy> }>('/proxies')
}

export const selectProxyAPI = (proxyGroup: string ,name: string) => {
  return axios.put(`/proxies/${encodeURIComponent(proxyGroup)}`, { name })
}

export const fetchProxyLatencyAPI = (proxyName: string, url: string, timeout: number) => {
  return axios.get<{ delay: number }>(`/proxies/${encodeURIComponent(proxyName)}/delay`, {
    params: {
      url,
      timeout
    }
  })
}

export const disconnectByIdAPI = (id: string) => {
  return axios.delete(`/connections/${id}`)
}

export const disconnectAllAPI = () => {
  return axios.delete('/connections')
}

const getWsUrl = (url: string) => {
  return `${activeBackend.value?.protocol === 'https' ? 'wss' : 'ws'}://${activeBackend.value?.host}:${activeBackend.value?.port}/${url}?token=${activeBackend.value?.password}`
}

export const fetchConnectionsAPI = <T>() => {
  return useWebSocket<T>(
    getWsUrl('connections'),
  )
}

export const fetchLogsAPI = <T>() => {
  return useWebSocket<T>(
    getWsUrl('logs'),
  )
}