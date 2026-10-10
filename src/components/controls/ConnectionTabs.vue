<template>
  <SegmentedControl
    v-model="connectionTabShow"
    :options="tabOptions"
    :block="!horizental"
    @reselect="handleReselect"
  />
  <Teleport to="body">
    <Transition name="connection-tab-menu">
      <div
        v-if="isMenuOpen"
        ref="menuRef"
        role="menu"
        class="border-base-border bg-base-100 overlay-glass fixed z-[998] flex min-w-32 flex-col gap-1 rounded-lg border p-1 shadow-lg backdrop-blur-sm"
        :style="menuStyle"
      >
        <button
          v-for="item in menuItems"
          :key="item.label"
          role="menuitemradio"
          :aria-checked="showClosedOnly === item.closedOnly"
          class="hover:bg-base-200 flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
          @click="selectFilter(item.closedOnly)"
        >
          <CheckIcon
            class="h-4 w-4 flex-none"
            :class="showClosedOnly !== item.closedOnly && 'invisible'"
          />
          <span class="whitespace-nowrap">{{ item.label }}</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { CONNECTION_TAB_TYPE } from '@/constant'
import {
  connections,
  connectionTabShow,
  renderConnections,
  showClosedOnly,
} from '@/store/connections'
import { CheckIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SegmentedControl from '../common/SegmentedControl.vue'

defineProps({
  horizental: {
    type: Boolean,
    default: true,
  },
})

const { t } = useI18n()
const connectionsCount = computed(() => {
  if (renderConnections.value.length !== connections.value.length) {
    return `${renderConnections.value.length} / ${connections.value.length}`
  }

  return connections.value.length
})

const tabLabel = (tab: CONNECTION_TAB_TYPE) => {
  if (tab === CONNECTION_TAB_TYPE.ALL && showClosedOnly.value) {
    return t('closedConnections')
  }

  return t(tab)
}

const tabOptions = computed(() =>
  Object.values(CONNECTION_TAB_TYPE).map((tab) => ({
    value: tab,
    label: tabLabel(tab),
    count: connectionTabShow.value === tab ? connectionsCount.value : undefined,
    suffixIcon:
      tab === CONNECTION_TAB_TYPE.ALL && connectionTabShow.value === tab
        ? ChevronDownIcon
        : undefined,
  })),
)

const menuItems = computed(() => [
  { label: t('allConnections'), closedOnly: false },
  { label: t('closedConnections'), closedOnly: true },
])

const MENU_GAP = 4
const isMenuOpen = ref(false)
const menuRef = ref<HTMLDivElement>()
const anchorRef = ref<HTMLElement>()
const menuStyle = ref<Record<string, string>>({})

const updatePosition = () => {
  const rect = anchorRef.value?.getBoundingClientRect()

  if (!rect) return

  const width = menuRef.value?.offsetWidth ?? 0

  menuStyle.value = {
    top: `${rect.bottom + MENU_GAP}px`,
    left: `${Math.max(MENU_GAP, Math.min(rect.left, window.innerWidth - width - MENU_GAP))}px`,
  }
}

const handlePointerDown = (event: PointerEvent) => {
  const target = event.target as Node | null

  if (target && (menuRef.value?.contains(target) || anchorRef.value?.contains(target))) return

  closeMenu()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeMenu()
}

const listen = (add: boolean) => {
  const fn = add ? window.addEventListener : window.removeEventListener

  fn('scroll', updatePosition, true)
  fn('resize', updatePosition)
  fn('pointerdown', handlePointerDown as EventListener, true)
  fn('keydown', handleKeydown as EventListener)
}

const openMenu = (anchor: HTMLElement) => {
  anchorRef.value = anchor
  updatePosition()
  isMenuOpen.value = true
  listen(true)
  nextTick(updatePosition)
}

function closeMenu() {
  if (!isMenuOpen.value) return

  isMenuOpen.value = false
  listen(false)
}

const handleReselect = (value: string, event: MouseEvent) => {
  if (value !== CONNECTION_TAB_TYPE.ALL) return

  if (isMenuOpen.value) {
    closeMenu()
    return
  }

  openMenu(event.currentTarget as HTMLElement)
}

const selectFilter = (closedOnly: boolean) => {
  showClosedOnly.value = closedOnly
  closeMenu()
}

onBeforeUnmount(closeMenu)
</script>

<style scoped>
.connection-tab-menu-enter-active,
.connection-tab-menu-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.connection-tab-menu-enter-from,
.connection-tab-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
