import ipaddr from 'ipaddr.js'

// Browser shim for Node's `net` module. mmdb-lib only relies on `net.isIP`,
// which we back with the already-bundled ipaddr.js.
export const isIP = (input: string): number => {
  if (ipaddr.IPv4.isValid(input)) {
    return 4
  }

  if (ipaddr.IPv6.isValid(input)) {
    return 6
  }

  return 0
}

export default { isIP }
