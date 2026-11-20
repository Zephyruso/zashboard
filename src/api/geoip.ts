import { IP_INFO_API } from '@/constant'
import { IPInfoAPI } from '@/store/settings'
import * as ipaddr from 'ipaddr.js'

export interface IPInfo {
  ip: string
  country: string
  region: string
  city: string
  asn: string
  organization: string
  latitude: number | null
  longitude: number | null
}

const coordinate = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const ensureResponseOK = (response: Response, service: string) => {
  if (!response.ok) {
    throw new Error(`${service} lookup failed: ${response.status}`)
  }
}

export const getIPFromIpipnetAPI = async () => {
  const response = await fetch('https://myip.ipip.net/json', { cache: 'no-store' })
  ensureResponseOK(response, IP_INFO_API.IPIP)

  return (await response.json()) as {
    ret: string
    data: {
      ip: string
      location: string[]
    }
  }
}

export const getIPFromIpsbAPI = async (ip = '') => {
  const response = await fetch('https://api.ip.sb/geoip' + (ip ? `/${ip}` : ''), {
    cache: 'no-store',
  })
  ensureResponseOK(response, IP_INFO_API.IPSB)

  return (await response.json()) as {
    ip: string
    organization?: string
    asn_organization?: string
    asn?: number
    country?: string
    region?: string
    city?: string
    latitude?: number
    longitude?: number
  }
}

const getIPFromIPWhoisAPI = async (ip = '') => {
  const response = await fetch('https://ipwho.is' + (ip ? `/${ip}` : ''), {
    cache: 'no-store',
  })
  ensureResponseOK(response, IP_INFO_API.IPWHOIS)

  return (await response.json()) as
    | {
        ip: string
        success: true
        country?: string
        region?: string
        city?: string
        latitude?: number
        longitude?: number
        connection?: {
          asn?: number
          org?: string
        }
      }
    | {
        ip?: string
        success: false
        message: string
      }
}

const getIPFromIPapiisAPI = async (ip = '') => {
  const response = await fetch('https://api.ipapi.is' + (ip ? `/?q=${ip}` : ''), {
    cache: 'no-store',
  })
  ensureResponseOK(response, IP_INFO_API.IPAPI)

  return (await response.json()) as
    | {
        ip: string
        company_name: string | null
        asn_num: number | null
        asn_org: string | null
        cc: string | null
        lat: number | null
        lon: number | null
      }
    | {
        error: string
      }
}

const getIPFromVPNDetectionAPI = async (ip = '') => {
  const response = await fetch('https://api.vpndetection.io/' + (ip || 'myip'), {
    cache: 'no-store',
  })
  ensureResponseOK(response, IP_INFO_API.VPNDETECTION)

  return (await response.json()) as {
    ip: string
    location?: {
      country?: string
      country_name?: string
    }
    asn?: {
      asn?: number
      name?: string
    }
  }
}

export const getIPInfo = async (ip = '', api: IP_INFO_API = IPInfoAPI.value): Promise<IPInfo> => {
  switch (api) {
    case IP_INFO_API.IPIP:
      if (ip) {
        throw new Error('IPIP.net only supports public IP detection')
      }

      const ipip = await getIPFromIpipnetAPI()

      if (ipip.ret !== 'ok' || !ipaddr.isValid(ipip.data?.ip)) {
        throw new Error('IPIP.net lookup failed')
      }

      const [country = '', region = '', city = '', ...organizationParts] = ipip.data.location ?? []

      return {
        ip: ipip.data.ip,
        country,
        region,
        city,
        asn: '',
        organization: organizationParts.filter(Boolean).join(' '),
        latitude: null,
        longitude: null,
      }
    case IP_INFO_API.IPAPI:
      const ipapi = await getIPFromIPapiisAPI(ip)

      if ('error' in ipapi) {
        throw new Error(`ipapi.is lookup failed: ${ipapi.error}`)
      }

      return {
        ip: ipapi.ip,
        country: ipapi.cc ?? '',
        region: '',
        city: '',
        asn: ipapi.asn_num?.toString() ?? '',
        organization: ipapi.asn_org ?? ipapi.company_name ?? '',
        latitude: coordinate(ipapi.lat),
        longitude: coordinate(ipapi.lon),
      }
    case IP_INFO_API.VPNDETECTION:
      const vpndetection = await getIPFromVPNDetectionAPI(ip)

      return {
        ip: vpndetection.ip,
        country: vpndetection.location?.country_name || vpndetection.location?.country || '',
        region: '',
        city: '',
        asn: vpndetection.asn?.asn ? vpndetection.asn.asn.toString() : '',
        organization: vpndetection.asn?.name ?? '',
        latitude: null,
        longitude: null,
      }
    case IP_INFO_API.IPWHOIS:
      const ipwhois = await getIPFromIPWhoisAPI(ip)

      if (!ipwhois.success) {
        throw new Error(`IPWhois lookup failed: ${ipwhois.message}`)
      }

      return {
        ip: ipwhois.ip,
        region: ipwhois.region ?? '',
        country: ipwhois.country ?? '',
        city: ipwhois.city ?? '',
        asn: ipwhois.connection?.asn?.toString() ?? '',
        organization: ipwhois.connection?.org ?? '',
        latitude: coordinate(ipwhois.latitude),
        longitude: coordinate(ipwhois.longitude),
      }
    case IP_INFO_API.IPSB:
    default:
      const ipsb = await getIPFromIpsbAPI(ip)

      return {
        ip: ipsb.ip,
        country: ipsb.country ?? '',
        region: ipsb.region ?? '',
        city: ipsb.city ?? '',
        asn: ipsb.asn?.toString() ?? '',
        organization: ipsb.organization ?? ipsb.asn_organization ?? '',
        latitude: coordinate(ipsb.latitude),
        longitude: coordinate(ipsb.longitude),
      }
  }
}

export const getPublicIPInfo = async (api: IP_INFO_API): Promise<IPInfo> => {
  const info = await getIPInfo('', api)

  if (!ipaddr.isValid(info.ip)) {
    throw new Error(`${api} returned an invalid public IP`)
  }

  return info
}
