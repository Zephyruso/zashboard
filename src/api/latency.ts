const createAbortError = () => new DOMException('Latency test aborted', 'AbortError')

const getLatencyFromUrlAPI = (url: string, signal?: AbortSignal) => {
  return new Promise<number>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    const startTime = performance.now()
    const img = document.createElement('img')
    const cleanup = () => {
      img.onload = null
      img.onerror = null
      signal?.removeEventListener('abort', handleAbort)
      img.remove()
    }
    const handleAbort = () => {
      cleanup()
      reject(createAbortError())
    }

    img.onload = () => {
      const endTime = performance.now()
      cleanup()
      resolve(endTime - startTime)
    }
    img.onerror = () => {
      cleanup()
      resolve(0)
    }
    signal?.addEventListener('abort', handleAbort, { once: true })

    img.src = url + '?_=' + new Date().getTime()
    img.style.display = 'none'
    document.body.appendChild(img)
  })
}

export const getCloudflareLatencyAPI = (signal?: AbortSignal) => {
  return getLatencyFromUrlAPI('https://www.cloudflare.com/favicon.ico', signal)
}

export const getYouTubeLatencyAPI = (signal?: AbortSignal) => {
  return getLatencyFromUrlAPI('https://yt3.ggpht.com/favicon.ico', signal)
}

export const getGithubLatencyAPI = (signal?: AbortSignal) => {
  return getLatencyFromUrlAPI('https://github.githubassets.com/favicon.ico', signal)
}

export const getBaiduLatencyAPI = (signal?: AbortSignal) => {
  return getLatencyFromUrlAPI('https://apps.bdimg.com/favicon.ico', signal)
}
