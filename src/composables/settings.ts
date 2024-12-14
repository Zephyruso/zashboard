import { fetchIsUIUpdateAvailable, upgradeUIAPI } from '@/api'
import { autoUpgrade } from '@/store/settings'
import { ref } from 'vue'

const isUIUpdateAvailable = ref(false)

export const useSettings = () => {
  const checkUIUpdate = async () => {
    if (autoUpgrade.value) {
      isUIUpdateAvailable.value = await fetchIsUIUpdateAvailable()
      if (isUIUpdateAvailable.value) {
        upgradeUIAPI()
      }
    }
  }

  return {
    isUIUpdateAvailable,
    checkUIUpdate,
  }
}
