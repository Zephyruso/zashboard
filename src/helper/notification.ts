import { i18n } from '@/i18n'
import { type Ref } from 'vue'

const t = i18n.global.t
const alertMap = new Map<
  string,
  {
    timer: number
    alert: HTMLElement
    progressBar: HTMLElement
    startTime: number
    remainingTime: number
    isPaused: boolean
  }
>()
let toastRef: Ref<HTMLElement> | null = null

export const initNotification = (toast: Ref<HTMLElement>) => {
  toastRef = toast
}

const pauseTimer = (alertKey: string) => {
  const alertData = alertMap.get(alertKey)
  if (alertData && !alertData.isPaused) {
    clearTimeout(alertData.timer)
    alertData.isPaused = true
    alertData.remainingTime = alertData.remainingTime - (Date.now() - alertData.startTime)
    alertData.progressBar.style.animationPlayState = 'paused'
  }
}

const resumeTimer = (alertKey: string) => {
  const alertData = alertMap.get(alertKey)
  if (alertData && alertData.isPaused) {
    alertData.isPaused = false
    alertData.startTime = Date.now()
    alertData.timer = setTimeout(() => {
      alertMap.delete(alertKey)
      alertData.alert.remove()
    }, alertData.remainingTime) as unknown as number
    alertData.progressBar.style.animationPlayState = 'running'
  }
}

const setTimer = (
  alert: HTMLElement,
  timeout: number,
  alertKey?: string,
  progressBar?: HTMLElement | null,
) => {
  let timer = -1

  if (timeout !== 0) {
    // 设置进度条动画
    if (progressBar) {
      progressBar.style.animation = `progressBar ${timeout}ms linear forwards`
    }

    timer = setTimeout(() => {
      if (alertKey) {
        alertMap.delete(alertKey)
      }
      alert.remove()
    }, timeout) as unknown as number
  }

  if (alertKey && progressBar) {
    alertMap.set(alertKey, {
      alert,
      timer,
      progressBar,
      startTime: Date.now(),
      remainingTime: timeout,
      isPaused: false,
    })
  }
}

const closeAlert = (alert: HTMLElement, alertKey?: string) => {
  if (alertKey) {
    const alertData = alertMap.get(alertKey)
    if (alertData) {
      clearTimeout(alertData.timer)
      alertMap.delete(alertKey)
    }
  }
  alert.remove()
}

const setAlert = (
  alert: HTMLElement,
  content: string,
  params: Record<string, string>,
  type: string,
  alertKey: string,
): HTMLElement | null => {
  alert.className = `alert flex p-2 pr-5 relative ${type}`

  const contentDiv = document.createElement('div')
  contentDiv.className = 'break-all whitespace-pre-wrap'
  contentDiv.innerHTML = t(content, params)

  const closeButton = document.createElement('button')
  closeButton.className = 'absolute top-0 right-0 btn btn-xs btn-circle btn-ghost'
  closeButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `
  closeButton.addEventListener('click', () => closeAlert(alert, alertKey))

  const progressContainer = document.createElement('div')
  progressContainer.className =
    'absolute -bottom-2 left-1 right-1 h-1 bg-transparent rounded-lg overflow-hidden'

  const progressBar = document.createElement('div')
  progressBar.className = 'h-full bg-primary/30 transition-all duration-100 ease-linear'
  progressBar.style.width = '100%'

  progressContainer.appendChild(progressBar)

  alert.innerHTML = ''
  alert.appendChild(contentDiv)
  alert.appendChild(closeButton)
  alert.appendChild(progressContainer)

  alert.addEventListener('mouseenter', () => pauseTimer(alertKey))
  alert.addEventListener('mouseleave', () => resumeTimer(alertKey))

  return progressBar
}

export const showNotification = ({
  content,
  params = {},
  key,
  type = 'alert-warning',
  timeout = 3000,
}: {
  content: string
  params?: Record<string, string>
  key?: string
  type?: 'alert-warning' | 'alert-success' | 'alert-error' | 'alert-info' | ''
  timeout?: number
}) => {
  const alertKey = key || content

  if (alertKey && alertMap.has(alertKey)) {
    const { alert, timer } = alertMap.get(alertKey)!
    clearTimeout(timer)

    const progressBar = setAlert(alert, content, params, type, alertKey)
    setTimer(alert, timeout, alertKey, progressBar)
    return
  }

  const alert = document.createElement('div')

  const progressBar = setAlert(alert, content, params, type, alertKey)
  toastRef?.value?.insertBefore(alert, toastRef?.value?.firstChild)
  setTimer(alert, timeout, alertKey, progressBar)
}
