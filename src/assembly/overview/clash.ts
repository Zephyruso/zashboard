// Clash WS 后端的概览统计流(memory / traffic)。
import { createClashWebSocket } from '@/api/clash'

export const fetchMemoryAPI = <T>() => createClashWebSocket<T>('memory')

export const fetchTrafficAPI = <T>() => createClashWebSocket<T>('traffic')
