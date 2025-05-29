import { ref } from 'vue'
import { installBinaryAPI } from '../api/ipc-invoke'
import { fetchIsBinaryInstalled, isBinaryInstalled } from '../store/status'

const showBinaryInstallModal = ref(false)

export const useBinary = () => {
  const checkAndInstallBinary = async () => {
    await fetchIsBinaryInstalled()
    if (!isBinaryInstalled.value) {
      showBinaryInstallModal.value = true
    }
  }

  const handleBinaryInstallConfirm = async () => {
    await installBinaryAPI()
    await fetchIsBinaryInstalled()
    showBinaryInstallModal.value = false
  }

  return {
    showBinaryInstallModal,
    checkAndInstallBinary,
    handleBinaryInstallConfirm,
  }
}
