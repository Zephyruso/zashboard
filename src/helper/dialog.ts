import { ref, shallowReactive } from 'vue'
import type { SpringMotion } from './spring-motion'

export const openDialogCount = ref(0)

export const dimmedOverlayCount = ref(0)

export type OverlayDimState = number | { motion: SpringMotion; start: number }

export const animatedOverlayDims = shallowReactive(new Map<symbol, OverlayDimState>())
