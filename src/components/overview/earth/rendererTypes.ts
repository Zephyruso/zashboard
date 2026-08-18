import type * as THREE from 'three/webgpu'
import type { EarthEndpointInfo, EarthLocation, EarthRoute } from './types'

export type EarthColorScheme = 'dark' | 'light'
export type EarthVisualMode = 'dots' | 'flat' | 'space'

export interface EarthRendererOptions {
  reducedMotion: boolean
  visualMode: EarthVisualMode
  colorScheme: EarthColorScheme
  onEndpointHover: (info: EarthEndpointInfo | null, x?: number, y?: number) => void
}

export interface EarthRenderer {
  setRoutes: (routes: EarthRoute[]) => void
  setInitialLocation: (location: EarthLocation) => void
  setReducedMotion: (reduced: boolean) => void
  setAutoRotation: (enabled: boolean) => void
  setCityLabelsVisible: (visible: boolean) => void
  setVisualMode: (mode: EarthVisualMode) => void
  setColorScheme: (scheme: EarthColorScheme) => void
  dispose: () => void
}

export interface EarthRenderEndpoint extends EarthEndpointInfo {
  key: string
  position: THREE.Vector3
}

export interface EarthRenderSnapshot {
  signature: string
  routes: readonly EarthRoute[]
  endpoints: readonly EarthRenderEndpoint[]
}
