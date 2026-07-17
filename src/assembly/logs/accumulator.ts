// 组装层 · 日志累加器(各后端共用)。
// 各后端按各自原生形态产出 Log 批次(clash 一次一条、sing-box 一次一批),
// 这里统一做与后端无关的加工:source-ip 标签替换、seq 编号、时间、暂停门控、保留上限与节流落表,
// 维护完整的 logs ref。store 直接引用该 ref,不再参与组装。
import { logRetentionLimit, sourceIPLabelList } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import type { Log, LogWithSeq } from '@/types'
import dayjs from 'dayjs'
import { throttle } from 'lodash-es'
import { watch, type Ref } from 'vue'

export interface LogsAccumulator {
  // 后端产出的一批原始日志(已是 { type, payload } 形态)投递入表。
  push: (batch: Log[]) => void
  dispose: () => void
}

export const createLogsAccumulator = (
  logs: Ref<LogWithSeq[]>,
  isPaused: () => boolean,
): LogsAccumulator => {
  let idx = 1
  let logsTemp: LogWithSeq[] = []

  const flush = throttle(() => {
    // 批内 push(O(1))+ flush 时一次 reverse,保持"最新在前";原 unshift 单批 O(k²)
    logs.value = logsTemp.reverse().concat(logs.value).slice(0, logRetentionLimit.value)
    logsTemp = []
  }, 500)

  // 秒级时间串缓存:高频日志下每条 dayjs().format 是纯浪费
  let lastSecond = 0
  let lastTimeText = ''
  const currentTimeText = () => {
    const second = Math.floor(Date.now() / 1000)

    if (second !== lastSecond) {
      lastSecond = second
      lastTimeText = dayjs().format('HH:mm:ss')
    }
    return lastTimeText
  }

  // source-ip 标签替换规则,随 sourceIPLabelList / 当前后端变化重建。
  // keyLower 供大小写不敏感的 includes 快筛,免去每条日志跑全部全局正则。
  const ipSourceMatchs: [RegExp, string, string][] = []
  const restructMatchs = () => {
    ipSourceMatchs.length = 0
    for (const { key, label, scope } of sourceIPLabelList.value) {
      if (scope && !scope.includes(activeBackend.value?.uuid as string)) continue
      if (key.startsWith('/')) continue

      if (key.includes(':')) {
        const regex = new RegExp(`${key}]:`, 'ig')
        ipSourceMatchs.push([regex, `${key}] (${label}) :`, key.toLowerCase()])
      } else {
        const regex = new RegExp(`${key}:`, 'ig')
        ipSourceMatchs.push([regex, `${key} (${label}) :`, key.toLowerCase()])
      }
    }
  }

  const stopWatch = watch(
    () => [sourceIPLabelList.value, activeBackend.value],
    () => restructMatchs(),
    { immediate: true, deep: true },
  )

  const push = (batch: Log[]) => {
    for (const data of batch) {
      // 暂停时丢弃该条但仍推进 seq,与既有行为一致。
      if (isPaused()) {
        idx++
        continue
      }

      let payload = data.payload

      if (ipSourceMatchs.length) {
        const payloadLower = payload.toLowerCase()

        for (const [regex, label, keyLower] of ipSourceMatchs) {
          if (payloadLower.includes(keyLower)) {
            payload = payload.replace(regex, label)
          }
        }
      }

      logsTemp.push({
        ...data,
        payload,
        time: currentTimeText(),
        seq: idx++,
      })
    }

    flush()
  }

  return {
    push,
    dispose: () => {
      stopWatch()
      flush.cancel()
    },
  }
}
