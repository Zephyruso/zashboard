<template>
  <div class="card bg-base-100 w-full p-1 m-1 shadow-xl gap-1">
    <div class="flex gap-2">
      <span class="badge text-primary">
        {{ conn.metadata.host || conn.metadata.destinationIP }} 
        <span class="hidden sm:inline">: {{ conn.metadata.destinationPort }}</span>
      </span>
      <div class="flex-1"></div>
      <span class="badge text-success">
        <span class="hidden sm:inline">{{ $t('download') }}</span>
        <span>{{ prettyBytes(conn.downloadSpeed) }}/s</span>
        <span class="hidden sm:inline">{{ prettyBytes(conn.download) }}</span>
      </span>
      <span class="badge hidden sm:inline">
        {{ $t('upload') }} {{ prettyBytes(conn.uploadSpeed) }}/s  {{ prettyBytes(conn.upload) }} 
      </span>
    </div>
    <div class="flex gap-2">
      <span class="badge hidden sm:inline">
        {{ conn.rule }}
      </span>
      <span class="badge">
        {{ [...conn.chains].reverse().join(' -> ') }}
      </span>
      <div class="flex-1"></div>
      <span class="badge">
        {{ dayjs(conn.start).locale('zh-cn').fromNow() }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Connection } from '@/types';
import dayjs from 'dayjs';
import prettyBytes from 'pretty-bytes';

defineProps<{
  conn: Connection
}>()

</script>
