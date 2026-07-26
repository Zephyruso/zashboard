// 各后端日志订阅的统一契约。
export interface LogsSubscription {
  close: () => void
}
