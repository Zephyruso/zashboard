import { IP_INFO_API } from '@/constant'
import { IPInfoAPI } from '@/store/settings'

export interface IPInfo {
  ip: string
  country: string
  region: string
  city: string
  asn: string
  asnName: string
}

// china
export const getIPFromIpipnetAPI = async () => {
  const response = await fetch('https://myip.ipip.net/json')

  return (await response.json()) as {
    data: {
      ip: string
      location: string[]
    }
  }
}

// global
const getIPFromIpsbAPI = async (ip = '') => {
  const response = await fetch('https://api.ip.sb/geoip' + (ip ? `/${ip}` : ''))

  return (await response.json()) as {
    organization: string
    longitude: number
    city: string
    region: string
    timezone: string
    isp: string
    offset: number
    asn: number
    asn_organization: string
    country: string
    ip: string
    latitude: number
    postal_code: string
    continent_code: string
    country_code: string
    region_code: string
  }
}

const getIPFromIPWhoisAPI = async (ip = '') => {
  const response = await fetch('https://ipwho.is' + (ip ? `/${ip}` : ''))

  return (await response.json()) as {
    ip: string
    success: boolean
    type: string
    continent: string
    continent_code: string
    country: string
    country_code: string
    region: string
    region_code: string
    city: string
    latitude: number
    longitude: number
    is_eu: boolean
    postal: string
    calling_code: string
    capital: string
    borders: string
    flag: {
      img: string
      emoji: string
      emoji_unicode: string
    }
    connection: {
      asn: number
      org: string
      isp: string
      domain: string
    }
    timezone: {
      id: string
      abbr: string
      is_dst: boolean
      offset: number
      utc: string
      current_time: string
    }
  }
}

const getIPFromIPapiisAPI = async (ip = '') => {
  const response = await fetch('https://api.ipapi.is' + (ip ? `/?q=${ip}` : ''))

  return (await response.json()) as {
    ip: string
    rir: string
    is_bogon: boolean
    is_mobile: boolean
    is_satellite: boolean
    is_crawler: boolean
    is_datacenter: boolean
    is_tor: boolean
    is_proxy: boolean
    is_vpn: boolean
    is_abuser: boolean
    datacenter: {
      datacenter: string
      network: string
      region: string
      service: string
      network_border_group: string
    }
    company: {
      name: string
      abuser_score: string
      domain: string
      type: string
      network: string
      whois: string
    }
    abuse: {
      name: string
      address: string
      email: string
      phone: string
    }
    asn: {
      asn: number
      abuser_score: string
      route: string
      descr: string
      country: string
      active: boolean
      org: string
      domain: string
      abuse: string
      type: string
      created: string
      updated: string
      rir: string
      whois: string
    }
    location: {
      is_eu_member: boolean
      calling_code: string
      currency_code: string
      continent: string
      country: string
      country_code: string
      state: string
      city: string
      latitude: number
      longitude: number
      zip: string
      timezone: string
      local_time: string
      local_time_unix: number
      is_dst: boolean
    }
    elapsed_ms: number
  }
}

export const getIPInfo = async (ip = ''): Promise<IPInfo> => {
  switch (IPInfoAPI.value) {
    case IP_INFO_API.IPAPI:
      const ipapi = await getIPFromIPapiisAPI(ip)

      return {
        ip: ipapi.ip,
        country: ipapi.location.country,
        region: ipapi.location.state,
        city: ipapi.location.city,
        asn: ipapi.asn.asn.toString(),
        asnName: ipapi.asn.org,
      }
    case IP_INFO_API.IPSB:
      const ipsb = await getIPFromIpsbAPI(ip)

      return {
        ip: ipsb.ip,
        country: ipsb.country,
        region: ipsb.region,
        city: ipsb.city || ipsb.region,
        asn: ipsb.asn.toString(),
        asnName: ipsb.asn_organization,
      }
    default:
      const ipwhois = await getIPFromIPWhoisAPI(ip)

      return {
        ip: ipwhois.ip,
        region: ipwhois.region,
        country: ipwhois.country,
        city: ipwhois.city || ipwhois.region,
        asn: ipwhois.connection.asn.toString(),
        asnName: ipwhois.connection.org,
      }
  }
}
