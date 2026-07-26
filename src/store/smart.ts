import { fetchSmartGroupWeightsAPI, fetchSmartWeightsAPI } from '@/assembly/proxies'
import type { NodeRank } from '@/types'
import { ref } from 'vue'

export const smartWeightsMap = ref<Record<string, Record<string, string>>>({})
export const smartOrderMap = ref<Record<string, Record<string, number>>>({})

const restructWeights = (proxyName: string, weights: NodeRank[]) => {
  const smartWeights: Record<string, string> = {}
  const smartOrder: Record<string, number> = {}

  weights.forEach((weight, index) => {
    smartWeights[weight.Name] = weight.Rank
    smartOrder[weight.Name] = index
  })

  smartWeightsMap.value[proxyName] = smartWeights
  smartOrderMap.value[proxyName] = smartOrder
}

// deprecated
const fetchSmartGroupWeights = async (proxyName: string) => {
  const { data } = await fetchSmartGroupWeightsAPI(proxyName)

  if (!data.weights?.length) return

  restructWeights(proxyName, data.weights)
}

export const initSmartWeights = async (smartGroups: string[]) => {
  const { status, data: smartWeights } = await fetchSmartWeightsAPI()

  smartWeightsMap.value = {}
  smartOrderMap.value = {}

  if (status !== 200) {
    // deprecated fallback
    smartGroups.forEach((name) => {
      fetchSmartGroupWeights(name)
    })
    return
  }

  for (const [group, weights] of Object.entries(smartWeights.weights)) {
    if (!weights?.length) continue

    restructWeights(group, weights)
  }
}
