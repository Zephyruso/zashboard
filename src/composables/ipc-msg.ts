import { IS_CORE_RUNNING } from '@/shared/event'
import { getClashAPIConfigAPI } from '../api/ipc-invoke'
import { ROUTE_NAME } from '../constant'
import router from '../router'
import { isCoreRunning } from '../store/ipc-store'
import { addBackend, backendList } from '../store/setup'

const api = window.api

api.on(IS_CORE_RUNNING, async (...args: unknown[]) => {
  const isRunning = args[1] as boolean

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
    router.push({ name: ROUTE_NAME.config })
  }
  isCoreRunning.value = isRunning
})
