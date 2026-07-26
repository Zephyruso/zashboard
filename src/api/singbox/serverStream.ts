// sing-box 常驻 server-streaming 订阅的 WebSocket 承载。
//
// ConnectRPC 的 fetch 版 gRPC-Web 传输里,每条 server-streaming 都长期占用一个
// HTTP/1.1 连接;常驻订阅(日志/连接/状态/分组/出站/工具面板状态)会耗尽浏览器
// 对单 host 的并发连接配额(通常 6 条),把一元请求(测延迟、切换节点等)卡在队列里。
// WebSocket 不计入该配额,因此常驻订阅一律改走 grpc-websockets 子协议
// (GrpcWebSocketStream,服务端已支持,终端/usbip 在用);一元与短时流仍走 fetch 传输。
//
// 本模块把 GrpcWebSocketStream 适配成 AsyncIterable,与 runStream 的
// factory 签名对齐,重连退避复用 runStream 原有逻辑。
import { getSingboxSecret, getSingboxUrlFromBackend } from '@/helper/utils'
import { activeBackend } from '@/store/setup'
import type { DescMessage, MessageInitShape, MessageShape } from '@bufbuild/protobuf'
import { GrpcWebSocketStream } from './websocket'

// 生成代码里 StartedService.method.* 描述符的结构子集(避免耦合 DescMethod 的具体联合类型)。
export interface ServerStreamMethod<Req extends DescMessage, Res extends DescMessage> {
  readonly name: string
  readonly parent: { readonly typeName: string }
  readonly input: Req
  readonly output: Res
}

export const serverStream = <Req extends DescMessage, Res extends DescMessage>(
  method: ServerStreamMethod<Req, Res>,
  request: MessageInitShape<Req>,
  signal: AbortSignal,
): AsyncIterable<MessageShape<Res>> => ({
  [Symbol.asyncIterator]() {
    const backend = activeBackend.value
    const baseUrl = backend ? getSingboxUrlFromBackend(backend) : ''
    // 抛出后由 runStream 退避重试,等待后端就绪。
    if (!backend || !baseUrl) throw new Error('sing-box backend unavailable')

    const queue: MessageShape<Res>[] = []
    let finished = false
    let failure: string | null = null
    let notify: (() => void) | null = null
    const wake = () => {
      notify?.()
      notify = null
    }

    const stream = new GrpcWebSocketStream({
      baseUrl,
      secret: getSingboxSecret(backend),
      service: method.parent.typeName,
      method: method.name,
      requestSchema: method.input,
      responseSchema: method.output,
      onMessage: (msg) => {
        queue.push(msg)
        wake()
      },
      onEnd: (status, error) => {
        finished = true
        if (error) failure = error
        else if (status && status.code !== 0)
          failure = `grpc-status ${status.code}: ${status.message}`
        wake()
      },
    })
    stream.send(request)
    stream.finishSend()

    // GrpcWebSocketStream.close() 不会回调 onEnd,abort 时需自行收尾。
    const onAbort = () => {
      finished = true
      stream.close()
      wake()
    }
    signal.addEventListener('abort', onAbort, { once: true })

    const finish = (): IteratorResult<MessageShape<Res>> => {
      signal.removeEventListener('abort', onAbort)
      stream.close()
      return { value: undefined, done: true }
    }

    return {
      async next(): Promise<IteratorResult<MessageShape<Res>>> {
        for (;;) {
          if (queue.length) return { value: queue.shift()!, done: false }
          if (finished) {
            const result = finish()
            if (failure && !signal.aborted) throw new Error(failure)
            return result
          }
          await new Promise<void>((resolve) => {
            notify = resolve
          })
        }
      },
      async return(): Promise<IteratorResult<MessageShape<Res>>> {
        finished = true
        return finish()
      },
    }
  },
})
