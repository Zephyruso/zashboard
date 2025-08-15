# zashboard

<p align="center">
  <img src="./readme/pc.png" height="300">
  <img src="./readme/mobile.png" height="300">
</p>

## **Requirement**

Browser support

- Chrome 111 (released March 2023)
- Firefox 128 (released July 2024)
- Safari 16.4 (released March 2023)
- Not supported on iOS 16.4 jailbroken version.

## **Online**

You can access the online zashboard at the following link:

- [Online zashboard](http://board.zash.run.place)

## **Download**

For **Mihomo** users:
The **Upgrade Dashboard** function utilizes the API from Mihomo core. Ensure you set the [configuration URL](https://wiki.metacubex.one/config/general/#_9) to the zashboard's URL.

You can download the zashboard files here:

release:

- [dist.zip (7.7MB)](https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip) – Includes better font-loading experience.
- [dist-cdn-fonts.zip (1.3MB)](https://github.com/Zephyruso/zashboard/releases/latest/download/dist-cdn-fonts.zip) – Optimized for devices with limited storage, fonts loaded from CDN.
- [dist-firasans-only.zip (1.7MB)](https://github.com/Zephyruso/zashboard/releases/latest/download/dist-firasans-only.zip) – Only with FiraSans Font
- [dist-misans-only.zip (3.5MB)](https://github.com/Zephyruso/zashboard/releases/latest/download/dist-misans-only.zip) – Only with MiSans Font
- [dist-pingfang-only.zip (3.2MB)](https://github.com/Zephyruso/zashboard/releases/latest/download/dist-pingfang-only.zip) – Only with PingFang Font
- [dist-sarasa-only.zip (3.6MB)](https://github.com/Zephyruso/zashboard/releases/latest/download/dist-sarasa-only.zip) – Only with Sarasa Font
- [dist-no-fonts.zip (1.4MB)](https://github.com/Zephyruso/zashboard/releases/latest/download/dist-no-fonts.zip) – No fonts included, uses system fonts only.

**Font Package Selection Guide:**
- **dist-cdn-fonts.zip**: Load fonts from unpkg.com CDN.
- **dist-no-fonts.zip**: Uses system fonts only.

dev:

- [gh-pages.zip (7.7MB)](https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages.zip)
- [gh-pages-cdn-fonts.zip (1.3MB)](https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages-cdn-fonts.zip)
- [gh-pages-firasans-only.zip (1.7MB)](https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages-firasans-only.zip)
- [gh-pages-misans-only.zip (3.5MB)](https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages-misans-only.zip)
- [gh-pages-pingfang-only.zip (3.2MB)](https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages-pingfang-only.zip)
- [gh-pages-sarasa-only.zip (3.6MB)](https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages-sarasa-only.zip)
- [gh-pages-no-fonts.zip (1.4MB)](https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages-no-fonts.zip)

## **Docker Setup**

To run zashboard via Docker, use the following command:

```
docker run -d -p 80:80 ghcr.io/zephyruso/zashboard:latest
```

## Tips

1. The connection page has two layout styles: customizable cards and customizable tables. It is recommended to use tables on PC and cards on mobile devices.
2. The connection table can be dragged with the left mouse button, and right-clicking can copy cell content.
3. Right-clicking on a node / node group card will perform a speedtest for the node / node group.
4. The proxy group sorting is based on the node order in the GLOBAL group. In Mihomo, it follows the configuration file order, while in sing-box, route.final is placed first, with the rest following the configuration file order. If you need custom ordering, you can specify the order by overriding the GLOBAL group.

## 提示

1. 连接页面有两种布局样式：可自定义卡片和可自定义表格。建议在 PC 上使用表格，在移动设备上使用卡片。
2. 连接表格可被鼠标左键拖动，右键可复制单元格内容。
3. 右键点击节点/节点组卡片可对节点/节点组进行测速。
4. 面板的节点组排序是根据GLOBAL组中的节点顺序排序的，在Mihomo中会是按配置文件的顺序，在sing-box中会把route.final放到第一位，其余按照配置文件顺序，如果你需要自定义顺序，可通过覆盖GLOBAL组指定顺序

## URL params format

#### basic example

http://host:port/#/setup?hostname=ipordomain&port=9090&secret=123456

1. **`http` / `https`**
   - Determines the protocol (`http` or `https`).
   - Default: current page protocol

2. **`hostname`**
   - The Clash API's IP or domain.

3. **`port`**
   - The Clash API port.

4. **`secondaryPath`**
   - Optional path appended to the base URL.
   - Default: An empty string.

5. **`secret`**
   - Password for authentication.

6. **`disableUpgradeCore`**
   - Set '1' or 'true' to hide upgrade core button

### I code just for fun, not for money. If you really want to donate, please consider donating to [UNICEF](https://www.unicef.org/) to help hungry children.
