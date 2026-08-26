// 组装层 · overview 门面。memory / traffic 统计流统一返回 { data, close } 流;
// Clash 通道走 WS,dae 通道走 /api/runtime/status 的共享轮询;
// honk 的 /stats 没有 WS,走 stats.ts 的轮询。
import { Channel, channel } from '@/assembly/backend'
import * as clash from './clash'
import * as dae from './dae'

const backend = () => (channel.value === Channel.Dae ? dae : clash)

export const fetchMemoryAPI = <T>() => backend().fetchMemoryAPI<T>()

export const fetchTrafficAPI = <T>() => backend().fetchTrafficAPI<T>()

export { fetchHonkStats, honkStats, startHonkStats, stopHonkStats } from './stats'
