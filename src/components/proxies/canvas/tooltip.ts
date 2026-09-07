import { useTooltip } from '@/helper/tooltip'
import type { Props } from 'tippy.js'

/*
 * tippy 要一个 DOM 元素来定位,画布里没有。于是在网格上盖一层不吃事件的容器,
 * 悬停目标一变就按它的几何放一个看不见的锚点元素进去,tippy 挂在锚点上。
 *
 * 每次都新建锚点是刻意的:helper/tooltip 的 showTip 按 currentTarget 去重,
 * 复用同一个元素的话,从一个节点移到另一个节点时提示不会刷新。
 */

export type AnchorRect = { x: number; y: number; width: number; height: number }

export class CanvasTooltip {
  private anchor: HTMLElement | null = null
  private key = ''
  private readonly tip = useTooltip()

  constructor(private readonly layer: () => HTMLElement | null) {}

  /**
   * key 相同就什么都不做(同一目标上的连续 mousemove)。content 为空表示这个目标没得可提示,
   * 但仍要记住 key,免得每一次移动都重新计算内容。
   */
  show(
    key: string,
    rect: AnchorRect,
    content: () => string | HTMLElement | null,
    config: Partial<Props>,
  ) {
    if (key === this.key) return

    this.hide()
    this.key = key

    const layer = this.layer()

    if (!layer) return

    const body = content()

    if (!body) return

    const anchor = document.createElement('div')

    anchor.style.cssText = `position:absolute;left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none`
    layer.appendChild(anchor)
    this.anchor = anchor

    // showTip 只读 currentTarget,构造一个最小的事件对象就够了。
    this.tip.showTip({ currentTarget: anchor } as unknown as Event, body, config)
  }

  hide() {
    this.key = ''
    if (!this.anchor) return

    this.tip.hideTip()
    this.anchor.remove()
    this.anchor = null
  }
}
