<template>
  <div
    class="sidebar bg-base-200 text-base-content scrollbar-hidden h-full w-64 overflow-x-hidden p-2 transition-all"
  >
    <div :class="twMerge('flex h-full w-full flex-col gap-2')">
      <ul class="menu w-full flex-1">
        <li
          v-for="r in renderRoutes"
          :key="r"
          @mouseenter="(e) => mouseenterHandler(e, r)"
        >
          <a
            :class="[r === route.name ? 'menu-active' : '', 'py-2']"
            @click.passive="() => router.push({ name: r })"
          >
            <component
              :is="ROUTE_ICON_MAP[r]"
              class="h-5 w-5"
            />
            {{ $t(r) }}
          </a>
        </li>
      </ul>

      <AppOverview />
      <OverviewCarousel
        v-if="route.name !== ROUTE_NAME.overview"
        class="w-full"
      />
      <div class="card">
        <CommonSidebar />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommonSidebar from '@/components/sidebar/CommonCtrl.vue'
import { ROUTE_ICON_MAP, ROUTE_NAME } from '@/constant'
import { renderRoutes } from '@/helper'
import { useTooltip } from '@/helper/tooltip'
import router from '@/router'
import { twMerge } from 'tailwind-merge'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AppOverview from './AppOverview.vue'
import OverviewCarousel from './OverviewCarousel.vue'

const { showTip } = useTooltip()
const { t } = useI18n()

const mouseenterHandler = (e: MouseEvent, r: string) => {
  showTip(e, t(r), {
    placement: 'right',
  })
}

const route = useRoute()
</script>
