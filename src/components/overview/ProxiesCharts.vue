<template>
  <div
    :class="twMerge('relative h-96 w-full overflow-hidden')"
    @mousemove.stop
    @touchmove.stop
  >
    <div
      ref="chart"
      class="h-full w-full"
    />
    <span
      ref="colorRef"
      class="border-base-content/30 text-base-content/10 bg-base-100/70 hidden"
    />
    <button
      class=""
      :class="
        twMerge(
          'btn btn-ghost btn-circle btn-sm absolute right-1 bottom-1',
          isFullScreen ? 'fixed right-4 bottom-4 mb-[env(safe-area-inset-bottom)]' : '',
        )
      "
      @click="isFullScreen = !isFullScreen"
    >
      <component
        :is="isFullScreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon"
        class="h-4 w-4"
      />
    </button>
  </div>
  <Teleport to="body">
    <div
      v-if="isFullScreen"
      class="bg-base-100 custom-background fixed inset-0 z-[9999] h-screen w-screen bg-cover bg-center"
      :class="`blur-intensity-${blurIntensity} custom-background-${dashboardTransparent}`"
      :style="backgroundImage"
    >
      <div
        ref="fullScreenChart"
        class="bg-base-100 h-full w-full"
        :style="fullChartStyle"
      />
      <button
        class="btn btn-ghost btn-circle btn-sm fixed right-4 bottom-4 mb-[env(safe-area-inset-bottom)]"
        @click="isFullScreen = false"
      >
        <ArrowsPointingInIcon class="h-4 w-4" />
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ArrowsPointingInIcon, ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import { isSingBox } from '@renderer/api'
import { proxyGroupList, proxyMap } from '@renderer/store/proxies'
import { blurIntensity, dashboardTransparent, font, theme } from '@renderer/store/settings'
import { activeUuid } from '@renderer/store/setup'
import { useElementSize } from '@vueuse/core'
import { TreeChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { debounce } from 'lodash-es'
import { twMerge } from 'tailwind-merge'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { backgroundImage } from '../../helper/indexeddb'

echarts.use([TreeChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const isFullScreen = ref(false)
const colorRef = ref()
const chart = ref()
const fullScreenChart = ref()
const fullChartStyle = computed(() => {
  return `backdrop-filter: blur(${blurIntensity.value}px);`
})
const colorSet = {
  baseContent10: '',
  baseContent30: '',
  baseContent: '',
  base70: '',
}

let fontFamily = ''

const updateColorSet = () => {
  const colorStyle = getComputedStyle(colorRef.value)

  colorSet.baseContent = colorStyle.getPropertyValue('--color-base-content').trim()
  colorSet.baseContent10 = colorStyle.color
  colorSet.baseContent30 = colorStyle.borderColor
  colorSet.base70 = colorStyle.backgroundColor
}
const updateFontFamily = () => {
  const baseColorStyle = getComputedStyle(colorRef.value)

  fontFamily = baseColorStyle.fontFamily
}

type Tree = {
  name: string
  children?: Tree[]
  collapsed?: boolean
}

const forEachAllProxies = (data: Tree, depth: number) => {
  const children = proxyMap.value[data.name]

  if (children) {
    data.children = []
    children.all?.forEach((proxy, index) => {
      const childData = {
        name: proxy,
        value: proxy,
        collapsed: isFullScreen.value ? index % 2 === 0 : index !== 0,
      }
      data.children?.push(childData)
      forEachAllProxies(childData, depth + 1)
    })
  }
  if (data.children && data.children.length > 15) {
    data.collapsed = true
  }
}

const treeData = computed(() => {
  const rootName = isSingBox.value ? 'SingBox' : 'Mihomo'
  const data = {
    name: rootName,
    children: [] as Tree[],
    collapsed: false,
  }

  const maxLeafs = isFullScreen.value ? 10 : 3
  const every = Math.max(Math.floor(proxyGroupList.value.length / maxLeafs), 1)

  proxyGroupList.value.forEach((groupName: string, index) => {
    const childrenData: Tree = {
      name: groupName,
      collapsed: index % every !== 0,
    }
    const depth = 0

    forEachAllProxies(childrenData, depth)
    data.children.push(childrenData)
  })

  return [data]
})

const options = computed(() => {
  return {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: { name: string; treeAncestors: { name: string }[] }) => {
        const name = params.name

        if (params.treeAncestors.length <= 2) return name

        const treeAncestors = params.treeAncestors

        treeAncestors.splice(0, 2)
        return treeAncestors.map((item) => item.name).join(' > ')
      },
      backgroundColor: colorSet.base70,
      borderColor: colorSet.base70,
      confine: true,
      padding: [0, 5],
      textStyle: {
        color: colorSet.baseContent,
        fontFamily,
      },
    },
    series: [
      {
        type: 'tree',
        data: treeData.value,
        roam: true,
        top: '5%',
        left: '5%',
        bottom: '5%',
        right: '5%',
        symbolSize: 7,
        label: {
          position: 'left',
          verticalAlign: 'middle',
          align: 'right',
          fontSize: 9,
          color: colorSet.baseContent,
          fontFamily,
        },
        itemStyle: {
          color: colorSet.baseContent30,
        },
        lineStyle: {
          color: colorSet.baseContent10,
        },
        leaves: {
          label: {
            position: 'right',
            verticalAlign: 'middle',
            align: 'left',
          },
        },
        emphasis: {
          focus: 'descendant',
        },
        expandAndCollapse: true,
        animationThreshold: 99999999999,
        animationDuration: 550,
        animationDurationUpdate: 750,
        progressive: true,
        progressiveThreshold: 500,
        progressiveStep: 100,
        renderer: 'canvas',
        silent: false,
        animationEasing: 'cubicOut',
      },
    ],
  }
})

onMounted(() => {
  updateColorSet()
  updateFontFamily()

  watch(theme, updateColorSet)
  watch(font, updateFontFamily)

  const myChart = echarts.init(chart.value)
  const fullScreenMyChart = ref<echarts.ECharts>()

  myChart.setOption(options.value)

  watch([activeUuid, options, isFullScreen], () => {
    myChart?.clear()
    myChart?.setOption(options.value)

    if (isFullScreen.value) {
      nextTick(() => {
        if (!fullScreenMyChart.value) {
          fullScreenMyChart.value = echarts.init(fullScreenChart.value)
        }
        fullScreenMyChart.value?.clear()
        fullScreenMyChart.value?.setOption(options.value)
      })
    } else {
      fullScreenMyChart.value?.dispose()
      fullScreenMyChart.value = undefined
    }
  })

  const { width } = useElementSize(chart)
  const resize = debounce(() => {
    myChart.resize()
    fullScreenMyChart.value?.resize()
  }, 100)

  watch(width, resize)
})
</script>
