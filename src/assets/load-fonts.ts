export const loadFonts = () => {
  if (import.meta.env.MODE === 'cdn-fonts') {
    const createLink = (href: string) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.media = 'print'
      link.onload = () => {
        link.media = 'all'
      }
      document.head.appendChild(link)
    }

    createLink('https://unpkg.com/subsetted-fonts@latest/MiSans-VF/MiSans-VF.css')
    createLink('https://unpkg.com/subsetted-fonts@latest/SarasaUiSC-Regular/SarasaUiSC-Regular.css')
    createLink('https://unpkg.com/subsetted-fonts@latest/PingFangSC-Regular/PingFangSC-Regular.css')
    createLink('https://unpkg.com/@fontsource/fira-sans')
  } else if (import.meta.env.MODE === 'MiSans') {
    import('subsetted-fonts/MiSans-VF/MiSans-VF.css')
  } else if (import.meta.env.MODE === 'SarasaUi') {
    import('subsetted-fonts/SarasaUiSC-Regular/SarasaUiSC-Regular.css')
  } else if (import.meta.env.MODE === 'PingFang') {
    import('subsetted-fonts/PingFangSC-Regular/PingFangSC-Regular.css')
  } else if (import.meta.env.MODE === 'FiraSans') {
    import('@fontsource/fira-sans/index.css')
  } else if (import.meta.env.MODE === 'SystemUI') {
  } else {
    import('@fontsource/fira-sans/index.css')
    import('subsetted-fonts/MiSans-VF/MiSans-VF.css')
    import('subsetted-fonts/SarasaUiSC-Regular/SarasaUiSC-Regular.css')
    import('subsetted-fonts/PingFangSC-Regular/PingFangSC-Regular.css')
  }
}
