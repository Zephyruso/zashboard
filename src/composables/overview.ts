import { ref } from 'vue'

type IPInfo = {
  ip: string[]
  ipWithPrivacy: string[]
}

export const ipForChina = ref<IPInfo>({
  ip: [],
  ipWithPrivacy: [],
})
export const ipForGlobal = ref<IPInfo>({
  ip: [],
  ipWithPrivacy: [],
})

// 每个目标保存多次测速的结果(ms;0 表示该次失败),用于概览页柱状图展示。
export const baiduLatency = ref<number[]>([])
export const githubLatency = ref<number[]>([])
export const youtubeLatency = ref<number[]>([])
export const cloudflareLatency = ref<number[]>([])
