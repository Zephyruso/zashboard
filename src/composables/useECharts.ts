import { isMiddleScreen } from '@/helper/utils'
import { font, theme } from '@/store/settings'
import { useElementSize } from '@vueuse/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { debounce } from 'lodash'
import type { ComputedRef, Ref } from 'vue'
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

export interface ChartColorSet {
  primary30: string
  primary60: string
  info30: string
  info60: string
  contentDim: string
  baseContent: string
  base70: string
}

// 从组件里隐藏 span 的 Tailwind 类反读主题色:
// border-t/b 携带 primary 的 60%/30%,border-r/l 携带 info 的 60%/30%,
// contentDim 取 span 的 text-base-content/N 类,透明度由各组件自行指定
export const useChartColors = (colorRef: Ref<HTMLElement | undefined>) => {
  const colorSet = reactive<ChartColorSet>({
    primary30: '',
    primary60: '',
    info30: '',
    info60: '',
    contentDim: '',
    baseContent: '',
    base70: '',
  })
  const fontFamily = ref('')

  const updateColorSet = () => {
    if (!colorRef.value) return
    const s = getComputedStyle(colorRef.value)

    colorSet.baseContent = s.getPropertyValue('--color-base-content').trim()
    colorSet.base70 = s.backgroundColor
    colorSet.contentDim = s.color
    colorSet.primary30 = s.borderBottomColor
    colorSet.primary60 = s.borderTopColor
    colorSet.info30 = s.borderLeftColor
    colorSet.info60 = s.borderRightColor
  }
  const updateFontFamily = () => {
    if (!colorRef.value) return
    fontFamily.value = getComputedStyle(colorRef.value).fontFamily
  }

  onMounted(() => {
    updateColorSet()
    updateFontFamily()
  })
  watch(theme, updateColorSet)
  watch(font, updateFontFamily)

  return { colorSet, fontFamily }
}

export const useEChartsInstance = <T extends echarts.EChartsCoreOption>(
  chartRef: Ref<HTMLElement | undefined>,
  options: ComputedRef<T>,
  { isPaused }: { isPaused?: Ref<boolean> } = {},
) => {
  let myChart: echarts.ECharts | null = null
  let touchEndHandler: ((e: TouchEvent) => void) | null = null

  onMounted(() => {
    if (!chartRef.value) return

    myChart = echarts.init(chartRef.value)
    myChart.setOption(options.value)

    watch(options, () => {
      if (isPaused?.value) return
      myChart?.setOption(options.value)
    })

    const { width } = useElementSize(chartRef)
    const resize = debounce(() => myChart?.resize(), 100)
    watch(width, resize)

    // 移动端：松手后自动隐藏 tooltip
    if (isMiddleScreen.value) {
      touchEndHandler = () => {
        myChart?.dispatchAction({ type: 'hideTip' })
      }
      chartRef.value.addEventListener('touchend', touchEndHandler)
    }
  })

  onUnmounted(() => {
    if (chartRef.value && touchEndHandler) {
      chartRef.value.removeEventListener('touchend', touchEndHandler)
    }
    if (myChart) {
      myChart.dispose()
      myChart = null
    }
  })
}
