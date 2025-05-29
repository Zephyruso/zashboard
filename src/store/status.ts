import { isBinaryInstalledAPI } from '@/renderer/src/api/ipc-invoke'
import { addMessageListener } from '@/renderer/src/api/ipc-message'
import {
  CORE_START_LOG,
  IS_AUTO_LAUNCH_ENABLED,
  IS_CORE_RUNNING,
  IS_SYSTEM_PROXY_ENABLED,
} from '@/shared/event'
import { ref, watch } from 'vue'
import { fetchVersionAPI, version } from '../api'
import { getClashAPIConfigAPI } from '../api/ipc-invoke'
import { ROUTE_NAME } from '../constant'
import router from '../router'
import { addBackend, backendList } from './setup'

export const isCoreRunning = ref(false)
export const isSystemProxyEnabled = ref(false)
export const isAutoLaunchEnabled = ref(false)
export const isBinaryInstalled = ref(false)
export const coreLogs = ref<string[]>([])
export const showCoreStartupModal = ref(false)

watch(
  isCoreRunning,
  async (val) => {
    if (val) {
      const { data } = await fetchVersionAPI()

      version.value = data?.version || ''
    }
  },
  { immediate: true },
)

watch(showCoreStartupModal, (val) => {
  if (!val) {
    resetCoreLogs()
  }
})

export const fetchIsBinaryInstalled = async () => {
  isBinaryInstalled.value = await isBinaryInstalledAPI()
}

export const resetCoreLogs = () => {
  coreLogs.value = []
}

addMessageListener<boolean>(IS_CORE_RUNNING, async (isRunning) => {
  backendList.value = []
  if (isRunning) {
    const endpoint = await getClashAPIConfigAPI()
    addBackend({
      host: '127.0.0.1',
      port: '9999',
      protocol: 'http',
      secondaryPath: '',
      password: endpoint.secret,
    })
  } else {
    router.push({ name: ROUTE_NAME.profiles })
  }
  isCoreRunning.value = isRunning
})

addMessageListener<boolean>(IS_SYSTEM_PROXY_ENABLED, (isEnabled) => {
  isSystemProxyEnabled.value = isEnabled
})

addMessageListener<boolean>(IS_AUTO_LAUNCH_ENABLED, (isEnabled) => {
  isAutoLaunchEnabled.value = isEnabled
})

addMessageListener<string>(CORE_START_LOG, (log) => {
  if (!showCoreStartupModal.value) {
    showCoreStartupModal.value = true
  }
  coreLogs.value.unshift(log)
})
