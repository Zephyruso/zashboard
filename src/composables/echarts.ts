import { isMiddleScreen } from '@/helper/utils'
import { lowPowerMode } from '@/store/settings'
import { useDocumentVisibility, useElementSize } from '@vueuse/core'
import type { EChartsType } from 'echarts/core'
import { debounce } from 'lodash-es'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue'

type ChartElement = HTMLElement | null | undefined

type UseEChartOptions = {
  hideTipOnTouchEnd?: boolean
  resizeDebounceMs?: number
}

export const useEChart = (
  chartRef: Ref<ChartElement>,
  initChart: (element: HTMLElement) => EChartsType,
  options: UseEChartOptions = {},
) => {
  const chartInstance = shallowRef<EChartsType | null>(null)
  const { width, height } = useElementSize(chartRef)
  const documentVisible = useDocumentVisibility()
  const shouldResize = computed(() => documentVisible.value === 'visible' && !lowPowerMode.value)
  const resize = debounce(() => chartInstance.value?.resize(), options.resizeDebounceMs ?? 100)
  let touchTarget: HTMLElement | null = null
  let touchEndHandler: (() => void) | null = null

  const removeTouchHandler = () => {
    if (touchTarget && touchEndHandler) {
      touchTarget.removeEventListener('touchend', touchEndHandler)
    }
    touchTarget = null
    touchEndHandler = null
  }

  onMounted(() => {
    const element = chartRef.value
    if (!element) return

    chartInstance.value = initChart(element)

    if (options.hideTipOnTouchEnd === false || !isMiddleScreen.value) return

    touchTarget = element
    touchEndHandler = () => {
      chartInstance.value?.dispatchAction({ type: 'hideTip' })
    }
    touchTarget.addEventListener('touchend', touchEndHandler, { passive: true })
  })

  watch([width, height, shouldResize], () => {
    if (!shouldResize.value) {
      resize.cancel()
      return
    }

    resize()
  })

  onBeforeUnmount(() => {
    resize.cancel()
    removeTouchHandler()
    chartInstance.value?.dispose()
    chartInstance.value = null
  })

  return {
    chartInstance,
  }
}
