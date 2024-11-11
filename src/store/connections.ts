import { fetchConnectionsAPI } from "@/api";
import type { Connection, ConnectionRawMessage } from "@/types";
import { ref, watch } from "vue";

export const activeConnections = ref<Connection[]>([])
export const downloadTotal = ref(0)
export const uploadTotal = ref(0)
export const memory = ref(0)

export const connectionFilter = ref('')

export const initConnections = () => {
  const ws = fetchConnectionsAPI<string>()
  
  activeConnections.value = []
  watch(ws.data, (data) => {
    if (!data) return

    const parsedData = JSON.parse(data) as {
      connections: ConnectionRawMessage[]
      downloadTotal: number
      uploadTotal: number
      memory: number
    }

    downloadTotal.value = parsedData.downloadTotal
    uploadTotal.value = parsedData.uploadTotal
    memory.value = parsedData.memory
    activeConnections.value = parsedData.connections.map((connection) => {
      const preConnection = activeConnections.value.find((c) => c.id === connection.id)

      if (preConnection) {
        return {
          ...preConnection,
          downloadSpeed: connection.download - preConnection.download,
          uploadSpeed: connection.upload - preConnection.upload
        }
      } else {
        return {
          ...connection,
          downloadSpeed: connection.download,
          uploadSpeed: connection.upload
        }
      }

    })
  })
}