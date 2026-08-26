// dae REST 后端的概览统计流(memory / traffic)。
//
// dae 没有 WS,内存与速率都挂在同一个 GET /api/runtime/status 上。两个工厂各拉
// 一次会让这个端点每秒被打两遍,所以轮询收在一个引用计数的共享轮询器里:
// 谁先订阅谁把它拉起来,最后一个 close 把它停掉。对外仍是与 Clash 通道一致的
// { data, close }。
import { fetchDaeRuntimeStatusAPI } from '@/api/dae'
import type { DaeRuntimeStatus } from '@/types'
import { shallowRef, watch, type ShallowRef } from 'vue'

// store/overview 的历史缓冲是每秒一个点,轮询频率与之对齐。
const POLL_INTERVAL = 1000

const status = shallowRef<DaeRuntimeStatus>()

let subscribers = 0
let timer: ReturnType<typeof setInterval> | undefined

const tick = async () => {
  try {
    const { data } = await fetchDaeRuntimeStatusAPI()

    status.value = data
  } catch {
    // 拉不到就跳过这一拍:不是用户触发的动作,下一拍还会再试。
  }
}

const subscribe = () => {
  subscribers += 1

  if (!timer) {
    tick()
    timer = setInterval(tick, POLL_INTERVAL)
  }

  return () => {
    subscribers -= 1

    if (subscribers > 0) return

    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
    status.value = undefined
  }
}

// 把共享快照投影成某一路统计流。T 由调用方(store/overview)指定,
// 与 Clash 通道 WS 推来的形状一致。
const project = <T>(select: (snapshot: DaeRuntimeStatus) => T) => {
  const data = shallowRef<T>()
  const unsubscribe = subscribe()
  // immediate:轮询器可能已在跑(另一路统计流先订阅的),此时快照就在手边,
  // 不该让这一路白等一拍。
  const stop = watch(
    status,
    (snapshot) => {
      if (snapshot) data.value = select(snapshot)
    },
    { immediate: true },
  )

  return {
    data,
    close: () => {
      stop()
      unsubscribe()
    },
  }
}

export const fetchMemoryAPI = <T>() =>
  project((snapshot) => ({ inuse: snapshot.memory?.heap_inuse_bytes ?? 0 })) as {
    data: ShallowRef<T | undefined>
    close: () => void
  }

export const fetchTrafficAPI = <T>() =>
  project((snapshot) => ({
    down: snapshot.rates?.download_rate ?? 0,
    up: snapshot.rates?.upload_rate ?? 0,
    downTotal: snapshot.traffic?.download_bytes ?? 0,
    upTotal: snapshot.traffic?.upload_bytes ?? 0,
  })) as {
    data: ShallowRef<T | undefined>
    close: () => void
  }
