import type { Connection } from '@/types'
import { nextTick, ref } from 'vue'

const infoConn = ref<Connection | null>(null)
const connectionDetailModalShow = ref(false)

export const useConnections = () => {
  const handlerInfo = async (conn: Connection) => {
    infoConn.value = null
    await nextTick()
    infoConn.value = conn
    connectionDetailModalShow.value = true
  }

  return {
    infoConn,
    connectionDetailModalShow,
    handlerInfo,
  }
}
