// 组装层 · sing-box native 工具面板(终端 / Tailscale / 网络工具)所需的 gRPC 基础设施出口。
// 工具面板是 sing-box native 专属能力,经此统一出口消费,使 view 不直接依赖 api 层。
export { getSingboxClient } from '@/api/singbox/client'
export { serverStream } from '@/api/singbox/serverStream'
export { runStream, type StreamHandle } from '@/api/singbox/streams'
export { GrpcWebSocketStream, type GrpcStatus } from '@/api/singbox/websocket'
