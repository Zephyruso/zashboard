import { getHistoryByName } from '@/assembly/proxies'
import { getColorForLatency } from '@/helper'
import dayjs from 'dayjs'

/*
 * 延迟标签的历史 tooltip 内容。DOM 卡片(LatencyTag)与 Canvas 网格共用一份,
 * 两条渲染路线下悬停看到的东西必须完全一样。
 *
 * 没有历史记录时返回 null,调用方据此决定不弹。
 */
export const buildLatencyHistoryTip = (name: string, groupName?: string) => {
  const history = getHistoryByName(name, groupName)

  if (!history.length) return null

  const historyList = document.createElement('div')

  historyList.classList.add('flex', 'flex-col', 'gap-1')
  for (const item of history) {
    const itemDiv = document.createElement('div')
    const time = document.createElement('div')
    const latency = document.createElement('div')

    time.textContent = dayjs(item.time).format('YYYY-MM-DD HH:mm:ss')
    latency.textContent = item.delay + 'ms'
    latency.className = getColorForLatency(item.delay)

    itemDiv.classList.add('flex', 'items-center', 'gap-2')
    itemDiv.append(time, latency)
    historyList.append(itemDiv)
  }

  return historyList
}
