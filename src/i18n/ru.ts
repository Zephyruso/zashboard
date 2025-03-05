import type { LANG_MESSAGE } from './en'

const ru: LANG_MESSAGE = {
  setup: 'Настройка',
  overview: 'Обзор',
  proxies: 'Прокси',
  rules: 'Правила',
  connections: 'Подключения',
  logs: 'Журнал',
  protocol: 'Протокол',
  host: 'Хост',
  port: 'Порт',
  password: 'Пароль',
  submit: 'Отправить',
  cancel: 'Отмена',
  download: 'Загружено',
  upload: 'Отправлено',
  downloadSpeed: 'Скорость загрузки',
  uploadSpeed: 'Скорость отдачи',
  memoryUsage: 'Память',
  version: 'Версия',
  noContent: 'Нет содержимого',
  flushFakeIP: 'Очистить Fake IP',
  chains: 'Цепочки',
  sortBy: 'Сортировать по',
  rule: 'Правило',
  sourceIP: 'Исходный IP',
  activeConnections: 'Активные',
  closedConnections: 'Закрытые',
  logLevel: 'Уровень журнала',
  twoColumnProxyGroup: 'Группа прокси в два столбца',
  type: 'Тип',
  process: 'Процесс',
  connectTime: 'Время',
  sourcePort: 'Исходный порт',
  destination: 'Назначение',
  transferType: 'Тип передачи',
  inboundUser: 'Входящий пользователь',
  dl: 'Загр',
  ul: 'Отдч',
  dlSpeed: 'Загрузка',
  ulSpeed: 'Отдача',
  settings: 'Настройки',
  speedtestUrl: 'URL теста скорости',
  speedtestTimeout: 'Таймаут теста скорости',
  connectionStyle: 'Стиль подключения',
  card: 'Карточка',
  table: 'Таблица',
  customTableColumns: 'Пользовательские столбцы таблицы',
  customCardLines: 'Пользовательские строчки карточки',
  close: 'Закрыть',
  defaultTheme: 'Тема по умолчанию',
  darkTheme: 'Темная тема',
  proxyProvider: 'Провайдер прокси',
  ruleProvider: 'Провайдер правил',
  expire: 'Истекает',
  noExpire: 'Нет',
  updated: 'Обновлено',
  upgradeUI: 'Обновить панель',
  updateAllProviders: 'Обновление все провайдеры',
  reloadConfigs: 'Перезагрузить конфигурации',
  mode: 'Режим',
  proxySortType: 'Тип сортировки прокси',
  defaultsort: 'По конфигурациям',
  nameasc: 'Имя по возрастанию',
  namedesc: 'Имя по убыванию',
  latencydesc: 'Задержка по убыванию',
  latencyasc: 'Задержка по возрастанию',
  language: 'Язык',
  automaticDisconnection: 'Автоматическое отключение',
  backend: 'Бэкенд',
  tunMode: 'Режим Tun',
  upgradeCore: 'Обновить ядро',
  updateGeoDatabase: 'Обновить GEO',
  truncateProxyName: 'Усечение имени прокси',
  sourceIPLabels: 'Метки исходного IP',
  proxyPreviewType: 'Тип предварительного просмотра прокси',
  auto: 'Авто',
  dots: 'Точки',
  bar: 'Полоса',
  exportSettings: 'Экспорт настроек',
  importSettings: 'Импорт настроек',
  unavailableProxy: 'Скрыть недоступное',
  protocolTips:
    'Вы пытаетесь подключиться к http-бэкенду, но панель управления обслуживается через https. Это может вызвать ошибку подключения. Пожалуйста, разрешите небезопасный контент в настройках браузера. Настройки находятся слева от адресной строки.',
  global: 'Глобальный',
  direct: 'Прямой',
  lowLatencyDesc: 'Желтый порог',
  mediumLatencyDesc: 'Красный порог',
  fonts: 'Шрифты',
  unauthorizedTip: 'Не авторизован, пожалуйста, войдите снова.',
  restartCore: 'Перезапустить ядро',
  checkUpgrade: 'Проверить обновления',
  autoUpgrade: 'Автоматическое обновление',
  secondaryPath: 'Дополнительный путь',
  secondaryPathTip: 'Если присутствует, начните с "/", в противном случае оставьте пустым.',
  logRetentionLimit: 'Лимит хранения журнала',
  DNSQuery: 'DNS-запрос',
  currentBackendUnavailable:
    'Текущий бэкенд недоступен. Попробуйте переключиться на другой бэкенд?',
  confirm: 'Подтвердить',
  backendSwitchTo: 'Автоматическое переключение на {backend}',
  ipv6Test: 'IPv6-тест',
  socksPort: 'Порт Socks',
  httpPort: 'Порт HTTP',
  mixedPort: 'Порт Mixed',
  redirPort: 'Порт Redir',
  tproxyPort: 'Порт TProxy',
  tableSize: 'Размер таблицы',
  proxyCardSize: 'Размер карточки прокси',
  small: 'Маленький',
  normal: 'Нормальный',
  large: 'Большой',
  autoIPCheckWhenStart: 'Автоматическая проверка IP при запуске',
  autoConnectionCheckWhenStart: 'Автоматическая проверка соединений при запуске',
  chinaIP: 'IP для Китая',
  globalIP: 'Мировой IP',
  networkInfo: 'Информация о сети',
  autoSwitchTheme: 'Автоматический темы',
  customBackgroundURL: 'URL фона',
  splitOverviewPage: 'Разделить страницу с обзором',
  manageHiddenGroup: 'Управление скрытыми группами',
  showIPAndConnectionInfo: 'Показать IP и информацию о соединениях',
  transparent: 'Прозрачность',
  iconSize: 'Размер иконки',
  iconMarginRight: 'Отступ правой иконки',
  allowLan: 'Разрешить локальную сеть',
  proxyChainDirection: 'Направление цепочки прокси',
  reverse: 'Обратное',
  sniffHost: 'Захватывать хост',
  ipScreenshotTip: 'Пожалуйста, убедитесь, что реальный IP скрыт при создании скриншотов.',
  showStatisticsWhenSidebarCollapsed: 'Показать статистику при сворачивании панели',
  totalConnections: 'Всего соединений',
  mostDownloadHost: 'Ресурс с наибольшим скачиванием',
  mostUploadHost: 'Ресурс с наибольшей отправкой данных',
  mostDownloadSourceIP: 'IP-источник с наибольшим скачиванием',
  mostUploadSourceIP: 'IP-источник с наибольшей отдачей',
  mostDownloadProxy: 'Прокси с наибольшим скачиванием',
  mostUploadProxy: 'Прокси с наибольшей отдачей',
  manual: 'Ручной',
  tableWidthMode: 'Режим ширины таблицы',
  testFinishedTip: '{number} Тест завершен',
  updateFinishedTip: '{number} Обновление завершено',
  independentLatencyTest: 'Независимый тест задержки',
  independentLatencyTestTip:
    'Включение независимого тестирования задержки попытается использовать URL-адреса, указанные в конфигурационном файле, вместо настроек URL-адресов в панели управления во время теста задержки. Задержка будет отображаться отдельно на основе URL-адресов, установленных в группах политик.',
  search: 'Поиск',
  allSourceIP: 'Все IP-источники',
  importing: 'Импортируется',
  hideConnection: 'Скрыть соединение',
  hideConnectionRegex: 'Скрыть соединение Regex',
  hideConnectionTip:
    'Используйте регистронезависимое регулярное выражение, чтобы найти и скрыть нежелательные соединения.',
  loadBalance: 'Балансировка нагрузки',
  label: 'Метка',
  optional: 'Необязательно',
  swipeInTabs: 'Провести для переключения вкладок',
  connectionIP: 'IP-источник соединения',
  simpleCardPreset: 'Простой карточки',
  detailedCardPreset: 'Подробный карточки',
  refresh: 'Обновить',
  reset: 'Сбросить',
  minProxyCardWidth: 'Минимальная ширина карточки прокси',
  displayGlobalByMode: 'Отображать GLOBAL по режиму',
  proxyCountMode: 'Режим подсчета прокси',
  filteredTotal: 'Отфильтровано всего',
  total: 'Всего',
  aliveTotal: 'Живых / всего',
  displaySelectedNode: 'Отображать выбранный узел',
  displayLatencyNumber: 'Отображать задержку',
}

export default ru
