import { ref, shallowReactive } from 'vue'
import type { PanelMotion } from './panel-motion'

export const openDialogCount = ref(0)

export const dimmedOverlayCount = ref(0)

export type OverlayDimState = number | { motion: PanelMotion; start: number }

export const animatedOverlayDims = shallowReactive(new Map<symbol, OverlayDimState>())
