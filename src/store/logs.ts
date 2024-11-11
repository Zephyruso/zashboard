import { fetchLogsAPI } from "@/api";
import type { Log, LogWithSeq } from "@/types";
import { ref, watch } from "vue";

export const logs = ref<LogWithSeq[]>([])

export const initLogs = () => {
  const ws = fetchLogsAPI<string>()
  let idx = 1

  logs.value = []
  watch(ws.data, (data) => {
    if (!data) return

    const parsedData = JSON.parse(data) as Log

    logs.value.unshift({
      ...parsedData,
      seq: idx++
    })

    logs.value = logs.value.slice(0, 1000)
  })
}