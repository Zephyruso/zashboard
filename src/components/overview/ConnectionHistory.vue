<template>
  <div class="card w-full">
    <div class="card-title px-4 pt-4">
      {{ $t('totalConnections') }}
      <span class="text-base-content/80 font-normal"> ({{ allConnections.length }}) </span>
    </div>
    <div class="card-body gap-4">
      <div class="bg-base-200/50 grid grid-cols-1 gap-2 rounded-lg px-4 py-2 lg:grid-cols-3">
        <div class="flex h-14 flex-col items-start justify-center gap-1">
          <div class="text-sm">
            {{ $t('mostDownloadHost') }}
          </div>
          <div class="text-base">{{ mostDownloadHost.host }} = {{ mostDownloadHost.download }}</div>
        </div>
        <div class="flex h-14 flex-col items-start justify-center gap-1">
          <div class="text-sm">
            {{ $t('mostDownloadSourceIP') }}
          </div>
          <div class="text-base">
            {{ mostDownloadSourceIP.sourceIP }} = {{ mostDownloadSourceIP.download }}
          </div>
        </div>
        <div class="flex h-14 flex-col items-start justify-center gap-1">
          <div class="text-sm">
            {{ $t('mostDownloadProxy') }}
          </div>
          <div class="text-base">
            {{ mostDownloadProxy.proxy }} = {{ mostDownloadProxy.download }}
          </div>
        </div>
        <div class="flex h-14 flex-col items-start justify-center gap-1">
          <div class="text-sm">
            {{ $t('mostUploadHost') }}
          </div>
          <div class="text-base">{{ mostUploadHost.host }} = {{ mostUploadHost.upload }}</div>
        </div>
        <div class="flex h-14 flex-col items-start justify-center gap-1">
          <div class="text-sm">
            {{ $t('mostUploadSourceIP') }}
          </div>
          <div class="text-base">
            {{ mostUploadSourceIP.sourceIP }} = {{ mostUploadSourceIP.upload }}
          </div>
        </div>
        <div class="flex h-14 flex-col items-start justify-center gap-1">
          <div class="text-sm">
            {{ $t('mostUploadProxy') }}
          </div>
          <div class="text-base">{{ mostUploadProxy.proxy }} = {{ mostUploadProxy.upload }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { prettyBytesHelper } from '@/helper/utils'
import { activeConnections, closedConnections } from '@/store/connections'
import type { Connection } from '@/types'
import { computed } from 'vue'

const allConnections = computed(() => {
  return activeConnections.value.concat(closedConnections.value)
})

const usageMap = computed(() => {
  const hostMap: Record<string, { key: string; download: number; upload: number }> = {}
  const proxyMap: Record<string, { key: string; download: number; upload: number }> = {}
  const sourceIPMap: Record<string, { key: string; download: number; upload: number }> = {}

  const addConnectionToHostMap = (connection: Connection) => {
    const hostkey = (connection.metadata.host || connection.metadata.sniffHost)
      ?.split('.')
      .slice(-2)
      .join('.')
    const key = hostkey || connection.metadata.destinationIP

    if (key in hostMap) {
      hostMap[key].download += connection.download
      hostMap[key].upload += connection.upload
    } else {
      hostMap[key] = {
        key,
        download: connection.download,
        upload: connection.upload,
      }
    }
  }

  const addConnectionToProxyMap = (connection: Connection) => {
    const key = connection.chains[0]

    if (key in proxyMap) {
      proxyMap[key].download += connection.download
      proxyMap[key].upload += connection.upload
    } else {
      proxyMap[key] = {
        key,
        download: connection.download,
        upload: connection.upload,
      }
    }
  }

  const addConnectionToSourceIPMap = (connection: Connection) => {
    const key = connection.metadata.sourceIP

    if (key in sourceIPMap) {
      sourceIPMap[key].download += connection.download
      sourceIPMap[key].upload += connection.upload
    } else {
      sourceIPMap[key] = {
        key,
        download: connection.download,
        upload: connection.upload,
      }
    }
  }

  allConnections.value.forEach((connection) => {
    addConnectionToHostMap(connection)
    addConnectionToProxyMap(connection)
    addConnectionToSourceIPMap(connection)
  })

  return {
    hostMap,
    proxyMap,
    sourceIPMap,
  }
})

const mostDownloadHost = computed(() => {
  const conn = Object.entries(usageMap.value.hostMap).sort(
    (a, b) => b[1].download - a[1].download,
  )?.[0]

  if (!conn) {
    return {
      host: '',
      download: 0,
    }
  }

  return {
    host: conn[0],
    download: prettyBytesHelper(conn[1].download),
  }
})

const mostUploadHost = computed(() => {
  const conn = Object.entries(usageMap.value.hostMap).sort((a, b) => b[1].upload - a[1].upload)?.[0]

  if (!conn) {
    return {
      host: '',
      upload: 0,
    }
  }

  return {
    host: conn[0],
    upload: prettyBytesHelper(conn[1].upload),
  }
})

const mostDownloadSourceIP = computed(() => {
  const conn = Object.entries(usageMap.value.sourceIPMap).sort(
    (a, b) => b[1].download - a[1].download,
  )?.[0]

  if (!conn) {
    return {
      sourceIP: '',
      download: 0,
    }
  }

  return {
    sourceIP: conn[0],
    download: prettyBytesHelper(conn[1].download),
  }
})

const mostUploadSourceIP = computed(() => {
  const conn = Object.entries(usageMap.value.sourceIPMap).sort(
    (a, b) => b[1].upload - a[1].upload,
  )?.[0]

  if (!conn) {
    return {
      sourceIP: '',
      upload: 0,
    }
  }

  return {
    sourceIP: conn[0],
    upload: prettyBytesHelper(conn[1].upload),
  }
})

const mostDownloadProxy = computed(() => {
  const conn = Object.entries(usageMap.value.proxyMap).sort(
    (a, b) => b[1].download - a[1].download,
  )?.[0]

  if (!conn) {
    return {
      proxy: '',
      download: 0,
    }
  }

  return {
    proxy: conn[0],
    download: prettyBytesHelper(conn[1].download),
  }
})

const mostUploadProxy = computed(() => {
  const conn = Object.entries(usageMap.value.proxyMap).sort(
    (a, b) => b[1].upload - a[1].upload,
  )?.[0]

  if (!conn) {
    return {
      proxy: '',
      upload: 0,
    }
  }

  return {
    proxy: conn[0],
    upload: prettyBytesHelper(conn[1].upload),
  }
})
</script>
