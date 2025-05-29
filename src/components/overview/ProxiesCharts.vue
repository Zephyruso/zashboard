<template>
  <div
    :class="
      twMerge(
        'relative h-96 w-full overflow-hidden',
        isFullScreen ? 'bg-base-100 fixed inset-0 z-50 h-screen w-screen' : '',
      )
    "
    @mousemove.stop
    @touchmove.stop
  >
    <div
      ref="chart"
      class="h-full w-full"
    />
    <span
      class="border-base-content/30 text-base-content/10 bg-base-100/70 hidden"
      ref="colorRef"
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
</template>

<script setup lang="ts">
import { ArrowsPointingInIcon, ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import { isSingBox } from '@renderer/api'
import { proxyGroupList, proxyMap } from '@renderer/store/proxies'
import { font, theme } from '@renderer/store/settings'
import { activeUuid } from '@renderer/store/setup'
import { useElementSize } from '@vueuse/core'
import { TreeChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { debounce } from 'lodash'
import { twMerge } from 'tailwind-merge'
import { computed, onMounted, ref, watch } from 'vue'

echarts.use([TreeChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const isFullScreen = ref(false)
const colorRef = ref()
const chart = ref()
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

  myChart.setOption(options.value)

  watch([activeUuid, options, isFullScreen], () => {
    myChart?.clear()
    myChart?.setOption(options.value)
  })

  const { width } = useElementSize(chart)
  const resize = debounce(() => {
    myChart.resize()
  }, 100)

  watch(width, resize)
})
</script>
