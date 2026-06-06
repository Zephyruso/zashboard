import { computed, type Ref } from 'vue'

const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

export const useStagger = (items: Ref<unknown[]>, options?: { step?: number; limit?: number }) => {
  const step = options?.step ?? 40
  const limit = options?.limit ?? 600

  const getItemStyle = (index: number) => {
    if (prefersReducedMotion) return undefined
    const delay = Math.min(index * step, limit)
    return { animationDelay: `${delay}ms` }
  }

  const staggerCount = computed(() => items.value.length)

  return { getItemStyle, staggerCount }
}
