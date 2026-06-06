<template>
  <nav
    ref="sidebarRef"
    :aria-label="$t('mainNavigation')"
    class="sidebar border-base-content/10 bg-base-200/80 text-base-content scrollbar-hidden h-full overflow-x-hidden border-r p-2 shadow-sm backdrop-blur-xl transition-[width,padding] duration-320 ease-[cubic-bezier(0.32,0.72,0,1)]"
    :class="isSidebarCollapsed ? 'w-18 px-0' : 'w-64'"
    @transitionend="handleTransitionEnd"
  >
    <div :class="twMerge('flex h-full flex-col gap-2', isSidebarCollapsed ? 'w-18 px-0' : 'w-60')">
      <ul
        class="menu w-full flex-1"
        role="list"
      >
        <li
          v-for="r in renderRoutes"
          :key="r"
          @mouseenter="(e) => mouseenterHandler(e, r)"
        >
          <button
            :class="[
              r === route.name ? 'menu-active' : '',
              isSidebarCollapsed && 'justify-center',
              'my-0.5 w-full rounded-2xl py-2 font-medium transition-[background-color,color,transform] duration-200 active:scale-95',
            ]"
            :aria-current="r === route.name ? 'page' : undefined"
            @click.passive="() => navigateRoute(r)"
          >
            <component
              :is="ROUTE_ICON_MAP[r]"
              class="h-5 w-5"
              aria-hidden="true"
            />
            <template v-if="!isSidebarCollapsed">
              {{ $t(r) }}
            </template>
          </button>
        </li>
      </ul>
      <template v-if="isSidebarCollapsed">
        <VerticalInfos v-if="showStatisticsWhenSidebarCollapsed">
          <SidebarButtons vertical />
        </VerticalInfos>
        <SidebarButtons
          v-else
          vertical
        />
      </template>
      <template v-else>
        <OverviewCarousel />
        <CommonSidebar class="base-container" />
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import CommonSidebar from '@/components/sidebar/CommonCtrl.vue'
import { ROUTE_ICON_MAP } from '@/constant'
import { renderRoutes } from '@/helper'
import { useTooltip } from '@/helper/tooltip'
import router from '@/router'
import { isSidebarCollapsed, showStatisticsWhenSidebarCollapsed } from '@/store/settings'
import { twMerge } from 'tailwind-merge'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import OverviewCarousel from './OverviewCarousel.vue'
import SidebarButtons from './SidebarButtons.vue'
import VerticalInfos from './VerticalInfos.vue'

const emit = defineEmits<{
  transitionend: []
}>()

const sidebarRef = ref<HTMLDivElement>()
const { showTip } = useTooltip()
const { t } = useI18n()

const mouseenterHandler = (e: MouseEvent, r: string) => {
  if (!isSidebarCollapsed.value) return
  showTip(e, t(r), {
    placement: 'right',
  })
}

const route = useRoute()

const navigateRoute = (name: string) => {
  if (route.name === name) return
  void router.push({ name })
}

const handleTransitionEnd = (e: TransitionEvent) => {
  if (e.target !== sidebarRef.value || e.propertyName !== 'width') return
  emit('transitionend')
}
</script>
