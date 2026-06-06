const CONTAINER_ID = '__aria-live-region'

const getOrCreateRegion = (priority: 'assertive' | 'polite'): HTMLElement => {
  const id = `${CONTAINER_ID}-${priority}`
  let el = document.getElementById(id)

  if (!el) {
    el = document.createElement('div')
    el.id = id
    el.setAttribute('aria-live', priority)
    el.setAttribute('aria-atomic', 'true')
    el.setAttribute('role', priority === 'assertive' ? 'alert' : 'status')
    el.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'
    document.body.appendChild(el)
  }

  return el
}

const liveRegionState: Record<
  'assertive' | 'polite',
  {
    clearTimer?: ReturnType<typeof setTimeout>
    announceFrame?: number
  }
> = {
  assertive: {},
  polite: {},
}

export const announce = (message: string, priority: 'assertive' | 'polite' = 'polite') => {
  const region = getOrCreateRegion(priority)
  const state = liveRegionState[priority]

  if (state.announceFrame !== undefined) {
    cancelAnimationFrame(state.announceFrame)
    state.announceFrame = undefined
  }
  if (state.clearTimer !== undefined) {
    clearTimeout(state.clearTimer)
    state.clearTimer = undefined
  }

  region.textContent = ''

  state.announceFrame = requestAnimationFrame(() => {
    state.announceFrame = undefined
    region.textContent = message

    state.clearTimer = setTimeout(() => {
      region.textContent = ''
      state.clearTimer = undefined
    }, 1000)
  })
}
