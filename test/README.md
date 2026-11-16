# test —— 性能与行为回归脚本

面向 [#784](https://github.com/Zephyruso/zashboard/issues/784) 那类问题:代理组一多(150+),
代理页要卡上十几秒才出得来。开发机上跑得飞快,问题只在别人的设备上出现,所以这里的做法是
**把现场造出来**:一个假的 mihomo 后端 + headless Chrome + CPU 限速。

不需要装任何额外依赖,Node 22+ 自带 WebSocket,Chrome 用系统里已有的那个
(找不到就用 `CHROME_BIN=/path/to/chrome` 指一下)。

## 用之前

脚本跑的是构建产物,先构建:

```bash
pnpm build
```

## 基准:`pnpm test:bench`

```bash
pnpm test:bench                             # 150 组 × 60 节点,不限速
pnpm test:bench --groups 300 --nodes 200    # 更极端的配置
pnpm test:bench --cpu 10                    # 关键:限速到 1/10,才接近真实设备
```

| 参数                                | 默认               | 说明                                                         |
| ----------------------------------- | ------------------ | ------------------------------------------------------------ |
| `--groups` / `--nodes` / `--conns`  | 150 / 60 / 300     | 假后端的代理组数、每组节点数、活跃连接数                     |
| `--cpu`                             | 1                  | CPU 限速倍率,`10` ≈ 中低端手机,`20` ≈ 路由器旁边那台老机器   |
| `--repeat`                          | 3                  | 跑几次取中位数(单次噪声很大,别只跑一次)                      |
| `--width` / `--height` / `--mobile` | 1440 / 900 / false | 视口,手机形态用 `--width 390 --height 844 --mobile`          |
| `--url`                             | 无                 | 不起内置静态服务,直接测已经跑着的地址(如 `pnpm dev` 的 5173) |
| `--json`                            | false              | 输出 JSON,方便自己存下来对比                                 |
| `--headful`                         | false              | 想亲眼看看的时候用                                           |

输出的几个数各自在回答一个问题:

- **首屏卡片** —— 从刷新到看见第一批卡片,用户等的就是这个;
- **稳定后挂载卡片数 / DOM 元素** —— 懒挂载有没有真的只挂视口附近那些;
- **滚到底之后 DOM** —— 卡片有没有被回收(不回收的话这个数会一路涨到全量);
- **静置最差帧** —— 连接 WS 每秒推一拍,后台计算有没有在拖主线程;
- **滚到底耗时 / 最差帧** —— 挂载成本摊进滚动之后有多糙。

**对比改动前后**:在两个分支上各 `pnpm build && pnpm test:bench --cpu 10`,比中位数。
同一台机器、同样的负载下比才有意义 —— 别拿别人跑的数当基线。

## 行为冒烟:`pnpm test:verify`

```bash
pnpm test:verify
pnpm test:verify --groups 100 --nodes 50 --conns 1000   # 换个负载再跑一遍
```

参数同基准脚本的 `--groups` / `--nodes` / `--conns`(默认 60 / 30 / 300),另有 `--url`、`--headful`。

代理页的优化很容易「快了但坏了」,这个脚本盯的就是那些不会报错、只会悄悄不对的地方:

- **懒挂载**:只挂视口附近的卡片、滚动时回收、占位块把高度顶住(总高度不漂移、视口里不露白);
- **原有交互**:路由往返后滚动位置恢复、搜索过滤、展开组能出节点卡片;
- **延迟表刷新**:延迟按测速 url 建了全局表并缓存,所以三种写入都必须还能刷新界面 ——
  整体替换 `proxyMap`(测速后重新拉取)、乐观改 `now`(切换节点)、往 `history` 里 push
  (面板测速逐个写入)。少一处依赖追踪,界面就停在旧数字上,不报错。
- **自动滚动**:路由往返按卡片锚点恢复相同内容和视口偏移；展开组定位激活节点使用瞬时
  滚动；按延迟排序后定位测速节点使用平滑滚动。

全过打印 `14/14 项通过`,有失败则退出码非 0。

## 折叠动画时序：`node test/collapse.mjs`

构建后运行，检查单组展开 / 收起、同列错峰展开和同时收起、快速取消及交接中反向切换。
逐帧采样确认屏外节点在位置交接绘制后才补上，并检查收尾没有残留占位、行位移或动画对象。
同时覆盖减少动态效果、起止高度相同和动画中卸载，捕获未处理的动画取消拒绝。

```bash
pnpm build
node test/collapse.mjs
```

## 后端自动连接：`pnpm test:setup`

构建后运行，检查设置页的 URL 参数登录、同源自动登录、`127.0.0.1:9090` 自动登录，以及它们之间的优先级。

```bash
pnpm build
pnpm test:setup
```

脚本起两个假服务：一个同时提供构建产物和同源 API，另一个通过 Chrome 的 `--host-resolver-rules` 接管 `127.0.0.1:9090`。每个场景可以单独控制两边 `/version` 的响应（正常、要求 secret、401、HTML、缺少版本字段的 JSON、连接断开、延迟），所以不会碰到本机真实运行的内核。

覆盖的场景按分组输出：

- **URL 参数**：search 或 hash 里的 `hostname` 优先于同源和 127.0.0.1；`secret`、`label`、`disable*` 写进保存的后端；地址不可达或 secret 错误时停在设置页；与已保存后端相同时直接切换过去。
- **URL 形态**：search 在 `#/setup`、`#/proxies` 前面，hash query 挂在 `#/proxies`、`#/` 上，路径带 `index.html`，参数分散在 search 和 hash 两边（hash 优先），URL 后端和同源 secret 都能读到。
- **同源**：自动登录，同时可用时优先于 127.0.0.1；读取 `secret` 等参数；地址固定为页面自身的协议、主机和端口，`protocol`、`port` 参数不改变它；返回 401 时保留同源地址和已填的 secret，不回退。
- **127.0.0.1:9090**：同源断开、返回 HTML 或无效 JSON 时自动登录；返回 401 或都不可用时停在默认表单。
- **已保存后端**：有活动后端时直接进入，不做任何探测；有后端但没有活动后端时不自动登录。
- **手动编辑**：探测过程中修改表单会取消自动登录，保留用户输入。

每个场景通过后打印一行 `✓`；断言失败时以非零退出码结束。

## 单独用假后端

想用真浏览器手动点，可以只把假后端跑起来:

```bash
node test/mock-server.mjs --groups 150 --nodes 60 --conns 300 --port 9999
```

然后 `pnpm dev`,在面板里添加后端 `http://127.0.0.1:9999`(密码留空)。

它实现了面板会用到的那部分 Clash API:`/version` `/configs` `/proxies` `/providers/proxies`
`/rules`,测速端点,以及 `/connections` `/traffic` `/memory` 三个 WebSocket。
另外有个 `/__mock/control`,`verify.mjs` 用它在运行时改测速端点的行为(固定延迟值、故意变慢),
好采到「乐观写入」的中间态。

## 目录

```
test/
  bench.mjs          基准
  verify.mjs         行为冒烟
  collapse.mjs       折叠动画时序回归
  setup.mjs          设置页登录与自动连接回归
  mock-server.mjs    假的 mihomo 后端(也可单独跑)
  lib/
    harness.mjs      假后端 + 静态服务 + Chrome + 打开代理页,串成一件事
    cdp.mjs          够用就好的 CDP 客户端
    chrome.mjs       起一个一次性的 headless Chrome
    static-server.mjs 伺服 dist
    ports.mjs        临时端口
```

## 踩过的坑(改这些脚本时留意)

- **PWA 的 service worker 会拿旧构建应付请求**,量到的就不是刚 build 的那份。脚本里统一
  开了 `Network.setBypassServiceWorker`。
- **`localStorage` 要等页面真的落到应用 origin 之后再写**。写早了会写进 `about:blank` 的
  存储区,应用一个字节也读不到,表现是「明明配了后端却停在 /setup」。
- **不限速的开发机测不出问题**。issue 里那台设备大约相当于 `--cpu 10` ~ `--cpu 20`。
