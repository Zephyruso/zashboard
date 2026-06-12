export type LogKind =
  | 'connection'
  | 'connection-error'
  | 'dns-resolve'
  | 'dns-error'
  | 'server-listening'
  | 'config-loaded'
  | 'resource-loaded'
  | 'rule-set'
  | 'process-lookup'
  | 'metadata'
  | 'error'
  | 'info'

export type LogTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'

export type LogFieldLayout = 'pill' | 'tile' | 'block' | 'chain'

export interface LogField {
  label: string
  value: string
  icon?: string
  tone?: LogTone
  mono?: boolean
  copyable?: boolean
  empty?: boolean
  layout?: LogFieldLayout
}

export interface ParsedLog {
  kind: LogKind
  title: string
  subtitle?: string
  fields: LogField[]
  group?: 'network' | 'routing' | 'system' | 'error' | 'raw'
}

const ipV4Regex = /^(\d{1,3}\.){3}\d{1,3}(?::\d+)?$/
const ipV6Regex = /^\[[0-9a-fA-F:]+\](?::\d+)?$/

export const isIpLike = (host: string): boolean => ipV4Regex.test(host) || ipV6Regex.test(host)

const splitHostPort = (raw: string): { host: string; port: string } => {
  const text = raw.trim()
  if (!text) return { host: '', port: '' }

  // IPv6 with brackets: [::1]:443
  const ipv6Match = text.match(/^\[([0-9a-fA-F:]+)\]:(\d+)$/)
  if (ipv6Match) {
    return { host: ipv6Match[1], port: ipv6Match[2] }
  }

  // Plain IPv6 without port: ::1
  if (text.includes(':') && !text.includes('.') && text.split(':').length > 2) {
    return { host: text, port: '' }
  }

  // host:port
  const lastColon = text.lastIndexOf(':')
  if (lastColon > 0 && /^\d+$/.test(text.slice(lastColon + 1))) {
    return { host: text.slice(0, lastColon), port: text.slice(lastColon + 1) }
  }

  return { host: text, port: '' }
}

const parseRule = (raw: string): { type: string; payload: string } => {
  const text = raw.trim()
  if (!text || text === 'MATCH' || text === 'FINAL') {
    return { type: text || '', payload: '' }
  }
  // IP-CIDR(192.168.0.0/16) or IP-CIDR,192.168.0.0/16
  const paren = text.match(/^([A-Z0-9-]+)\((.+)\)$/)
  if (paren) {
    return { type: paren[1], payload: paren[2] }
  }
  const slash = text.match(/^([A-Z0-9-]+)\/(.+)$/)
  if (slash) {
    return { type: slash[1], payload: slash[2] }
  }
  return { type: text, payload: '' }
}

const parseProxyChain = (raw: string): string[] => {
  return raw
    .split('->')
    .map((s) => s.trim())
    .filter(Boolean)
}

const buildConnectionFields = (params: {
  protocol: string
  source: { host: string; port: string }
  destination: { host: string; port: string }
  rule?: { type: string; payload: string }
  proxy: string[]
  mode?: string
  noRule?: boolean
  error?: string
}): ParsedLog => {
  const { protocol, source, destination, rule, proxy, mode, noRule, error } = params
  const isError = !!error

  const fields: LogField[] = []
  const group: ParsedLog['group'] = isError ? 'error' : 'network'

  // Network group
  fields.push(
    {
      label: 'Protocol',
      value: protocol.toUpperCase(),
      icon: 'bolt',
      tone: protocol.toUpperCase() === 'TCP' ? 'info' : 'primary',
      mono: true,
      layout: 'pill',
    },
    {
      label: 'Source IP',
      value: source.host || '—',
      icon: 'arrow-up-right',
      tone: 'neutral',
      mono: true,
      copyable: true,
      empty: !source.host,
      layout: 'tile',
    },
    {
      label: 'Source port',
      value: source.port || '—',
      icon: 'hashtag',
      tone: 'neutral',
      mono: true,
      empty: !source.port,
      layout: 'pill',
    },
    {
      label: 'Destination',
      value: destination.host || '—',
      icon: 'globe-alt',
      tone: isIpLike(destination.host) ? 'primary' : 'info',
      mono: true,
      copyable: true,
      empty: !destination.host,
      layout: 'block',
    },
    {
      label: 'Destination port',
      value: destination.port || '—',
      icon: 'hashtag',
      tone: 'neutral',
      mono: true,
      empty: !destination.port,
      layout: 'pill',
    },
  )

  // Routing group
  const routing: LogField[] = []
  if (rule && rule.type) {
    routing.push({
      label: 'Rule type',
      value: rule.type,
      icon: 'tag',
      tone: 'success',
      mono: true,
      layout: 'pill',
    })
    if (rule.payload) {
      routing.push({
        label: 'Rule payload',
        value: rule.payload,
        icon: 'document-text',
        tone: 'success',
        mono: true,
        copyable: true,
        layout: 'block',
      })
    }
  } else if (noRule) {
    routing.push({
      label: 'Rule',
      value: "doesn't match any rule",
      icon: 'minus-circle',
      tone: 'warning',
      layout: 'block',
    })
  }

  if (mode) {
    routing.push({
      label: 'Mode',
      value: mode,
      icon: 'cog-6-tooth',
      tone: 'neutral',
      layout: 'pill',
    })
  }

  if (proxy.length === 1) {
    routing.push({
      label: 'Proxy',
      value: proxy[0],
      icon: 'server',
      tone: isError ? 'error' : 'primary',
      layout: 'tile',
    })
  } else if (proxy.length > 1) {
    routing.push({
      label: 'Chain',
      value: proxy.join(' → '),
      icon: 'arrow-right-start-on-rectangle',
      tone: 'primary',
      mono: true,
      copyable: true,
      layout: 'chain',
    })
  }

  if (routing.length) {
    fields.push(...routing)
  }

  if (error) {
    fields.push({
      label: 'Error',
      value: error,
      icon: 'exclamation-triangle',
      tone: 'error',
      copyable: true,
      layout: 'block',
    })
  }

  return {
    kind: isError ? 'connection-error' : 'connection',
    title: isError
      ? `${protocol.toUpperCase()} connection failed`
      : `${protocol.toUpperCase()} connection`,
    subtitle: proxy.length ? proxy.join(' → ') : undefined,
    fields,
    group,
  }
}

export const parseLog = (payload: string): ParsedLog => {
  const text = payload.trim()

  // ---- 1. Connection log ----
  // Successful: [TCP] src --> dst match RuleType(Payload) using Proxy -> Hop2
  //            [TCP] src --> dst match MATCH using Proxy
  //            [TCP] src --> dst doesn't match any rule using Proxy
  //            [TCP] src --> dst using GLOBAL|DIRECT|SPECIAL
  const connOkPatterns: RegExp[] = [
    /^\[([A-Za-z0-9-]+)\]\s+(\S+)\s+-->\s+(\S+)\s+match\s+(\S+)\s+using\s+(.+)$/,
    /^\[([A-Za-z0-9-]+)\]\s+(\S+)\s+-->\s+(\S+)\s+doesn't\s+match\s+any\s+rule\s+using\s+(.+)$/,
    /^\[([A-Za-z0-9-]+)\]\s+(\S+)\s+-->\s+(\S+)\s+using\s+(GLOBAL|DIRECT)$/,
    /^\[([A-Za-z0-9-]+)\]\s+(\S+)\s+-->\s+(\S+)\s+using\s+(\S+)$/,
  ]

  for (const pattern of connOkPatterns) {
    const m = pattern.exec(text)
    if (m) {
      const protocol = m[1]
      const source = splitHostPort(m[2])
      const destination = splitHostPort(m[3])

      // Pattern 1: matched with rule
      if (pattern === connOkPatterns[0]) {
        const rule = parseRule(m[4])
        const proxy = parseProxyChain(m[5])
        return buildConnectionFields({
          protocol,
          source,
          destination,
          rule,
          proxy,
        })
      }

      // Pattern 2: doesn't match any rule
      if (pattern === connOkPatterns[1]) {
        const proxy = parseProxyChain(m[4])
        return buildConnectionFields({
          protocol,
          source,
          destination,
          proxy,
          noRule: true,
        })
      }

      // Pattern 3 & 4: using GLOBAL/DIRECT or special proxy
      const modeOrProxy = m[4]
      if (modeOrProxy === 'GLOBAL' || modeOrProxy === 'DIRECT') {
        return buildConnectionFields({
          protocol,
          source,
          destination,
          mode: modeOrProxy,
          proxy: [modeOrProxy],
        })
      }
      // Special proxy
      return buildConnectionFields({
        protocol,
        source,
        destination,
        proxy: [modeOrProxy],
      })
    }
  }

  // ---- 2. Connection error log ----
  // [TCP] Proxy (match RuleType/Payload) src --> dst error: message
  // [TCP] dial Proxy src --> dst error: message
  const errMatch = text.match(
    /^\[([A-Za-z0-9-]+)\]\s+(?:dial\s+)?(\S+?)\s+\(match\s+(\S+?)\/(\S+?)\)\s+(\S+)\s+-->\s+(\S+)\s+error:\s*(.+)$/,
  )
  if (errMatch) {
    const [, protocol, proxy, ruleType, rulePayload, src, dst, error] = errMatch
    return buildConnectionFields({
      protocol,
      source: splitHostPort(src),
      destination: splitHostPort(dst),
      rule: { type: ruleType, payload: rulePayload },
      proxy: [proxy],
      error: error.trim(),
    })
  }

  const errSimple = text.match(
    /^\[([A-Za-z0-9-]+)\]\s+(?:dial\s+)?(\S+)\s+(\S+)\s+-->\s+(\S+)\s+error:\s*(.+)$/,
  )
  if (errSimple) {
    const [, protocol, proxy, src, dst, error] = errSimple
    return buildConnectionFields({
      protocol,
      source: splitHostPort(src),
      destination: splitHostPort(dst),
      proxy: [proxy],
      error: error.trim(),
    })
  }

  // ---- 3. DNS resolution success ----
  // [DNS] domain --> ip
  const dnsOk = text.match(/^\[DNS\]\s+(\S+)\s+(?:-->|->)\s+(\S+)$/)
  if (dnsOk) {
    const [, domain, answer] = dnsOk
    return {
      kind: 'dns-resolve',
      title: 'DNS resolution',
      group: 'network',
      fields: [
        {
          label: 'Domain',
          value: domain,
          icon: 'globe-alt',
          tone: 'info',
          mono: true,
          copyable: true,
          layout: 'block',
        },
        {
          label: 'Answer',
          value: answer,
          icon: isIpLike(answer) ? 'hashtag' : 'arrow-down-left',
          tone: 'success',
          mono: true,
          copyable: true,
          layout: 'tile',
        },
      ],
    }
  }

  // ---- 4. DNS resolution error ----
  // [DNS] resolve domain error: message
  const dnsErr = text.match(/^\[DNS\]\s+(?:resolve|lookup)\s+(\S+?)\s+error:\s*(.+)$/i)
  if (dnsErr) {
    const [, domain, message] = dnsErr
    return {
      kind: 'dns-error',
      title: 'DNS resolution failed',
      group: 'error',
      fields: [
        {
          label: 'Domain',
          value: domain,
          icon: 'globe-alt',
          tone: 'info',
          mono: true,
          copyable: true,
          layout: 'block',
        },
        {
          label: 'Error',
          value: message.trim(),
          icon: 'exclamation-triangle',
          tone: 'error',
          copyable: true,
          layout: 'block',
        },
      ],
    }
  }

  // ---- 5. DNS resolve attempt (debug) ----
  const dnsDebug = text.match(/^\[DNS\]\s+(?:resolve|lookup)\s+(\S+?):\s*(.+)$/i)
  if (dnsDebug) {
    const [, domain, message] = dnsDebug
    return {
      kind: 'dns-error',
      title: 'DNS lookup',
      group: 'error',
      fields: [
        {
          label: 'Domain',
          value: domain,
          icon: 'globe-alt',
          tone: 'info',
          mono: true,
          copyable: true,
          layout: 'block',
        },
        {
          label: 'Message',
          value: message.trim(),
          icon: 'chat-bubble-left',
          tone: 'warning',
          layout: 'block',
        },
      ],
    }
  }

  // ---- 6. Server listening ----
  const serverListen = text.match(
    /^(HTTP|SOCKS|SOCKS4|SOCKS5|REDIR|TPROXY|TUN|TCP|UDP|Mixed|Health|MITM|HTTP2?S?|VMESS|VLESS|Trojan|HY2?|Shadowsocks?)\s+server\s+(?:listening|started)\s+(?:at|on)\s*[:=]?\s*(\S+)/i,
  )
  if (serverListen) {
    const [, type, address] = serverListen
    return {
      kind: 'server-listening',
      title: `${type} server started`,
      group: 'system',
      fields: [
        { label: 'Type', value: type, icon: 'bolt', tone: 'primary', layout: 'pill' },
        {
          label: 'Address',
          value: address,
          icon: 'server',
          tone: 'success',
          mono: true,
          copyable: true,
          layout: 'block',
        },
      ],
    }
  }

  // ---- 7. Config loaded ----
  const configLoaded = text.match(/^Config\s+(?:file\s+)?(\S+)\s+loaded/i)
  if (configLoaded) {
    const [, path] = configLoaded
    return {
      kind: 'config-loaded',
      title: 'Configuration loaded',
      group: 'system',
      fields: [
        {
          label: 'Path',
          value: path,
          icon: 'document-text',
          tone: 'info',
          mono: true,
          copyable: true,
          layout: 'block',
        },
      ],
    }
  }

  // ---- 8. Resource loaded (GeoIP/GeoSite/MMDB/ASN) ----
  const resourceLoaded = text.match(
    /^(GeoIP|GeoSite|MMDB|ASN|IPCIDR)\s*(?:\(([^)]*)\))?\s+(?:loaded|updated|refreshed)\s*[:=]?\s*(.*)$/i,
  )
  if (resourceLoaded) {
    const [, type, scope, detail] = resourceLoaded
    return {
      kind: 'resource-loaded',
      title: `${type} resource`,
      group: 'system',
      fields: [
        { label: 'Type', value: type, icon: 'circle-stack', tone: 'primary', layout: 'pill' },
        ...(scope
          ? [
              {
                label: 'Scope',
                value: scope,
                icon: 'tag',
                tone: 'neutral' as const,
                mono: true,
                layout: 'pill' as const,
              },
            ]
          : []),
        ...(detail
          ? [
              {
                label: 'Detail',
                value: detail.trim(),
                icon: 'information-circle',
                tone: 'success' as const,
                layout: 'block' as const,
              },
            ]
          : []),
      ],
    }
  }

  // ---- 9. RuleSet ----
  const ruleSet = text.match(/^RuleSet(?:\s+\[([^\]]+)\])?\s+(\S+)\s+(?:loaded|updated)/i)
  if (ruleSet) {
    const [, name, action] = ruleSet
    return {
      kind: 'rule-set',
      title: 'RuleSet',
      group: 'system',
      fields: [
        ...(name
          ? ([
              {
                label: 'Name',
                value: name,
                icon: 'tag',
                tone: 'primary' as const,
                mono: true,
                layout: 'block' as const,
              },
            ] as LogField[])
          : []),
        { label: 'Action', value: action, icon: 'arrow-path', tone: 'success', layout: 'pill' },
      ],
    }
  }

  // ---- 10. Process lookup ----
  const processLookup = text.match(/^\[Process\]\s+(.+)$/i)
  if (processLookup) {
    const [, message] = processLookup
    return {
      kind: 'process-lookup',
      title: 'Process lookup',
      group: 'system',
      fields: [
        {
          label: 'Message',
          value: message.trim(),
          icon: 'cpu-chip',
          tone: 'neutral',
          layout: 'block',
        },
      ],
    }
  }

  // ---- 11. Metadata warning/error ----
  const metadataLog = text.match(/^\[Metadata(?: PreHandle)?\]\s+(.+)$/i)
  if (metadataLog) {
    const [, message] = metadataLog
    return {
      kind: 'metadata',
      title: 'Metadata',
      group: 'system',
      fields: [
        {
          label: 'Message',
          value: message.trim(),
          icon: 'identification',
          tone: 'warning',
          layout: 'block',
        },
      ],
    }
  }

  // ---- 12. Fallback ----
  const looksLikeError =
    /\b(error|failed|timeout|refused|reset|unreachable|denied|invalid|panic|cannot|unable)\b/i.test(
      text,
    )

  if (looksLikeError) {
    return {
      kind: 'error',
      title: 'Error',
      group: 'error',
      fields: [
        {
          label: 'Message',
          value: text,
          icon: 'exclamation-triangle',
          tone: 'error',
          copyable: true,
          layout: 'block',
        },
      ],
    }
  }

  return {
    kind: 'info',
    title: 'Log entry',
    group: 'raw',
    fields: [
      {
        label: 'Message',
        value: text,
        icon: 'information-circle',
        tone: 'info',
        copyable: true,
        layout: 'block',
      },
    ],
  }
}
