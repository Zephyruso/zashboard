// api 层公共入口。注册全局拦截器并再导出 Clash 纯请求函数。
// 后端选择 / 数据组装 / 响应式状态一律在 assembly 层,不在此处。
import './http'

export * from './clash'
