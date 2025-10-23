import { i18n } from '@/i18n'
import { ref } from 'vue'

const tipShowModel = ref(false)
const tipContent = ref()
const tipType = ref('alert-warning')
const t = i18n.global.t

let timmer

export const useNotification = () => {
  const showNotification = ({
    content = '',
    message,
    params = {},
    type = 'alert-warning',
    timeout = 5000,
  }: {
    content?: string
    message?: string
    params?: Record<string, string>
    type?: 'alert-warning' | 'alert-success' | 'alert-error' | 'alert-info' | ''
    timeout?: number
  }) => {
    clearTimeout(timmer)
    tipType.value = type
    tipShowModel.value = true
    tipContent.value = message || t(content, params)

    if (timeout === 0) {
      return
    }

    timmer = setTimeout(() => {
      tipShowModel.value = false
      timmer = -1
    }, timeout)
  }

  return {
    showNotification,
    tipType,
    tipShowModel,
    tipContent,
  }
}
