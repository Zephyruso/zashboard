import { fetchSmartGroupWeightsAPI, fetchSmartWeightsAPI, isRequestCanceled } from '@/api'
import type { NodeRank } from '@/types'
import { ref } from 'vue'
import { activeUuid } from './setup'

export const smartWeightsMap = ref<Record<string, Record<string, string>>>({})
export const smartOrderMap = ref<Record<string, Record<string, number>>>({})
let smartWeightsSequence = 0
let smartWeightsAbortController: AbortController | undefined

export const clearSmartWeights = () => {
  smartWeightsSequence++
  smartWeightsAbortController?.abort()
  smartWeightsAbortController = undefined
  smartWeightsMap.value = {}
  smartOrderMap.value = {}
}

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
const fetchSmartGroupWeights = async (
  proxyName: string,
  backendUuid: string,
  sequence: number,
  signal?: AbortSignal,
) => {
  if (signal?.aborted) return

  const { data } = await fetchSmartGroupWeightsAPI(proxyName, signal)

  if (signal?.aborted || smartWeightsSequence !== sequence || activeUuid.value !== backendUuid)
    return
  if (!data.weights?.length) return

  restructWeights(proxyName, data.weights)
}

export const initSmartWeights = async (smartGroups: string[]) => {
  const sequence = ++smartWeightsSequence
  const backendUuid = activeUuid.value

  smartWeightsAbortController?.abort()

  if (!backendUuid) {
    return
  }

  const controller = new AbortController()
  smartWeightsAbortController = controller

  let res: Awaited<ReturnType<typeof fetchSmartWeightsAPI>>

  try {
    res = await fetchSmartWeightsAPI(controller.signal)
  } catch (error) {
    if (isRequestCanceled(error)) return
    throw error
  }

  if (
    controller.signal.aborted ||
    smartWeightsSequence !== sequence ||
    activeUuid.value !== backendUuid
  ) {
    if (smartWeightsAbortController === controller) {
      smartWeightsAbortController = undefined
    }
    return
  }

  smartWeightsMap.value = {}
  smartOrderMap.value = {}

  try {
    if (res.status !== 200) {
      // deprecated fallback
      await Promise.allSettled(
        smartGroups.map((name) =>
          fetchSmartGroupWeights(name, backendUuid, sequence, controller.signal),
        ),
      )
      return
    }

    for (const [group, weights] of Object.entries(res.data.weights)) {
      if (
        controller.signal.aborted ||
        smartWeightsSequence !== sequence ||
        activeUuid.value !== backendUuid
      )
        return
      if (!weights?.length) continue

      restructWeights(group, weights)
    }
  } finally {
    if (smartWeightsAbortController === controller) {
      smartWeightsAbortController = undefined
    }
  }
}
