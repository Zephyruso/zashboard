// 组装层 · overview 门面。memory / traffic 统计流按后端类型路由,统一返回 { data, close } 流。
import { Channel, channel } from '@/assembly/backend'
import * as clash from './clash'
import * as singbox from './singbox'

const backend = () => (channel.value === Channel.Singbox ? singbox : clash)

export const fetchMemoryAPI = <T>() => backend().fetchMemoryAPI<T>()

export const fetchTrafficAPI = <T>() => backend().fetchTrafficAPI<T>()
