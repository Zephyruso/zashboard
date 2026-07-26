import type { TailscaleEndpointStatus, TailscalePeer } from '@/gen/daemon/started_service_pb'
import { useStorage } from '@vueuse/core'

export interface TailscaleSSHPrefs {
  username: string
  terminalType: string
  remember: boolean
}

export interface SSHSessionOptions {
  endpointTag: string
  peerAddress: string
  peerName: string
  username: string
  terminalType: string
  hostKeys: string[]
}

export const SSH_DEFAULT_USERNAME = 'root'
export const SSH_DEFAULT_TERMINAL_TYPE = 'xterm-256color'

// Per-peer (keyed by stableID) SSH connection preferences, persisted locally.
export const sshPrefs = useStorage<Record<string, TailscaleSSHPrefs>>('config/tailscale-ssh', {})

export const saveSSHPrefs = (stableID: string, prefs: TailscaleSSHPrefs) => {
  sshPrefs.value = { ...sshPrefs.value, [stableID]: prefs }
}

export const allPeers = (endpoint: TailscaleEndpointStatus | undefined): TailscalePeer[] =>
  endpoint?.userGroups.flatMap((group) => group.peers) ?? []

export const peerDisplayName = (peer: TailscalePeer | undefined): string => {
  if (!peer) return ''
  if (peer.dnsName !== '') return peer.dnsName.split('.')[0]
  return peer.hostName || peer.tailscaleIPs[0] || peer.stableID
}

export const peerSSHAddress = (peer: TailscalePeer): string =>
  peer.tailscaleIPs.find((address) => !address.includes(':')) ??
  peer.tailscaleIPs[0] ??
  peer.dnsName

export const peerSSHAvailable = (peer: TailscalePeer): boolean =>
  peer.online && peer.sshHostKeys.length > 0 && peer.tailscaleIPs.length > 0

export const buildSSHSession = (
  endpointTag: string,
  peer: TailscalePeer,
  username: string,
  terminalType: string,
): SSHSessionOptions => ({
  endpointTag,
  peerAddress: peerSSHAddress(peer),
  peerName: peerDisplayName(peer),
  username,
  terminalType,
  hostKeys: peer.sshHostKeys,
})
