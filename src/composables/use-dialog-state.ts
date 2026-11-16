import {
  animatedOverlayDims,
  dimmedOverlayCount,
  openDialogCount,
  type OverlayDimState,
} from '@/helper/dialog'
import { onUnmounted, watch, type Ref } from 'vue'

const useCount = (count: Ref<number>, active: Ref<boolean | undefined>) => {
  let held = false

  const acquire = () => {
    if (held) return
    held = true
    count.value++
  }

  const release = () => {
    if (!held) return
    held = false
    count.value--
  }

  watch(active, (val) => (val ? acquire() : release()), { immediate: true })
  onUnmounted(release)
}

export const useDialogOpenState = (isOpen: Ref<boolean | undefined>) => {
  useCount(openDialogCount, isOpen)
  useCount(dimmedOverlayCount, isOpen)
}

export const useOverlayDimState = (
  isDimmed: Ref<boolean | undefined>,
  state?: Ref<OverlayDimState>,
) => {
  if (!state) {
    useCount(dimmedOverlayCount, isDimmed)
    return
  }

  const owner = Symbol()
  watch(
    [isDimmed, state],
    ([active, value]) => {
      if (active) animatedOverlayDims.set(owner, value)
      else animatedOverlayDims.delete(owner)
    },
    { immediate: true, flush: 'sync' },
  )
  onUnmounted(() => animatedOverlayDims.delete(owner))
}
