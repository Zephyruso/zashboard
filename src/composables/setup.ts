import { ref } from 'vue'

const tipShowModel = ref(false)
const tipContent = ref()

export const useSetup = () => {
  const showTip = (content: string) => {
    tipShowModel.value = true
    tipContent.value = content
    setTimeout(() => {
      tipShowModel.value = false
    }, 10000)
  }

  return {
    showTip,
    tipShowModel,
    tipContent,
  }
}
