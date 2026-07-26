// api 层 · axios 实例的全局拦截器。
// 这是 api 层唯一允许依赖 store/setup 的地方:请求需要从 activeBackend 取得
// 当前连接目标(baseURL / 鉴权)。其余 api 文件不得依赖上层。
import { ROUTE_NAME } from '@/constant'
import { showNotification } from '@/helper/notification'
import { getUrlFromBackend } from '@/helper/utils'
import { activeBackend, activeUuid } from '@/store/setup'
import axios, { AxiosError } from 'axios'
import { nextTick } from 'vue'

axios.interceptors.request.use((config) => {
  if (activeBackend.value) {
    config.baseURL = getUrlFromBackend(activeBackend.value)
    config.headers['Authorization'] = 'Bearer ' + activeBackend.value.password
  }
  return config
})

const ignoreNotificationUrls = ['/delay', '/healthcheck', '/weights', '/storage/zashboard']

axios.interceptors.response.use(
  null,
  async (
    error: AxiosError<{
      message: string
    }>,
  ) => {
    if (error.status === 401 && activeUuid.value) {
      const { default: router } = await import('@/router')
      const currentBackendUuid = activeUuid.value
      activeUuid.value = null
      router.push({
        name: ROUTE_NAME.setup,
        query: { editBackend: currentBackendUuid },
      })
      nextTick(() => {
        showNotification({ content: 'unauthorizedTip' })
      })
    } else if (!ignoreNotificationUrls.some((url) => error.config?.url?.endsWith(url))) {
      const errorMessage = error.response?.data?.message || error.message

      showNotification({
        key: errorMessage,
        content: `${decodeURIComponent(error.config?.url || '')} \n${errorMessage}`,
        type: 'alert-error',
      })
      return Promise.reject(error)
    }

    return error
  },
)
