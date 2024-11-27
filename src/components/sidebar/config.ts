import { useStorage } from '@vueuse/core'

export const isSiderbarCollapsed = useStorage('config/is-sidebar-collapsed', false)
