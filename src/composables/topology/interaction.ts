import { ref, type ComputedRef, type Ref } from 'vue'
import { LAYOUT_CONSTANTS, type Node } from './types'

const { NODE_WIDTH, NODE_HEIGHT } = LAYOUT_CONSTANTS

/**
 * 交互处理 Hook
 */
export function useTopologyInteraction(
  canvasRef: Ref<HTMLCanvasElement | undefined>,
  nodes: ComputedRef<Node[]>,
  renderScale: Ref<number>,
  renderOffsetX: Ref<number>,
  renderOffsetY: Ref<number>,
  scale: Ref<number>,
  offsetX: Ref<number>,
  offsetY: Ref<number>,
  getRenderedPos: (
    nodeId: string,
    fallbackX: number,
    fallbackY: number,
  ) => { x: number; y: number },
  animateViewTo: (toScale: number, toX: number, toY: number, duration?: number) => void,
  onDraw: () => void,
  onAnimationStart: () => void,
  hoveredRef?: Ref<string | null>,
) {
  const isDragging = ref(false)
  const lastMouseX = ref(0)
  const lastMouseY = ref(0)
  const hoveredNodeId = hoveredRef ?? ref<string | null>(null)

  /**
   * 根据鼠标坐标检测命中的节点
   */
  const hitTestNode = (mx: number, my: number): string | null => {
    for (const n of nodes.value) {
      const rp = getRenderedPos(n.id, n.x, n.y)
      const x = rp.x * renderScale.value + renderOffsetX.value
      const y = rp.y * renderScale.value + renderOffsetY.value
      const w = NODE_WIDTH * renderScale.value
      const h = NODE_HEIGHT * renderScale.value
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) return n.id
    }
    return null
  }

  /**
   * 重置视图
   */
  const resetView = () => {
    scale.value = 1
    offsetX.value = 0
    offsetY.value = 0
    animateViewTo(1, 0, 0, 260)
  }

  /**
   * 处理鼠标滚轮缩放
   */
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()

    const canvas = canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const baseScale = renderScale.value
    const targetScale = Math.max(0.1, Math.min(5, baseScale * delta))

    // 以当前渲染视图为基准，计算新目标偏移，保证鼠标点不漂移
    const targetX = mouseX - (mouseX - renderOffsetX.value) * (targetScale / baseScale)
    const targetY = mouseY - (mouseY - renderOffsetY.value) * (targetScale / baseScale)

    // 更新目标值
    scale.value = targetScale
    offsetX.value = targetX
    offsetY.value = targetY

    animateViewTo(targetScale, targetX, targetY, 180)
  }

  /**
   * 处理鼠标按下
   */
  const handleMouseDown = (e: MouseEvent) => {
    isDragging.value = true
    lastMouseX.value = e.clientX
    lastMouseY.value = e.clientY
  }

  /**
   * 处理鼠标移动（拖拽）
   */
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return

    const dx = e.clientX - lastMouseX.value
    const dy = e.clientY - lastMouseY.value

    offsetX.value += dx
    offsetY.value += dy
    renderOffsetX.value += dx
    renderOffsetY.value += dy

    lastMouseX.value = e.clientX
    lastMouseY.value = e.clientY

    onDraw()
  }

  /**
   * 处理鼠标释放
   */
  const handleMouseUp = () => {
    isDragging.value = false
  }

  /**
   * 处理指针移动（hover 检测）
   */
  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    if (isDragging.value) return

    const canvas = canvasRef.value
    if (!canvas) return

    let clientX = 0,
      clientY = 0
    if ('touches' in e) {
      if (e.touches.length === 0) return
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    const hitId = hitTestNode(mx, my)
    if (hoveredNodeId.value !== hitId) {
      hoveredNodeId.value = hitId
      onAnimationStart() // 确保淡化动画进行
      onDraw()
    }
  }

  /**
   * 清除 hover 状态
   */
  const clearHover = () => {
    if (hoveredNodeId.value != null) {
      hoveredNodeId.value = null
      onAnimationStart()
      onDraw()
    }
  }

  return {
    isDragging,
    hoveredNodeId,
    resetView,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handlePointerMove,
    clearHover,
  }
}
