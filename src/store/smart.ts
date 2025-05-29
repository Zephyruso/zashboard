import { fetchSmartGroupWeightsAPI } from '@renderer/api'
import { ref } from 'vue'

export const smartWeightsMap = ref<Record<string, Record<string, string>>>({})

export const fetchSmartGroupWeights = async (proxyName: string) => {
  const { data } = await fetchSmartGroupWeightsAPI(proxyName)

  smartWeightsMap.value[proxyName] = data.weights
}
