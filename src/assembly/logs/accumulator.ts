// 组装层 · 日志累加器(各后端共用)。
// 各后端按各自原生形态产出 Log 批次(clash 一次一条、sing-box 一次一批),
// 这里统一做与后端无关的加工:source-ip 标签替换、seq 编号、时间、暂停门控、保留上限与节流落表,
// 维护完整的 logs ref。store 直接引用该 ref,不再参与组装。
import { logRetentionLimit, sourceIPLabelList } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import type { Log, LogWithSeq } from '@/types'
import dayjs from 'dayjs'
import { throttle } from 'lodash'
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
    logs.value = logsTemp.concat(logs.value).slice(0, logRetentionLimit.value)
    logsTemp = []
  }, 500)

  // source-ip 标签替换规则,随 sourceIPLabelList / 当前后端变化重建。
  const ipSourceMatchs: [RegExp, string][] = []
  const restructMatchs = () => {
    ipSourceMatchs.length = 0
    for (const { key, label, scope } of sourceIPLabelList.value) {
      if (scope && !scope.includes(activeBackend.value?.uuid as string)) continue
      if (key.startsWith('/')) continue

      if (key.includes(':')) {
        const regex = new RegExp(`${key}]:`, 'ig')
        ipSourceMatchs.push([regex, `${key}] (${label}) :`])
      } else {
        const regex = new RegExp(`${key}:`, 'ig')
        ipSourceMatchs.push([regex, `${key} (${label}) :`])
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
      for (const [regex, label] of ipSourceMatchs) {
        payload = payload.replace(regex, label)
      }

      logsTemp.unshift({
        ...data,
        payload,
        time: dayjs().format('HH:mm:ss'),
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
