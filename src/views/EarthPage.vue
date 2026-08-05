<script setup lang="ts">
import {
  downloadGeoIPCityDatabase,
  getGeoIPCityDatabaseDownloadSize,
  prepareGeoIPCityDatabase,
  type GeoIPCityDatabaseDownloadProgress,
} from '@/api/geoip'
import EarthMap from '@/components/earth/EarthMap.vue'
import { prettyBytesHelper } from '@/helper/utils'
import {
  ArrowDownTrayIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type DatabaseState = 'checking' | 'missing' | 'downloading' | 'error' | 'ready'
type DownloadSizeState = 'idle' | 'loading' | 'ready' | 'unavailable'

const databaseState = ref<DatabaseState>('checking')
const downloadProgress = ref<GeoIPCityDatabaseDownloadProgress>({ loadedBytes: 0 })
const downloadSize = ref<number>()
const downloadSizeState = ref<DownloadSizeState>('idle')
let downloadController: AbortController | undefined
let downloadSizeController: AbortController | undefined

const downloadPercent = computed(() => {
  const { loadedBytes, totalBytes } = downloadProgress.value

  if (!totalBytes) return undefined
  return Math.min(100, (loadedBytes / totalBytes) * 100)
})

const downloadProgressLabel = computed(() => {
  const { loadedBytes, totalBytes } = downloadProgress.value

  if (!totalBytes) return prettyBytesHelper(loadedBytes)
  return `${Math.round(downloadPercent.value ?? 0)}%`
})

const downloadSizeLabel = computed(() =>
  downloadSize.value ? prettyBytesHelper(downloadSize.value) : '',
)

const loadDownloadSize = async () => {
  downloadSizeController?.abort()
  const controller = new AbortController()

  downloadSizeController = controller
  downloadSizeState.value = 'loading'

  try {
    const size = await getGeoIPCityDatabaseDownloadSize(controller.signal)

    if (controller.signal.aborted) return
    downloadSize.value = size
    downloadSizeState.value = size ? 'ready' : 'unavailable'
  } catch (error) {
    if (controller.signal.aborted) return
    console.warn('Failed to read the DB-IP city database download size:', error)
    downloadSizeState.value = 'unavailable'
  }
}

const checkDatabase = async () => {
  databaseState.value = 'checking'

  try {
    databaseState.value = (await prepareGeoIPCityDatabase()) ? 'ready' : 'missing'
    if (databaseState.value === 'missing') void loadDownloadSize()
  } catch (error) {
    console.error('Failed to read the DB-IP city database from IndexedDB:', error)
    databaseState.value = 'error'
    void loadDownloadSize()
  }
}

const downloadDatabase = async () => {
  downloadController?.abort()
  downloadController = new AbortController()
  downloadProgress.value = { loadedBytes: 0 }
  databaseState.value = 'downloading'

  try {
    await downloadGeoIPCityDatabase((progress) => {
      downloadProgress.value = progress
      if (progress.totalBytes) {
        downloadSize.value = progress.totalBytes
        downloadSizeState.value = 'ready'
      }
    }, downloadController.signal)
    databaseState.value = 'ready'
  } catch (error) {
    if (downloadController.signal.aborted) return
    console.error('Failed to download the DB-IP city database:', error)
    databaseState.value = 'error'
  }
}

onMounted(() => void checkDatabase())
onBeforeUnmount(() => {
  downloadController?.abort()
  downloadSizeController?.abort()
})
</script>

<template>
  <EarthMap v-if="databaseState === 'ready'" />

  <main
    v-else
    class="bg-base-200 flex size-full items-center justify-center overflow-auto p-4"
  >
    <section
      class="base-container border-base-border flex w-full max-w-md flex-col items-center border p-7 text-center sm:p-9"
      aria-live="polite"
    >
      <div
        class="bg-primary/10 text-primary mb-5 flex size-14 items-center justify-center rounded-2xl"
      >
        <span
          v-if="databaseState === 'checking'"
          class="loading loading-spinner loading-md"
        />
        <CircleStackIcon
          v-else
          class="size-7"
        />
      </div>

      <template v-if="databaseState === 'checking'">
        <h1 class="text-lg font-semibold">{{ $t('earthGeoDatabaseChecking') }}</h1>
        <p class="text-base-content/55 mt-2 text-sm">
          {{ $t('earthGeoDatabaseCheckingDescription') }}
        </p>
      </template>

      <template v-else>
        <h1 class="text-lg font-semibold">{{ $t('earthGeoDatabaseRequired') }}</h1>
        <p class="text-base-content/60 mt-2 text-sm leading-6">
          {{ $t('earthGeoDatabaseDescription') }}
        </p>

        <div
          v-if="databaseState === 'downloading'"
          class="mt-6 w-full"
        >
          <div class="text-base-content/60 mb-2 flex justify-between text-xs">
            <span>{{ $t('earthGeoDatabaseDownloading') }}</span>
            <span>{{ downloadProgressLabel }}</span>
          </div>
          <progress
            v-if="downloadPercent !== undefined"
            class="progress progress-primary block w-full"
            :value="downloadPercent"
            max="100"
          />
          <progress
            v-else
            class="progress progress-primary block w-full"
          />
        </div>

        <div
          v-if="databaseState === 'error'"
          class="alert alert-error alert-soft mt-5 w-full items-start text-left text-sm"
          role="alert"
        >
          <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" />
          <span>{{ $t('earthGeoDatabaseDownloadFailed') }}</span>
        </div>

        <button
          type="button"
          class="btn btn-primary mt-6 min-w-40"
          :disabled="databaseState === 'downloading'"
          @click="downloadDatabase"
        >
          <span
            v-if="databaseState === 'downloading'"
            class="loading loading-spinner loading-sm"
          />
          <ArrowDownTrayIcon
            v-else
            class="size-4"
          />
          {{
            databaseState === 'downloading'
              ? $t('earthGeoDatabaseDownloading')
              : databaseState === 'error'
                ? $t('earthGeoDatabaseRetry')
                : $t('earthGeoDatabaseDownload')
          }}
        </button>

        <p class="text-base-content/45 mt-3 text-xs">
          <template v-if="downloadSizeState === 'ready'">
            {{ $t('earthGeoDatabaseStorageTip', { size: downloadSizeLabel }) }}
          </template>
          <template v-else-if="downloadSizeState === 'loading'">
            {{ $t('earthGeoDatabaseStorageTipLoading') }}
          </template>
          <template v-else>
            {{ $t('earthGeoDatabaseStorageTipUnavailable') }}
          </template>
        </p>
      </template>
    </section>
  </main>
</template>
