import { ref } from 'vue'
import { installServiceModeAPI } from '../api/ipc-invoke'
import { fetchIsServiceModeInstalled, isServiceModeInstalled } from '../store/ipc-store'

const showServiceInstallModal = ref(false)

export const useService = () => {
  const checkAndInstallService = async () => {
    await fetchIsServiceModeInstalled()
    if (!isServiceModeInstalled.value) {
      showServiceInstallModal.value = true
    }
  }

  const handleServiceInstallConfirm = async () => {
    await installServiceModeAPI()
    await fetchIsServiceModeInstalled()
    showServiceInstallModal.value = false
  }

  return {
    showServiceInstallModal,
    checkAndInstallService,
    handleServiceInstallConfirm,
  }
}
