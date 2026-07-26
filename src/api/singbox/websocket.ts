import type { DescMessage, MessageInitShape, MessageShape } from '@bufbuild/protobuf'
import { create, fromBinary, toBinary } from '@bufbuild/protobuf'

// Bidirectional gRPC streaming over the improbable-eng/grpc-web
// "grpc-websockets" subprotocol that the sing-box API service accepts.
// ConnectRPC's grpc-web transport can't do client/bidi streaming, so the
// terminal (Tailscale SSH) needs this WebSocket-based transport.
// Ported from sing-box-dashboard (src/api/websocket.ts).

export interface GrpcStatus {
  code: number
  message: string
}

export interface WebSocketStreamOptions<Req extends DescMessage, Res extends DescMessage> {
  baseUrl: string
  secret: string
  service: string
  method: string
  requestSchema: Req
  responseSchema: Res
  onMessage(message: MessageShape<Res>): void
  onEnd(status: GrpcStatus | null, error?: string): void
}

const FINISH_SEND = new Uint8Array([1]) as Uint8Array<ArrayBuffer>

export class GrpcWebSocketStream<Req extends DescMessage, Res extends DescMessage> {
  private socket: WebSocket
  private buffer = new Uint8Array(0)
  private pendingSends: Uint8Array<ArrayBuffer>[] = []
  private opened = false
  private ended = false
  private headersSeen = false
  private status: GrpcStatus | null = null

  constructor(private options: WebSocketStreamOptions<Req, Res>) {
    const baseUrl = options.baseUrl.replace(/^http/, 'ws')
    this.socket = new WebSocket(`${baseUrl}/${options.service}/${options.method}`, [
      'grpc-websockets',
    ])
    this.socket.binaryType = 'arraybuffer'
    this.socket.onopen = () => {
      let headers = 'content-type: application/grpc-web+proto\r\nx-grpc-web: 1\r\n'
      if (options.secret) {
        headers += `authorization: Bearer ${options.secret}\r\n`
      }
      this.socket.send(new TextEncoder().encode(headers))
      this.opened = true
      for (const pending of this.pendingSends) {
        this.socket.send(pending)
      }
      this.pendingSends = []
    }
    this.socket.onmessage = (event) => {
      this.receive(new Uint8Array(event.data as ArrayBuffer))
    }
    this.socket.onerror = () => {
      this.end(null, 'websocket connection failed')
    }
    this.socket.onclose = (event) => {
      if (this.status) {
        this.end(this.status)
      } else {
        this.end(null, event.reason || 'websocket closed unexpectedly')
      }
    }
  }

  send(message: MessageInitShape<Req>) {
    const data = toBinary(this.options.requestSchema, create(this.options.requestSchema, message))
    const frame = new Uint8Array(6 + data.length)
    // frame[0]: websocket payload marker (0 = data); frame[1..5]: gRPC frame
    // header (flag + big-endian length).
    frame[2] = (data.length >>> 24) & 0xff
    frame[3] = (data.length >>> 16) & 0xff
    frame[4] = (data.length >>> 8) & 0xff
    frame[5] = data.length & 0xff
    frame.set(data, 6)
    this.enqueue(frame)
  }

  finishSend() {
    this.enqueue(FINISH_SEND)
  }

  close() {
    this.ended = true
    this.socket.close()
  }

  private enqueue(frame: Uint8Array<ArrayBuffer>) {
    if (this.opened) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(frame)
      }
    } else {
      this.pendingSends.push(frame)
    }
  }

  private end(status: GrpcStatus | null, error?: string) {
    if (this.ended) {
      return
    }
    this.ended = true
    this.socket.close()
    this.options.onEnd(status, error)
  }

  private receive(chunk: Uint8Array) {
    if (this.ended) {
      return
    }
    const merged = new Uint8Array(this.buffer.length + chunk.length)
    merged.set(this.buffer)
    merged.set(chunk, this.buffer.length)
    this.buffer = merged
    while (this.buffer.length >= 5) {
      const flag = this.buffer[0]
      const length =
        ((this.buffer[1] << 24) |
          (this.buffer[2] << 16) |
          (this.buffer[3] << 8) |
          this.buffer[4]) >>>
        0
      if (this.buffer.length < 5 + length) {
        return
      }
      const body = this.buffer.slice(5, 5 + length)
      this.buffer = this.buffer.slice(5 + length)
      if ((flag & 0x80) !== 0) {
        this.receiveMetadata(body)
      } else {
        try {
          this.options.onMessage(fromBinary(this.options.responseSchema, body))
        } catch (error) {
          this.end(null, `decode response: ${String(error)}`)
          return
        }
      }
    }
  }

  private receiveMetadata(body: Uint8Array) {
    const text = new TextDecoder().decode(body)
    const headers: Record<string, string> = {}
    for (const line of text.split('\r\n')) {
      const separator = line.indexOf(':')
      if (separator <= 0) {
        continue
      }
      headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim()
    }
    if (!this.headersSeen && !('grpc-status' in headers)) {
      this.headersSeen = true
      return
    }
    const code = Number(headers['grpc-status'] ?? '2')
    let message = headers['grpc-message'] ?? ''
    try {
      message = decodeURIComponent(message)
    } catch {
      // ignore
    }
    this.status = { code, message }
    this.end(this.status)
  }
}
