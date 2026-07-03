<template>
  <div
    class="relative flex size-full flex-col overflow-hidden"
    :style="padding"
  >
    <CtrlsBar>
      <div class="flex flex-wrap items-center gap-3 p-2 md:flex-nowrap">
        <div
          class="text-base-content/65 flex min-w-0 flex-1 flex-wrap items-center gap-2 px-2 text-sm"
        >
          <span class="badge badge-ghost">库存 {{ inventory.length }}</span>
          <span class="badge badge-ghost">手动配置 {{ configuredCount }}</span>
          <span class="badge badge-ghost">本地缓存 {{ cachedCount }}</span>
        </div>
        <button
          class="btn btn-sm"
          :disabled="loading || Boolean(action)"
          @click="load"
        >
          {{ $t('refresh') }}
        </button>
      </div>
    </CtrlsBar>

    <div class="h-full overflow-auto p-3">
      <div class="grid w-full gap-4 pb-8">
        <div
          v-if="error"
          class="grid gap-3 text-sm"
        >
          <div
            v-if="error"
            class="border-error/40 bg-error/10 text-error rounded-xl border p-3"
          >
            {{ error }}
          </div>
        </div>

        <section class="border-base-300/50 bg-base-100/95 rounded-2xl border p-5 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">GitHub Token</h2>
            </div>
            <span class="badge badge-outline">{{ tokenStatusLabel }}</span>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <label class="form-control gap-2">
              <span class="label-text text-sm font-medium">Personal access token</span>
              <input
                v-model="githubToken"
                class="input input-bordered w-full"
                type="password"
                :placeholder="tokenPlaceholder"
                autocomplete="off"
              />
            </label>
            <button
              class="btn btn-primary"
              :disabled="action === 'github-token' || githubToken.trim() === ''"
              @click="saveGitHubToken(githubToken)"
            >
              {{ action === 'github-token' ? '保存中...' : '保存 Token' }}
            </button>
            <button
              class="btn btn-outline"
              :disabled="action === 'github-token' || !tokenSetting?.configured"
              @click="saveGitHubToken('')"
            >
              清除
            </button>
          </div>
        </section>

        <section class="border-base-300/50 bg-base-100/95 rounded-2xl border p-5 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">内核二进制</h2>
            </div>
            <span
              v-if="loading"
              class="loading loading-spinner loading-sm"
            />
          </div>

          <div
            v-if="inventory.length"
            class="mt-5 grid gap-3 md:grid-cols-2"
          >
            <div
              v-for="item in inventory"
              :key="item.core"
              class="border-base-300/60 bg-base-200/45 hover:border-primary/50 rounded-xl border p-4 transition-colors"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-lg font-semibold">{{ item.core }}</div>
                  <div class="text-base-content/55 mt-1 text-xs">{{ item.binaryName }}</div>
                </div>
                <span
                  class="badge"
                  :class="
                    item.configured || item.cached ? 'badge-success badge-outline' : 'badge-ghost'
                  "
                >
                  {{ availabilityLabel(item) }}
                </span>
              </div>

              <p
                class="border-base-300/60 bg-base-100/70 text-base-content/65 mt-3 rounded-xl border p-3 text-xs break-all"
              >
                {{ availabilityPath(item) }}
              </p>

              <div
                v-if="updates[item.core]"
                class="border-base-300/60 bg-base-100/70 mt-3 rounded-xl border p-3 text-xs"
              >
                <p>
                  当前版本：{{ updates[item.core]?.currentVersion || '未安装' }} · 最新版本：{{
                    updates[item.core]?.latestVersion
                  }}
                </p>
                <p class="text-base-content/60 mt-1 break-all">
                  资源：{{ updates[item.core]?.assetName }}
                </p>
                <p
                  v-if="updates[item.core]?.assetUrl"
                  class="text-base-content/60 mt-1 break-all"
                >
                  下载链接：{{ updates[item.core]?.assetUrl }}
                </p>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  class="btn btn-sm btn-outline"
                  :disabled="Boolean(action)"
                  @click="checkCoreUpdate(item.core)"
                >
                  {{ action === `check-${item.core}` ? '检查中...' : '检查更新' }}
                </button>
                <button
                  class="btn btn-sm btn-primary"
                  :disabled="Boolean(action) || !updates[item.core]?.updateAvailable"
                  @click="updateCore(item.core)"
                >
                  {{ action === `update-${item.core}` ? '更新中...' : '更新到最新' }}
                </button>
                <button
                  class="btn btn-sm btn-outline"
                  :disabled="Boolean(action) || !updates[item.core]?.assetUrl"
                  @click="downloadCoreAsset(item.core)"
                >
                  浏览器下载
                </button>
                <button
                  class="btn btn-sm btn-outline"
                  :disabled="Boolean(action)"
                  @click="openUploadDialog(item)"
                >
                  上传本地
                </button>
              </div>

              <div
                v-if="item.core === 'mihomo'"
                class="border-base-300/60 bg-base-100/70 mt-4 rounded-xl border p-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 class="text-sm font-semibold">运行资源</h3>
                    <p class="text-base-content/60 mt-1 text-xs">
                      上传到运行目录，供 mihomo 启动和配置校验时读取。
                    </p>
                  </div>
                  <span class="badge badge-ghost">{{ uploadedMihomoGeoResourceCount }}/4</span>
                </div>

                <div class="mt-3 grid gap-2">
                  <div
                    v-for="resource in mihomoGeoResources"
                    :key="resource.filename"
                    class="border-base-300/60 rounded-lg border px-3 py-2 text-xs"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="min-w-0">
                        <div class="truncate font-medium">{{ resource.label }}</div>
                        <div class="text-base-content/55 mt-1 truncate">
                          {{ resource.filename }}
                        </div>
                      </div>
                      <button
                        class="btn btn-xs btn-outline"
                        :disabled="Boolean(action)"
                        @click="selectMihomoGeoResource(resource)"
                      >
                        {{
                          action === `runtime-resource-upload-${resource.key}`
                            ? '上传中...'
                            : '上传'
                        }}
                      </button>
                    </div>
                    <div class="text-base-content/55 mt-2">
                      当前版本：{{ mihomoGeoResourceStatus(resource.filename) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else-if="!loading"
            class="text-base-content/55 flex min-h-48 items-center justify-center text-sm"
          >
            暂无内核库存，请检查 FastProxy 后端状态。
          </div>
        </section>
      </div>
    </div>

    <DialogWrapper
      v-model="uploadDialogOpen"
      :title="uploadTarget ? `上传 ${uploadTarget.core} 内核` : '上传内核'"
      box-class="max-w-xl"
    >
      <div class="grid gap-4 p-1">
        <p class="text-base-content/65 text-sm leading-6">
          选择已下载的本地二进制或压缩包，安装后会作为本地缓存优先使用。
          支持直接上传二进制，或上传包含 {{ uploadTarget?.binaryName || 'core' }} 的
          .zip/.tar.gz/.tgz/.gz 文件。
          如果上传的是刚通过“检查更新”下载的资源，会按检查到的最新版本写入缓存。
        </p>
        <label class="form-control gap-2">
          <span class="label-text text-sm font-medium">本地文件</span>
          <input
            class="file-input file-input-bordered w-full"
            type="file"
            @change="handleUploadFileChange"
          />
        </label>
        <div class="flex justify-end gap-2">
          <button
            class="btn btn-outline"
            @click="closeUploadDialog"
          >
            取消
          </button>
          <button
            class="btn btn-primary"
            :disabled="Boolean(action) || !uploadTarget || !uploadFile"
            @click="uploadSelectedCore"
          >
            {{
              uploadTarget && action === `upload-${uploadTarget.core}` ? '上传中...' : '上传安装'
            }}
          </button>
        </div>
      </div>
    </DialogWrapper>

    <input
      ref="runtimeResourceInput"
      class="pointer-events-none fixed top-0 -left-[9999px] size-px opacity-0"
      type="file"
      @change="handleRuntimeResourceFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import {
  checkCoreUpdateAPI,
  fetchCoreInventoryAPI,
  fetchGitHubTokenSettingAPI,
  fetchRuntimeResourcesAPI,
  saveGitHubTokenSettingAPI,
  updateCoreAPI,
  uploadCoreAPI,
  uploadRuntimeResourceAPI,
} from '@/api/fastproxy'
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { showNotification } from '@/helper/notification'
import type {
  FastProxyCoreId,
  FastProxyCoreInventoryItem,
  FastProxyCoreUpdateInfo,
  FastProxyGitHubTokenSetting,
  FastProxyRuntimeResource,
} from '@/types/fastproxy'
import { computed, onMounted, ref } from 'vue'

type MihomoGeoResourceKey = 'geoip-mmdb' | 'geoip-dat' | 'geosite-dat' | 'geo-asn'

type MihomoGeoResource = {
  key: MihomoGeoResourceKey
  label: string
  filename: string
}

const { padding } = usePaddingForViews()

const inventory = ref<FastProxyCoreInventoryItem[]>([])
const tokenSetting = ref<FastProxyGitHubTokenSetting | null>(null)
const runtimeResources = ref<FastProxyRuntimeResource[]>([])
const githubToken = ref('')
const updates = ref<Partial<Record<FastProxyCoreId, FastProxyCoreUpdateInfo>>>({})
const loading = ref(true)
const action = ref<string | null>(null)
const error = ref('')
const uploadDialogOpen = ref(false)
const uploadTarget = ref<FastProxyCoreInventoryItem | null>(null)
const uploadFile = ref<File | null>(null)
const runtimeResourceInput = ref<HTMLInputElement | null>(null)
const selectedRuntimeResource = ref<MihomoGeoResource | null>(null)

const mihomoGeoResources: MihomoGeoResource[] = [
  { key: 'geoip-mmdb', label: 'GeoIP MMDB 数据库', filename: 'country.mmdb' },
  { key: 'geoip-dat', label: 'GeoIP Dat 数据库', filename: 'geoip.dat' },
  { key: 'geosite-dat', label: 'GeoSite 数据库', filename: 'geosite.dat' },
  { key: 'geo-asn', label: 'Geo ASN 数据库', filename: 'GeoLite2-ASN.mmdb' },
]

const configuredCount = computed(() => inventory.value.filter((item) => item.configured).length)
const cachedCount = computed(() => inventory.value.filter((item) => item.cached).length)
const runtimeResourceByName = computed(() => {
  return Object.fromEntries(runtimeResources.value.map((resource) => [resource.name, resource]))
})
const uploadedMihomoGeoResourceCount = computed(() => {
  return mihomoGeoResources.filter((resource) => runtimeResourceByName.value[resource.filename])
    .length
})
const tokenPlaceholder = computed(() =>
  tokenSetting.value?.configured ? '已保存，输入新 Token 可覆盖' : 'ghp_...',
)
const tokenStatusLabel = computed(() => {
  if (!tokenSetting.value?.configured) return '未配置'
  if (tokenSetting.value.source === 'environment') return '已通过环境变量配置'
  return '已保存到本机'
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [coreInventory, tokenStatus, resources] = await Promise.all([
      fetchCoreInventoryAPI(),
      fetchGitHubTokenSettingAPI(),
      fetchRuntimeResourcesAPI(),
    ])
    inventory.value = coreInventory.data.cores
    tokenSetting.value = tokenStatus.data
    runtimeResources.value = resources.data.resources
  } catch (err) {
    error.value = getErrorMessage(err, '加载内核状态失败')
  } finally {
    loading.value = false
  }
}

const saveGitHubToken = async (token: string) => {
  action.value = 'github-token'
  error.value = ''
  try {
    const { data } = await saveGitHubTokenSettingAPI(token)
    tokenSetting.value = data
    githubToken.value = ''
    showSuccess(token.trim() ? 'GitHub Token 已保存' : 'GitHub Token 已清除')
  } catch (err) {
    error.value = getErrorMessage(err, '保存 GitHub Token 失败')
  } finally {
    action.value = null
  }
}

const checkCoreUpdate = async (core: FastProxyCoreId) => {
  action.value = `check-${core}`
  error.value = ''
  try {
    const { data } = await checkCoreUpdateAPI(core)
    updates.value = { ...updates.value, [core]: data }
    showSuccess(
      data.updateAvailable
        ? `${core} 发现新版本 ${data.latestVersion}`
        : `${core} 已是最新版本 ${data.latestVersion}`,
    )
  } catch (err) {
    error.value = getErrorMessage(err, '检查更新失败')
  } finally {
    action.value = null
  }
}

const updateCore = async (core: FastProxyCoreId) => {
  action.value = `update-${core}`
  error.value = ''
  try {
    const { data } = await updateCoreAPI(core)
    updates.value = { ...updates.value, [core]: data }
    showSuccess(`${core} 已更新到 ${data.latestVersion}`)
    await load()
  } catch (err) {
    error.value = getErrorMessage(err, '更新内核失败')
  } finally {
    action.value = null
  }
}

const downloadCoreAsset = (core: FastProxyCoreId) => {
  const assetUrl = updates.value[core]?.assetUrl
  if (!assetUrl) return
  window.open(assetUrl, '_blank', 'noopener,noreferrer')
}

const openUploadDialog = (item: FastProxyCoreInventoryItem) => {
  uploadTarget.value = item
  uploadFile.value = null
  uploadDialogOpen.value = true
}

const closeUploadDialog = () => {
  uploadDialogOpen.value = false
  uploadTarget.value = null
  uploadFile.value = null
}

const handleUploadFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  uploadFile.value = input.files?.[0] || null
}

const selectMihomoGeoResource = (resource: MihomoGeoResource) => {
  selectedRuntimeResource.value = resource
  if (runtimeResourceInput.value) {
    runtimeResourceInput.value.value = ''
    runtimeResourceInput.value.click()
  }
}

const uploadSelectedCore = async () => {
  if (!uploadTarget.value || !uploadFile.value) return
  const core = uploadTarget.value.core
  action.value = `upload-${core}`
  error.value = ''
  try {
    await uploadCoreAPI(core, uploadFile.value, updates.value[core]?.latestVersion)
    showSuccess(`${core} 已从本地文件安装`)
    closeUploadDialog()
    await load()
  } catch (err) {
    error.value = getErrorMessage(err, '上传安装内核失败')
  } finally {
    action.value = null
  }
}

const uploadRuntimeResource = async () => {
  const resource = selectedRuntimeResource.value
  const file = runtimeResourceInput.value?.files?.[0]
  if (!resource || !file) return
  action.value = `runtime-resource-upload-${resource.key}`
  error.value = ''
  try {
    const { data } = await uploadRuntimeResourceAPI(file, resource.filename)
    runtimeResources.value = [
      data,
      ...runtimeResources.value.filter((resource) => resource.name !== data.name),
    ]
    showSuccess(`运行资源 ${data.name} 已上传`)
  } catch (err) {
    error.value = getErrorMessage(err, '上传运行资源失败')
  } finally {
    selectedRuntimeResource.value = null
    if (runtimeResourceInput.value) {
      runtimeResourceInput.value.value = ''
    }
    action.value = null
  }
}

const handleRuntimeResourceFileChange = async () => {
  await uploadRuntimeResource()
}

const availabilityLabel = (item: FastProxyCoreInventoryItem) => {
  if (item.configured) return '手动配置'
  if (item.cached) return '本地缓存'
  return '首次启动下载'
}

const availabilityPath = (item: FastProxyCoreInventoryItem) => {
  if (item.configuredPath) return item.configuredPath
  if (item.cachedPath) return `${item.cachedVersion || 'cached'}: ${item.cachedPath}`
  return '本地未发现内核，首次启动或手动更新时会下载匹配当前系统的最新版本。'
}

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

const mihomoGeoResourceStatus = (filename: string) => {
  const resource = runtimeResourceByName.value[filename]
  if (!resource) return 'File Not Exist'
  const date = new Date(resource.updatedAt)
  const updatedAt = Number.isNaN(date.getTime()) ? resource.updatedAt : date.toLocaleString()
  return `${updatedAt} · ${formatBytes(resource.size)}`
}

const getErrorMessage = (err: unknown, fallback: string) => {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return err instanceof Error ? err.message : fallback
}

const showSuccess = (content: string) => {
  showNotification({
    content,
    type: 'alert-success',
    timeout: 3000,
  })
}

onMounted(() => {
  load()
})
</script>
