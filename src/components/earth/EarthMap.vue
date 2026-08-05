<script setup lang="ts">
import EarthToolbar from '@/components/earth/EarthToolbar.vue'
import { useEarthGlobe } from '@/composables/useEarthGlobe'
import { useEarthRoutes } from '@/composables/useEarthRoutes'

const {
  activeConnectionCount,
  isOriginLoading,
  loadOriginOptions,
  locatedConnections,
  originFailed,
  originLocation,
  originOptions,
  originOptionsLoading,
  originSource,
  routes,
} = useEarthRoutes()
const { mapContainer } = useEarthGlobe({ originLocation, routes })
</script>

<template>
  <main class="earth-page relative size-full overflow-hidden">
    <div
      ref="mapContainer"
      class="earth-map absolute inset-0"
      role="application"
      :aria-label="$t('earth')"
    />
    <div
      class="earth-vignette pointer-events-none absolute inset-0"
      aria-hidden="true"
    />

    <EarthToolbar
      v-model:origin-source="originSource"
      :active-connection-count="activeConnectionCount"
      :is-origin-loading="isOriginLoading"
      :located-connections="locatedConnections"
      :origin-failed="originFailed"
      :origin-options="originOptions"
      :origin-options-loading="originOptionsLoading"
      @refresh="loadOriginOptions"
    />
  </main>
</template>

<style scoped>
.earth-page {
  isolation: isolate;
  background: var(--color-base-200);
}

.earth-map {
  position: absolute;
  inset: 0;
}

.earth-vignette {
  z-index: 1;
  background:
    radial-gradient(
      circle at 50% 45%,
      transparent 38%,
      color-mix(in srgb, var(--color-base-200) 18%, transparent) 76%,
      color-mix(in srgb, var(--color-base-200) 42%, transparent) 100%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-base-200) 12%, transparent),
      transparent 24%,
      transparent 72%,
      color-mix(in srgb, var(--color-base-200) 22%, transparent)
    );
}

.earth-map :deep(.maplibregl-ctrl-group),
.earth-map :deep(.maplibregl-ctrl-attrib) {
  border: 1px solid color-mix(in srgb, var(--color-base-content) 10%, transparent);
  background: color-mix(in srgb, var(--color-base-100) 78%, transparent);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--color-base-300) 34%, transparent);
  backdrop-filter: blur(18px) saturate(135%);
}

.earth-map :deep(.maplibregl-ctrl-group) {
  overflow: hidden;
  border-radius: var(--radius-field);
}

.earth-map :deep(.maplibregl-ctrl-group button + button) {
  border-color: color-mix(in srgb, var(--color-base-content) 10%, transparent);
}

.earth-map :deep(.maplibregl-ctrl button) {
  transition:
    transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 160ms ease;
}

.earth-map :deep(.maplibregl-ctrl button:active) {
  transform: scale(0.94);
}

.earth-map :deep(.maplibregl-ctrl-icon) {
  opacity: 0.78;
  filter: var(--earth-control-icon-filter);
}

.earth-map :deep(.maplibregl-ctrl-attrib) {
  color: color-mix(in srgb, var(--color-base-content) 72%, transparent);
  border-radius: var(--radius-field) 0 0 0;
}

.earth-map :deep(.maplibregl-ctrl-attrib a) {
  color: inherit;
}

@media (hover: hover) and (pointer: fine) {
  .earth-map :deep(.maplibregl-ctrl button:hover) {
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .earth-map :deep(.maplibregl-ctrl button) {
    transition: background-color 160ms ease;
  }
}

@media (max-width: 767px) {
  .earth-map :deep(.maplibregl-ctrl-bottom-right) {
    bottom: calc(4rem + env(safe-area-inset-bottom));
  }
}
</style>
