import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import { v4 as uuid } from 'uuid'
import { isEqual, omit } from 'lodash'

type Backend = {
  host: string,
  port: number,
  password: string,
  protocol: string,
  uuid: string
}

export const backendList = useStorage<Backend[]>('setup/api-list', [])
export const activeUuid = useStorage<string>('setup/active-uuid', '')
export const activeBackend = computed(() => backendList.value.find((backend) => backend.uuid === activeUuid.value))

export const addBackend = (backend: Omit<Backend, 'uuid'>) => {
  const currentEnd = backendList.value.find((end) => {
    return isEqual(omit(end, 'uuid'), backend)
  })

  if (currentEnd) {
    activeUuid.value = currentEnd.uuid
    return
  }

  const id = uuid()

  backendList.value.push({
    ...backend,
    uuid: id
  })
  activeUuid.value = id
}