import { fetchSmartGroupWeightsAPI, fetchSmartWeightsAPI } from '@/api'
import type { NodeRank } from '@/types'
import { ref } from 'vue'

export const smartWeightsMap = ref<Record<string, Record<string, string>>>({})
export const smartOrderMap = ref<Record<string, string[]>>({})

const restructWeights = (proxyName: string, weights: NodeRank[]) => {
  const smartWeights: Record<string, string> = {}
  const smartOrder: string[] = []

  for (const weight of weights) {
    smartWeights[weight.Name] = weight.Rank
    smartOrder.push(weight.Name)
  }

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
