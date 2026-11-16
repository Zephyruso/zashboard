<template>
  <div
    class="home-page bg-base-200 flex size-full"
    :class="sidebarLayoutCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'"
  >
    <div
      v-if="!isMiddleScreen"
      class="relative z-40 flex-none overflow-visible transition-none"
      :class="sidebarLayoutCollapsed ? 'w-18' : 'w-64'"
    >
      <SideBar
        class="absolute inset-y-0 left-0"
        @transitionend="syncSidebarLayoutState"
      />
    </div>
    <RouterView v-slot="{ Component, route }">
      <div
        class="relative flex-1 overflow-hidden"
        ref="swiperRef"
      >
        <div
          ref="pageRef"
          class="absolute flex h-full w-full flex-col overflow-y-auto"
        >
          <Transition
            :name="pageTransitionName"
            :mode="pageTransitionMode"
            @before-leave="onPageBeforeLeave"
          >
            <Component :is="Component" />
          </Transition>
        </div>

        <template v-if="isMiddleScreen">
          <nav
            class="tab-bar absolute right-3 left-3 z-30"
            :style="{
              bottom: 'calc(var(--spacing) * 2 + env(safe-area-inset-bottom))',
              '--tab-count': renderRoutes.length,
              '--tab-index': Math.max(renderRoutes.indexOf(route.name as ROUTE_NAME), 0),
            }"
            ref="dockRef"
          >
            <span
              v-if="renderRoutes.includes(route.name as ROUTE_NAME)"
              class="tab-bar-indicator"
            />
            <button
              v-for="r in renderRoutes"
              :key="r"
              @click="router.push({ name: r, replace: true })"
              class="tab-bar-item"
              :aria-current="r === route.name ? 'page' : undefined"
            >
              <component
                :is="ROUTE_ICON_MAP[r]"
                class="tab-bar-icon"
              />
              <span class="tab-bar-label">
                {{ $t(r) }}
              </span>
            </button>
          </nav>
          <div
            class="fixed bottom-0 z-10 w-full"
            style="
              background: linear-gradient(
                to top,
                rgba(0, 0, 0, 0.18) 0%,
                rgba(0, 0, 0, 0.1) 30%,
                rgba(0, 0, 0, 0.04) 60%,
                rgba(0, 0, 0, 0.01) 85%,
                rgba(0, 0, 0, 0) 100%
              );
              height: env(safe-area-inset-bottom);
            "
          ></div>
        </template>
      </div>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { isBackendAvailable } from '@/assembly/probe'
import { startBackendSession } from '@/assembly/session'
import SideBar from '@/components/sidebar/SideBar.vue'
import { dockTop } from '@/helper/padding-views'
import { checkUIUpdate } from '@/assembly/version'
import { pageTransitionMode, pageTransitionName } from '@/helper/page-transition'
import { useSwipeRouter } from '@/composables/use-swipe-router'
import { ROUTE_ICON_MAP, ROUTE_NAME } from '@/constant'
import { renderRoutes } from '@/helper'
import { isMiddleScreen } from '@/helper/utils'
import { fetchProxies } from '@/assembly/proxies'
import { isSidebarCollapsed } from '@/store/settings'
import { activeBackend, activeUuid } from '@/store/setup'
import { useDocumentVisibility, useElementBounding } from '@vueuse/core'
import { ref, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'

const router = useRouter()
const { swiperRef, pageRef, onPageBeforeLeave } = useSwipeRouter()
const sidebarLayoutCollapsed = ref(isSidebarCollapsed.value)

const dockRef = ref<HTMLDivElement>()
const { top: dockRefTop } = useElementBounding(dockRef)

const syncSidebarLayoutState = () => {
  sidebarLayoutCollapsed.value = isSidebarCollapsed.value
}

watch(isSidebarCollapsed, (value) => {
  if (value) {
    sidebarLayoutCollapsed.value = true
  }
})

watch(
  isMiddleScreen,
  (value) => {
    if (!value) {
      sidebarLayoutCollapsed.value = isSidebarCollapsed.value
    }
  },
  { immediate: true },
)

watch(
  dockRefTop,
  () => {
    dockTop.value = window.innerHeight - dockRefTop.value
  },
  { immediate: true },
)

const documentVisible = useDocumentVisibility()

watch(
  documentVisible,
  async () => {
    if (!activeBackend.value || documentVisible.value !== 'visible') return

    const uuid = activeBackend.value.uuid

    if (await isBackendAvailable(activeBackend.value)) return
    if (uuid === activeUuid.value) startBackendSession()
  },
  {
    immediate: true,
  },
)

watch(documentVisible, () => {
  if (documentVisible.value !== 'visible') return
  fetchProxies()
})

checkUIUpdate()
</script>

<style>
.tab-bar {
  display: flex;
  height: 3.875rem;
  padding: 0.25rem;
  border-radius: 9999px;
  background-color: color-mix(in oklab, var(--color-base-100) 20%, transparent);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid color-mix(in srgb, var(--color-base-content) 8%, transparent);
  box-shadow:
    0 4px 16px color-mix(in srgb, var(--color-base-content) 6%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 35%, transparent),
    inset 0 0 0 1px color-mix(in srgb, white 6%, transparent);
}

.tab-bar-indicator {
  position: absolute;
  top: 0.25rem;
  bottom: 0.25rem;
  left: 0.25rem;
  width: calc((100% - 0.5rem) / var(--tab-count));
  border-radius: 9999px;
  background-color: color-mix(in srgb, var(--color-base-content) 9%, transparent);
  transform: translateX(calc(100% * var(--tab-index)));
  transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);
  pointer-events: none;
}

.tab-bar-item {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  border-radius: 9999px;
  color: color-mix(in srgb, var(--color-base-content) 75%, transparent);
  outline: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.2s ease,
    transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}

.tab-bar-item:active {
  transform: scale(0.92);
}

.tab-bar-item[aria-current='page'] {
  color: var(--color-primary);
}

.tab-bar-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.tab-bar-icon {
  width: 1.3rem;
  height: 1.3rem;
  flex-shrink: 0;
}

.tab-bar-label {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.625rem;
  font-weight: 500;
  line-height: 0.75rem;
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-bar-item[aria-current='page'] .tab-bar-label {
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .tab-bar-indicator,
  .tab-bar-item {
    transition: none;
  }
}

.slide-right-enter-active,
.slide-right-leave-active,
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform var(--page-transition-duration) var(--page-transition-ease);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
  backface-visibility: hidden;
}

.slide-left-enter-from {
  transform: translateX(calc(100% + var(--swipe-offset, 0px)));
}
.slide-left-enter-to {
  transform: translateX(0);
}
.slide-left-leave-from {
  transform: translateX(var(--swipe-offset, 0px));
}
.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-from {
  transform: translateX(calc(-100% + var(--swipe-offset, 0px)));
}
.slide-right-enter-to {
  transform: translateX(0);
}
.slide-right-leave-from {
  transform: translateX(var(--swipe-offset, 0px));
}
.slide-right-leave-to {
  transform: translateX(100%);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease-in-out;
  will-change: opacity;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.custom-background :is(.page-enter-active, .page-leave-active) {
  transition: none;
  will-change: auto;
}
.custom-background :is(.page-enter-from, .page-leave-to) {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .slide-right-enter-active,
  .slide-right-leave-active,
  .slide-left-enter-active,
  .slide-left-leave-active,
  .page-enter-active,
  .page-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
