<template>
  <div class="relative h-48 w-full overflow-hidden xl:h-64">
    <div
      ref="chart"
      class="h-full w-full"
    />
    <span
      :class="
        type === 'hit'
          ? 'border-b-primary/30 border-t-primary/60 border-l-primary/30 border-r-primary/60 text-base-content/10 bg-base-100/70 hidden'
          : 'border-b-info/30 border-t-info/60 border-l-info/30 border-r-info/60 text-base-content/10 bg-base-100/70 hidden'
      "
      ref="colorRef"
    />
    <div
      v-if="barData.length === 0"
      class="text-base-content/50 absolute inset-0 flex items-center justify-center"
    >
      <div class="text-center">
        <div>{{ t('noData') }}</div>
      </div>
    </div>
    <button
      class="btn btn-ghost btn-xs absolute right-1 bottom-0"
      @click="isPaused = !isPaused"
    >
      <component
        :is="!isPaused ? PauseCircleIcon : PlayCircleIcon"
        class="h-4 w-4"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { isMiddleScreen } from '@/helper/utils'
import { rules } from '@/assembly/rules'
import { font, theme } from '@/store/settings'
import type { Rule } from '@/types'
import { PauseCircleIcon, PlayCircleIcon } from '@heroicons/vue/24/outline'
import { useElementSize } from '@vueuse/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { debounce } from 'lodash'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  type: 'hit' | 'miss'
}>()

const { t } = useI18n()
const colorRef = ref()
const chart = ref()
const isPaused = ref(false)
const colorSet = {
  primary30: '',
  primary60: '',
  info30: '',
  info60: '',
  baseContent10: '',
  baseContent: '',
  base70: '',
}

let fontFamily = ''

const updateColorSet = () => {
  const colorStyle = getComputedStyle(colorRef.value)

  colorSet.baseContent = colorStyle.getPropertyValue('--color-base-content').trim()
  colorSet.base70 = colorStyle.backgroundColor
  colorSet.baseContent10 = colorStyle.color
  if (props.type === 'hit') {
    colorSet.primary30 = colorStyle.borderTopColor
    colorSet.primary60 = colorStyle.borderBottomColor
  } else {
    colorSet.info30 = colorStyle.borderTopColor
    colorSet.info60 = colorStyle.borderBottomColor
  }
}

const updateFontFamily = () => {
  const baseColorStyle = getComputedStyle(colorRef.value)
  fontFamily = baseColorStyle.fontFamily
}

const barData = computed(() => {
  const maxItems = isMiddleScreen.value ? 16 : 40
  const getValue = (rule: Rule) => {
    return props.type === 'hit' ? rule.extra?.hitCount || 0 : rule.extra?.missCount || 0
  }
  const rulesWithCount = rules.value
    .filter((rule) => rule.extra)
    .sort((a, b) => getValue(b) - getValue(a))
    .slice(0, maxItems)
    .map((rule) => {
      const key = `${rule.type}\n${rule.payload}`
      const count = getValue(rule)
      return { name: key, value: count }
    })

  return rulesWithCount
})

const options = computed(() => {
  if (barData.value.length === 0) {
    return {}
  }

  const categories = barData.value.map((item) => item.name)
  const values = barData.value.map((item) => item.value)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: colorSet.base70,
      borderColor: colorSet.base70,
      confine: true,
      padding: [8, 12],
      textStyle: {
        color: colorSet.baseContent,
        fontFamily,
      },
      formatter: (params: { name: string; value: number }) => {
        const param = Array.isArray(params) ? params[0] : params
        const translationKey = props.type === 'hit' ? 'ruleHitCount' : 'ruleMissCount'
        return `
          <div>
            <div class="font-semibold">${param.name}</div>
            <div class="text-sm opacity-80 mt-1">${t(translationKey, { count: param.value })}</div>
          </div>
        `
      },
    },
    grid: {
      left: '2%',
      right: '2%',
      top: '10%',
      bottom: '5%',
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colorSet.baseContent,
        fontFamily,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
          color: colorSet.baseContent10,
        },
      },
      axisLabel: {
        color: colorSet.baseContent,
        fontFamily,
      },
    },
    series: [
      {
        name: t('rule'),
        type: 'bar',
        data: values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: props.type === 'hit' ? colorSet.primary60 : colorSet.info60,
            },
            {
              offset: 1,
              color: props.type === 'hit' ? colorSet.primary30 : colorSet.info30,
            },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          formatter: (params: { value: number }) => {
            return params.value
          },
          color: colorSet.baseContent,
          fontFamily,
        },
        emphasis: {
          itemStyle: {
            color: props.type === 'hit' ? colorSet.primary60 : colorSet.info60,
          },
        },
      },
    ],
  }
})

let myChart: echarts.ECharts | null = null
let touchEndHandler: ((e: TouchEvent) => void) | null = null

onMounted(() => {
  updateColorSet()
  updateFontFamily()

  watch(theme, updateColorSet)
  watch(font, updateFontFamily)
  watch(() => props.type, updateColorSet)

  myChart = echarts.init(chart.value)

  myChart.setOption(options.value)

  watch(options, () => {
    if (isPaused.value) {
      return
    }
    myChart?.setOption(options.value)
  })

  watch(barData, () => {
    if (isPaused.value) {
      return
    }
    if (myChart && barData.value.length > 0) {
      myChart.setOption(options.value)
    } else if (myChart && barData.value.length === 0) {
      myChart.clear()
    }
  })

  watch(isMiddleScreen, () => {
    if (isPaused.value) {
      return
    }
    if (myChart && barData.value.length > 0) {
      myChart.setOption(options.value)
    }
  })

  const { width } = useElementSize(chart)
  const resize = debounce(() => {
    myChart?.resize()
  }, 100)

  watch(width, resize)

  // 移动端：松手后自动隐藏 tooltip
  if (isMiddleScreen.value && chart.value) {
    touchEndHandler = () => {
      if (myChart) {
        myChart.dispatchAction({ type: 'hideTip' })
      }
    }
    chart.value.addEventListener('touchend', touchEndHandler)
  }
})

onUnmounted(() => {
  if (chart.value && touchEndHandler) {
    chart.value.removeEventListener('touchend', touchEndHandler)
  }
  if (myChart) {
    myChart.dispose()
    myChart = null
  }
})
</script>
