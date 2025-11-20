# Changelog

# Changelog

## [2.3.0](https://github.com/Zephyruso/zashboard/compare/v2.2.0...v2.3.0) (2025-11-20)


### Features

* add quick filter toggle for connection visibility in ctrl with tooltip updates ([02e4441](https://github.com/Zephyruso/zashboard/commit/02e4441504d1cb1a19bb90bd1b9f5ff1e2844562))

## [2.2.0](https://github.com/Zephyruso/zashboard/compare/v2.1.0...v2.2.0) (2025-11-18)


### Features

* add backend selection dialog to sidebar ([9b31df2](https://github.com/Zephyruso/zashboard/commit/9b31df2e78d12f47900304f88b80fd4602732440))
* add full-screen toggle functionality to TopologyCharts component with responsive chart rendering ([565ea7e](https://github.com/Zephyruso/zashboard/commit/565ea7edb66bb4958d18a5d3c03014e293cc06be))


### Bug Fixes

* improve getHostFromConnection function to handle different host scenarios and support IPv6 formatting ([33003b8](https://github.com/Zephyruso/zashboard/commit/33003b851d980ce9becbbfe06c052745fa93257d))
* make table grouping state persistent ([017cbf9](https://github.com/Zephyruso/zashboard/commit/017cbf9a69c7306e7add1b2b1f9a08dcb6530354))

## [2.1.0](https://github.com/Zephyruso/zashboard/compare/v2.0.0...v2.1.0) (2025-11-10)


### Features

* enhance ConnectionHistory component with aggregation options and clear history functionality inspired by metacubexd ([b052b83](https://github.com/Zephyruso/zashboard/commit/b052b83c8757d3e3cc6c08629cee3f2f9a2c7cba))
* implement visibility checks for settings items across multiple components; enhance user experience by conditionally rendering UI elements based on visibility state ([bb6990e](https://github.com/Zephyruso/zashboard/commit/bb6990e8c7b1c2c2cb9cdc1bd963edc011a9326d))
* implement visibility control for settings items across multiple components; enhance user experience by conditionally rendering settings based on hiddenSettingsItems ([0509244](https://github.com/Zephyruso/zashboard/commit/050924475d7b3a94424d4cb7e43ee7ce82f98979))


### Bug Fixes

* add settings-menu and ctrls-bar styles in main.css; update SettingsMenu.vue class for improved styling and functionality ([ec00509](https://github.com/Zephyruso/zashboard/commit/ec00509bd0fca0ae35736dbbdfb3c977f04a0560))
* adjust setting item height in main.css; conditionally render OverviewCard in OverviewSettings.vue; improve scroll behavior logic in SettingsPage.vue ([d68c581](https://github.com/Zephyruso/zashboard/commit/d68c58180797531842b1c3570eebd61ae9235189))

## [2.0.0](https://github.com/Zephyruso/zashboard/compare/v1.108.1...v2.0.0) (2025-11-06)


### ⚠ BREAKING CHANGES

* add styles to the dock in a style similar to the new Apple design
* add styles to the controls in a style similar to the new Apple design

### Features

* add styles to the controls in a style similar to the new Apple design ([11aa106](https://github.com/Zephyruso/zashboard/commit/11aa10611c29413668454074390cae0486d8f3b9))
* add styles to the dock in a style similar to the new Apple design ([9680744](https://github.com/Zephyruso/zashboard/commit/9680744d11e8558815fb66fc3d879af631b6b906))
* enhance settings UI by restructuring components for better layout and styling; implement consistent setting item design across various settings pages ([081141e](https://github.com/Zephyruso/zashboard/commit/081141eb9a5b1921304e9b2bf58c552468895b66))
* simplify SettingsPage layout by replacing inline menu with a dedicated SettingsMenu component; enhance scroll behavior for menu item navigation ([7793ee2](https://github.com/Zephyruso/zashboard/commit/7793ee2910ecffbb5b4095d4424f3dd6e8885ee8))

## [1.108.1](https://github.com/Zephyruso/zashboard/compare/v1.108.0...v1.108.1) (2025-11-04)


### Bug Fixes

* implement dynamic favicon switching based on color scheme preference for firfox ([005ff49](https://github.com/Zephyruso/zashboard/commit/005ff49a315db6e3668ee4a13d11add78d2bb4ea))
* update RuleCard component to enhance toggle functionality and adjust checkbox styling; modify HomePage dialog layout ([9e123fc](https://github.com/Zephyruso/zashboard/commit/9e123fca102f88f707fb36e89141bfb8c90b7b9e))

## [1.108.0](https://github.com/Zephyruso/zashboard/compare/v1.107.0...v1.108.0) (2025-10-28)


### Features

* add dark mode favicon and update asset inclusion in Vite configuration ([50a66c3](https://github.com/Zephyruso/zashboard/commit/50a66c3f478cf50942ba1d40751fa38e09fd8353))
* add toggle functionality for rule disabling in RuleCard component and update API integration ([6e4512d](https://github.com/Zephyruso/zashboard/commit/6e4512dd69dc013701eabfff38a059bca4c3799f))
* add Traditional Chinese localization support in zh-tw.ts ([5e837d1](https://github.com/Zephyruso/zashboard/commit/5e837d1a55e24fb4b1635fcf2382e0be29197201))
* adjust smart rank display ([#520](https://github.com/Zephyruso/zashboard/issues/520)) ([7e2b125](https://github.com/Zephyruso/zashboard/commit/7e2b125d77897b47e691fda4e1a1830967f7750a))
* remove ProxiesCharts component and update to TopologyCharts ([724f444](https://github.com/Zephyruso/zashboard/commit/724f4443f06fa41f50f33fe59ea49d5d2b3d9a45))


### Bug Fixes

* Dockerfile ([f604811](https://github.com/Zephyruso/zashboard/commit/f604811801a8573a9f95faa38732304a750f7391))
* improve menu item interaction in TextInput component by adding overflow handling and refining delete functionality ([7010d41](https://github.com/Zephyruso/zashboard/commit/7010d41cc1bd7d11e2f9a1820fc815819f6efbf7))
* standardize capitalization in English localization strings ([89bdeeb](https://github.com/Zephyruso/zashboard/commit/89bdeeb71834ed509fa6802121724aa635378325))

## [1.107.0](https://github.com/Zephyruso/zashboard/compare/v1.106.1...v1.107.0) (2025-10-11)


### Features

* add more settings button and improve layout in sidebar components ([73de34f](https://github.com/Zephyruso/zashboard/commit/73de34f00d1abf242766ea8eacb90640d29445ae))


### Bug Fixes

* dialog style ([616cecb](https://github.com/Zephyruso/zashboard/commit/616cecb25386407f41fc0f16269c77c60a31c7ab))
* url will only be shown in independentLatencyTest mode ([fd28fd4](https://github.com/Zephyruso/zashboard/commit/fd28fd4033445f515ec3793718e1ebeee85fc25b))

## [1.106.1](https://github.com/Zephyruso/zashboard/compare/v1.106.0...v1.106.1) (2025-10-01)


### Bug Fixes

* unexpected dual column for proxies provider ([ace7864](https://github.com/Zephyruso/zashboard/commit/ace78646489a9ebf5c28abb6616e29acd64028c1))

## [1.106.0](https://github.com/Zephyruso/zashboard/compare/v1.105.0...v1.106.0) (2025-09-28)


### Features

* add manual block(degrade) btn for conn which belongs to smart group ([#502](https://github.com/Zephyruso/zashboard/issues/502)) ([1a9c12b](https://github.com/Zephyruso/zashboard/commit/1a9c12b9b40979f480707d227ea588f58a484552))
* select proxy node in connections and rules ([acd1cd2](https://github.com/Zephyruso/zashboard/commit/acd1cd286d71c9bf67f34c91fb70069e9901a422))


### Bug Fixes

* connection card style ([717108f](https://github.com/Zephyruso/zashboard/commit/717108fdd48e9bbe563614c2d1e474a1bd1b2bc3))
* notification style ([9da9272](https://github.com/Zephyruso/zashboard/commit/9da927232cd0a73f260d52794fddf2a82179c618))
* proxies page dual column style ([edda6f3](https://github.com/Zephyruso/zashboard/commit/edda6f37b7f6a073452ffc8ea49542d351dc4829))

## [1.105.0](https://github.com/Zephyruso/zashboard/compare/v1.104.0...v1.105.0) (2025-09-22)


### Features

* auto switch to url backend if exist ([1315204](https://github.com/Zephyruso/zashboard/commit/1315204385835c3367415f55db0d636b6a940415))
* interrupt connection when switching clash_mode ([3921572](https://github.com/Zephyruso/zashboard/commit/3921572103aa1c6918cff94e59fbed8dbc4916a4))


### Bug Fixes

* grouped connection table style ([3f4e082](https://github.com/Zephyruso/zashboard/commit/3f4e0828ef68fe8b4369c43175224b712d7d8f87))
* notification style ([9ceeca4](https://github.com/Zephyruso/zashboard/commit/9ceeca42c7fd1c7ea8dae68b9d2e908ff87362d7))
* total is 0 in subscription ([b45e17a](https://github.com/Zephyruso/zashboard/commit/b45e17a30fad0a4afa8d72cdf028a0489fcb8115))

## [1.104.0](https://github.com/Zephyruso/zashboard/compare/v1.103.1...v1.104.0) (2025-09-16)


### Features

* allow setting separate test URLs for each group ([a7ef57a](https://github.com/Zephyruso/zashboard/commit/a7ef57a0ff5e466ab4f4177948dc2f57f5b93c58))
* display URL in latency test result ([789bfed](https://github.com/Zephyruso/zashboard/commit/789bfed4814f56ae74ef75f55aaa424c120349c4))


### Bug Fixes

* add p-limiter for latency test ([7c656e8](https://github.com/Zephyruso/zashboard/commit/7c656e8bc0e5e21011ca40c97a297d536640e142))

## [1.103.1](https://github.com/Zephyruso/zashboard/compare/v1.103.0...v1.103.1) (2025-09-08)


### Bug Fixes

* latency test result tip ([cd50643](https://github.com/Zephyruso/zashboard/commit/cd50643d6743fa224c3ec6300a835d00f46548a1))
* proxies page performance ([b73f2ac](https://github.com/Zephyruso/zashboard/commit/b73f2acdb298307af362c346eab3ffbb582ed0dd))
* smart core weights fetch ([748272b](https://github.com/Zephyruso/zashboard/commit/748272b082a2505ad4b37713a3e19f5893382593))

## [1.103.0](https://github.com/Zephyruso/zashboard/compare/v1.102.0...v1.103.0) (2025-08-31)


### Features

* build with only one font ([fcb5592](https://github.com/Zephyruso/zashboard/commit/fcb559216fa6ef517bb9fbf3dc6c0f04d5060ed3))
* display final outbound in proxy group ([e974d50](https://github.com/Zephyruso/zashboard/commit/e974d50f7cd8a0bacb404ca9a0de01087cbd1d77))


### Bug Fixes

* build release ([f6abc58](https://github.com/Zephyruso/zashboard/commit/f6abc58be3dc603692c4c426a849b7746f23fab0))
* set history after latency test ([cee66f8](https://github.com/Zephyruso/zashboard/commit/cee66f8ecca239b388e1133e7bead2d9a9503785))
* style for vertical info ([82c390c](https://github.com/Zephyruso/zashboard/commit/82c390c22a5bcab86b890802631aadec05a42e37))
* twemoji color on ios ([b533a17](https://github.com/Zephyruso/zashboard/commit/b533a1757d6e7079f71a98390d45fc11cf8070f8))

## [1.102.0](https://github.com/Zephyruso/zashboard/compare/v1.101.1...v1.102.0) (2025-08-15)


### Features

* add gh-pages-cdn-fonts branch ([899c1d0](https://github.com/Zephyruso/zashboard/commit/899c1d0a1e0af4ab807e90724c8cea7c434cfba1))
* add toast for backend API call ([07833ba](https://github.com/Zephyruso/zashboard/commit/07833ba696865c9e54cce655a383a94da58e7ec0))
* flush dns cache for sing-box ([acdee6f](https://github.com/Zephyruso/zashboard/commit/acdee6f4eb587cb4f66a802588f757ee58cb6806))
* rule card style ([b0a421f](https://github.com/Zephyruso/zashboard/commit/b0a421f867512fbadc60eed3aaa12d326375b4cb))
* style for proxy group ([b1de8f6](https://github.com/Zephyruso/zashboard/commit/b1de8f68eece3d767f66af577516e778c1141a62))
* use twemoji for apple device ([5a7a6ff](https://github.com/Zephyruso/zashboard/commit/5a7a6ff804fb0f5ff8c6f4da452db94b8beb6971))


### Bug Fixes

* add default test turl ([be21958](https://github.com/Zephyruso/zashboard/commit/be21958e53024ee53996a3aa9e19593208041a21))
* animation performance for proxy group mobile ([8547702](https://github.com/Zephyruso/zashboard/commit/85477025fa372705b7360567f585dc08e87f3f43))
* placeholder for ip check failed ([e3a5aa3](https://github.com/Zephyruso/zashboard/commit/e3a5aa3c46ded51219d2be9d6083903ecc73b2a5))

## [1.101.1](https://github.com/Zephyruso/zashboard/compare/v1.101.0...v1.101.1) (2025-08-11)


### Bug Fixes

* add timestamp for geoip api ([82258a9](https://github.com/Zephyruso/zashboard/commit/82258a9432bc22d2b2cccbdde50abde73545b60a))
* add tip for mmdb file size ([e71aa4c](https://github.com/Zephyruso/zashboard/commit/e71aa4c49ff93ffb5ab34917d6010b4c6c46bbec))
* tip for latency test failed ([47196a8](https://github.com/Zephyruso/zashboard/commit/47196a80215e430d1f3cd2b242bf86d881f2b8db))
* tip position for import config ([6caf07c](https://github.com/Zephyruso/zashboard/commit/6caf07cb3d230da0efcb62227f1453e8ea6e76ad))

## [1.101.0](https://github.com/Zephyruso/zashboard/compare/v1.100.0...v1.101.0) (2025-08-05)


### Features

* adaptation for sing-box ui upgrade API ([8f35a14](https://github.com/Zephyruso/zashboard/commit/8f35a14189057d693c66d0c575e95db0d3d52722))
* channel selector for core upgrade ([b181dd1](https://github.com/Zephyruso/zashboard/commit/b181dd1aeef80fbb2c9f648477afce3ed06b1886))
* check update for `mihomo_smart`'s fork ([#461](https://github.com/Zephyruso/zashboard/issues/461)) ([0a48f44](https://github.com/Zephyruso/zashboard/commit/0a48f4411c81ee742434907d66ee664497df67d4))
* log card style ([ecaaea7](https://github.com/Zephyruso/zashboard/commit/ecaaea7a33af5f489198af74347da61b6b2b2029))


### Bug Fixes

* backend api buttons grid style ([375ab8e](https://github.com/Zephyruso/zashboard/commit/375ab8ee8ca1745d9a40cf7c035bcdf701c1a187))
* collapse animation ([8453456](https://github.com/Zephyruso/zashboard/commit/8453456412e7af5e2378fc6e0a027656844dfc13))
* force import settings ([e7ce551](https://github.com/Zephyruso/zashboard/commit/e7ce55108ef952ff1eed637baf9a67575243af61))
* proxies scroll style ([96389aa](https://github.com/Zephyruso/zashboard/commit/96389aacdfbe055cd82e9678c0ca14199f2b6157))

## [1.100.0](https://github.com/Zephyruso/zashboard/compare/v1.99.0...v1.100.0) (2025-07-27)


### Features

* flush dns cache ([81e67ab](https://github.com/Zephyruso/zashboard/commit/81e67abe19f3296f91e420674aa03d83a342b380))
* outbound column ([715481c](https://github.com/Zephyruso/zashboard/commit/715481c18b4dcf181e483d494f4f52cf803bd2cf))


### Bug Fixes

* isProxyGroup for smart ([48efc1f](https://github.com/Zephyruso/zashboard/commit/48efc1fc2abf95a5b7eecec2de97d4ae5ec8d9b9))
* log & toast style ([d2be891](https://github.com/Zephyruso/zashboard/commit/d2be891e07f3eda7460bf199883af2e8c7f841a7))
* remove plimit for latency test ([5f8f70e](https://github.com/Zephyruso/zashboard/commit/5f8f70e63e5cc558ce919f2e6115496a8c14ca97))

## [1.99.0](https://github.com/Zephyruso/zashboard/compare/v1.98.0...v1.99.0) (2025-07-16)


### Features

* shortcut key for router switch ([f246d36](https://github.com/Zephyruso/zashboard/commit/f246d3620fcb2e3fe359a0f53af9e4769bb18c01))


### Bug Fixes

* import settings modal style ([48fa4f8](https://github.com/Zephyruso/zashboard/commit/48fa4f8c6cba0ab5309be3a75cb7dfc9e6546ef5))
* optgroup bg with opacity ([4b57b0b](https://github.com/Zephyruso/zashboard/commit/4b57b0b578cc0afa7b9642e843ea5f490d3d536d))
* proxy sorting will no longer affect policy groups ([4467657](https://github.com/Zephyruso/zashboard/commit/446765780a142025d4e3752b388e45b8b5310033))
* sort for proxy group not in GLOBAL ([27a6c5a](https://github.com/Zephyruso/zashboard/commit/27a6c5a2e4d926362539a34e01aa67f8d5ae1a83))

## [1.98.0](https://github.com/Zephyruso/zashboard/compare/v1.97.0...v1.98.0) (2025-07-08)


### Features

* new looking for sidebar ([934d949](https://github.com/Zephyruso/zashboard/commit/934d94942d797c81317bccec21804305ba5b7ded))


### Bug Fixes

* i18n ([37e3a01](https://github.com/Zephyruso/zashboard/commit/37e3a01fa7113fe92149ca60919966af7cbd5a13))
* performance for massive connections ([866ea1d](https://github.com/Zephyruso/zashboard/commit/866ea1d46358b946b76a2aadeb4d28460878c01d))

## [1.97.0](https://github.com/Zephyruso/zashboard/compare/v1.96.0...v1.97.0) (2025-07-04)


### Features

* import settings with auto update ([2935456](https://github.com/Zephyruso/zashboard/commit/2935456f8dbba9d192543e3255d2dfdb08071ac4))


### Bug Fixes

* icon size settings ([95dc3a5](https://github.com/Zephyruso/zashboard/commit/95dc3a51d566f7189c5804a2d8d72e1bb4b43ff0))
* some minor fix ([6f2edb6](https://github.com/Zephyruso/zashboard/commit/6f2edb651f32bfcda05f341647650d9cc5dfda84))

## [1.96.0](https://github.com/Zephyruso/zashboard/compare/v1.95.1...v1.96.0) (2025-06-27)


### Features

* add network info switch for overview page ([bc5403d](https://github.com/Zephyruso/zashboard/commit/bc5403da40134b0d6800806321930e7e62dfb955))


### Bug Fixes

* add key for proxy chains ([c2ec9b6](https://github.com/Zephyruso/zashboard/commit/c2ec9b66f91e4576ede113f00277911c0a5411bf))
* performance for massive connections ([a1de977](https://github.com/Zephyruso/zashboard/commit/a1de977005eeae0e02e139ea466390fa9623b0a5))

## [1.95.1](https://github.com/Zephyruso/zashboard/compare/v1.95.0...v1.95.1) (2025-06-23)


### Bug Fixes

* proxy group sort by latency ([8ee9827](https://github.com/Zephyruso/zashboard/commit/8ee9827030fce65530036dd44181e3673ff0b078))

## [1.95.0](https://github.com/Zephyruso/zashboard/compare/v1.94.2...v1.95.0) (2025-06-21)


### Features

* add level filter options for logs ([6f5c9dc](https://github.com/Zephyruso/zashboard/commit/6f5c9dcf5fe4d44ac8c57880fdb684b27eb667cd))
* smart group sort by usage ([116f01d](https://github.com/Zephyruso/zashboard/commit/116f01dda993fe5dc19bb84506ef76041936cf03))


### Bug Fixes

* drag for thead resize handler ([bdea376](https://github.com/Zephyruso/zashboard/commit/bdea3765252f86997a12914fd1789d7b4ba6bfbb))
* duplicate theme selector ([b76f9b7](https://github.com/Zephyruso/zashboard/commit/b76f9b75b87ef487fd5015136c45bbcdb5522a6a))

## [1.94.2](https://github.com/Zephyruso/zashboard/compare/v1.94.1...v1.94.2) (2025-06-16)


### Bug Fixes

* drag behavier ([3fdfd73](https://github.com/Zephyruso/zashboard/commit/3fdfd73b4b160a63d61b88a20a64873fa37f20de))
* proxy chains sort ([851ebb9](https://github.com/Zephyruso/zashboard/commit/851ebb9b8fec95063601936b76be537d7fca309e))
* remove close btn for closed conns ([23abefe](https://github.com/Zephyruso/zashboard/commit/23abefe66de64723dc47026461b58596f73727df))

## [1.94.1](https://github.com/Zephyruso/zashboard/compare/v1.94.0...v1.94.1) (2025-06-13)


### Bug Fixes

* auto scroll into view for mobile ([c5e701c](https://github.com/Zephyruso/zashboard/commit/c5e701cd970903b290f97ca93c6ecdbd56e2d64c))
* blur bg style for pinned columns ([3f4f8ec](https://github.com/Zephyruso/zashboard/commit/3f4f8ec4603c3a15767d22e76a354e20b89eee08))
* copy value for proxy chains column ([1ab23bf](https://github.com/Zephyruso/zashboard/commit/1ab23bf0fe45ff76d27688d140d23d80d1a91847))
* fullscreen mode for proxies chart with bg-image ([acac4b6](https://github.com/Zephyruso/zashboard/commit/acac4b64596ee38483b7337228c2f12166cc6ebd))

## [1.94.0](https://github.com/Zephyruso/zashboard/compare/v1.93.1...v1.94.0) (2025-06-12)


### Features

* copy table content with right click ([c932df2](https://github.com/Zephyruso/zashboard/commit/c932df2f2a17ba8a74afec59c320244f8ccc78dc))
* drag the table with left mouse button ([4832487](https://github.com/Zephyruso/zashboard/commit/4832487886beecf412c3f4a243483a9661080a75))
* make backend editable ([1bc72de](https://github.com/Zephyruso/zashboard/commit/1bc72deaa9e47589970a56ceb5e4d55775015198))
* pinnable columns ([abd8184](https://github.com/Zephyruso/zashboard/commit/abd8184707c153533fbd2619a60a51721ff2009c))


### Bug Fixes

* sourceip scope for logs ([16379ff](https://github.com/Zephyruso/zashboard/commit/16379ffa423a99bd133672282b21d6dde8554d75))

## [1.93.1](https://github.com/Zephyruso/zashboard/compare/v1.93.0...v1.93.1) (2025-06-05)


### Bug Fixes

* collapse style with opacity ([78eefe3](https://github.com/Zephyruso/zashboard/commit/78eefe39a862acbef852c2a47420d7edf3cbcfa0))
* final destination for direct connection ([0702d1a](https://github.com/Zephyruso/zashboard/commit/0702d1afdb46b11ab0c4f31021d3570e3f19b0cc))
* smart weights display for mobile ([4183ece](https://github.com/Zephyruso/zashboard/commit/4183ece9049114cfcf4c686c45e6833f56635128))

## [1.93.0](https://github.com/Zephyruso/zashboard/compare/v1.92.0...v1.93.0) (2025-05-29)


### Features

* support multiple keywords in search ([0fc9775](https://github.com/Zephyruso/zashboard/commit/0fc97751a3d31268f0e6bbf7d00e65574882ecea))


### Bug Fixes

* incorrect scrolling status when switching tabs in proxies ([bce9465](https://github.com/Zephyruso/zashboard/commit/bce9465b21b9206a277b6ec0f63581f6ff34da5c))
* popover position for theme selector ([e9adf77](https://github.com/Zephyruso/zashboard/commit/e9adf77874d443d301fc86877c917b13f57c2129))

## [1.92.0](https://github.com/Zephyruso/zashboard/compare/v1.91.0...v1.92.0) (2025-05-27)


### Features

* proxies relationship chart ([c504440](https://github.com/Zephyruso/zashboard/commit/c504440e2e9f4596c6e707b67c6d61a437ce3141))


### Bug Fixes

* tab style for mobile ([ed5b7fd](https://github.com/Zephyruso/zashboard/commit/ed5b7fd1db813d58b8bc8a3f60b9052f8f665d9a))

## [1.91.0](https://github.com/Zephyruso/zashboard/compare/v1.90.0...v1.91.0) (2025-05-26)


### Features

* auto scroll into view for proxy node ([3064505](https://github.com/Zephyruso/zashboard/commit/30645058f639dbe01cf07654b1460c73db905129))
* collapsible sliders for opacity and blur ([5d88196](https://github.com/Zephyruso/zashboard/commit/5d881964ce0c952ab9e2299139cb876573703305))
* download logs ([16fc9ee](https://github.com/Zephyruso/zashboard/commit/16fc9ee86685a472835e01d9d6108cf6c3a243d9))
* store scroll status for proxies page ([0522c68](https://github.com/Zephyruso/zashboard/commit/0522c68ca0eed7ae47745e5deb6bd5c3980c1f29))


### Bug Fixes

* display issue of the popover for sourceip scope ([6db326e](https://github.com/Zephyruso/zashboard/commit/6db326e2d2c89333e1aa261bdb6703042562c34d))
* flickering scrollbar ([7aaa6aa](https://github.com/Zephyruso/zashboard/commit/7aaa6aa6c3bd20a479bb53f9f41fa7c7797c73f6))
* freezing issue when scroll animation is on ([e293832](https://github.com/Zephyruso/zashboard/commit/e2938326b98b8ed9ffd62a66fb7121569df2f479))
* missing sourceip filter when ip is invalid ([e5ff530](https://github.com/Zephyruso/zashboard/commit/e5ff53080c30e6e7afcea0cc357a3fc964a2fe4a))
* unable to disable blur in proxies for mobile ([16441fc](https://github.com/Zephyruso/zashboard/commit/16441fc788a7c00c328e5b4617b93102dba01b77))

## [1.90.0](https://github.com/Zephyruso/zashboard/compare/v1.89.2...v1.90.0) (2025-05-23)


### Features

* custom global node for sing-box ([9ead3bd](https://github.com/Zephyruso/zashboard/commit/9ead3bdb3fcac40f0c1c0abc6238853ba958560b))
* new animation for proxy group mobile ([e06225e](https://github.com/Zephyruso/zashboard/commit/e06225ed9065e883ef64bdb6ddbe2d333cab1402))


### Bug Fixes

* independent latency test for provider healthcheck ([9f26a5d](https://github.com/Zephyruso/zashboard/commit/9f26a5defd581c18fb20fc828373d9dc57ec6b0b))

## [1.89.2](https://github.com/Zephyruso/zashboard/compare/v1.89.1...v1.89.2) (2025-05-22)


### Bug Fixes

* dropdown position for safari ([51ca0a4](https://github.com/Zephyruso/zashboard/commit/51ca0a4f42a7e9e8a86186e767b3a6117390795c))
* font name of system-ui ([#381](https://github.com/Zephyruso/zashboard/issues/381)) ([f5a9db9](https://github.com/Zephyruso/zashboard/commit/f5a9db98be666e7c66be6674d51d8b9ea7998a2b))

## [1.89.1](https://github.com/Zephyruso/zashboard/compare/v1.89.0...v1.89.1) (2025-05-21)


### Bug Fixes

* animation performance for proxy group mobile ([d80c8b0](https://github.com/Zephyruso/zashboard/commit/d80c8b086116df94ffbcc47e4a1ba156515900fd))
* lazy load for proxies ([80ef19c](https://github.com/Zephyruso/zashboard/commit/80ef19c911dc8ad03f17e84b6566659f51040b2b))
* truncate name for proxy group mobile ([bf74766](https://github.com/Zephyruso/zashboard/commit/bf74766dfa574640f78eeee6403439eb9fa2dc89))

## [1.89.0](https://github.com/Zephyruso/zashboard/compare/v1.88.0...v1.89.0) (2025-05-20)


### Features

* theme selector with preview ([e8a4335](https://github.com/Zephyruso/zashboard/commit/e8a4335bdf2c3e85b3378d2b8a64c98d25884220))


### Bug Fixes

* asn name -&gt; org name ([337f2c4](https://github.com/Zephyruso/zashboard/commit/337f2c48c2e0520e93d3e1a5e7f834926c931ca2))
* is private ip ([570aae9](https://github.com/Zephyruso/zashboard/commit/570aae9be701c41abd8f107e54dba4ac41791b6b))
* sourceip label scope style ([1cb4c56](https://github.com/Zephyruso/zashboard/commit/1cb4c56f34fdb87716ce637d08baa0e925deddf9))

## [1.88.0](https://github.com/Zephyruso/zashboard/compare/v1.87.0...v1.88.0) (2025-05-19)


### Features

* effective scope for source ip label ([672df69](https://github.com/Zephyruso/zashboard/commit/672df6996c90926b5c04ac69a6c016257cccf34e))


### Bug Fixes

* display backend label instead of url ([6cc3469](https://github.com/Zephyruso/zashboard/commit/6cc3469e2b3eda6f064f2fa49e408da4f90facef))
* truncate long version numbers ([534891b](https://github.com/Zephyruso/zashboard/commit/534891bf7d3450713a23e847c78af12aad4f6b21))

## [1.87.0](https://github.com/Zephyruso/zashboard/compare/v1.86.0...v1.87.0) (2025-05-16)


### Features

* adaptive modal height for proxy group mobile ([7a5db3d](https://github.com/Zephyruso/zashboard/commit/7a5db3d2d42c8c1c8086c499512ba2bf2dff8947))
* auto disconnect idle udp ([7943d73](https://github.com/Zephyruso/zashboard/commit/7943d7304b0716daf687d605cb58ca58a00c92ce))
* switch for swipe in pages ([6833d5e](https://github.com/Zephyruso/zashboard/commit/6833d5e76bd043b30f3ecafb997f28b8c583d8e5))

## [1.86.0](https://github.com/Zephyruso/zashboard/compare/v1.85.0...v1.86.0) (2025-05-15)


### Features

* search log with type selector ([8741f2c](https://github.com/Zephyruso/zashboard/commit/8741f2cfa59692b564e4851e8c1c12233fea6b24))


### Bug Fixes

* delete fixed for smart group ([5bcbd2b](https://github.com/Zephyruso/zashboard/commit/5bcbd2b31819e721a10f76a357e8e881ab59498a))

## [1.85.0](https://github.com/Zephyruso/zashboard/compare/v1.84.0...v1.85.0) (2025-05-14)


### Features

* display proxies grouped by provider ([5207e76](https://github.com/Zephyruso/zashboard/commit/5207e76aee03773bf43099070de1c418a0cf6055))
* usage desc in proxy card for smart group ([8f1b370](https://github.com/Zephyruso/zashboard/commit/8f1b37009222c083ba63c30cda7c72ef13928671))


### Bug Fixes

* cache for github api ([51c6926](https://github.com/Zephyruso/zashboard/commit/51c692656405065d6e18a8b6c35cf3fe8a1c0daf))
* missing lock icon for proxy group in mobile ([c66c846](https://github.com/Zephyruso/zashboard/commit/c66c84635fbf1c379b97c15ab4a333fb54a2708d))

## [1.84.0](https://github.com/Zephyruso/zashboard/compare/v1.83.0...v1.84.0) (2025-05-13)


### Features

* latency test result tip ([02e4628](https://github.com/Zephyruso/zashboard/commit/02e462841835d7efddf4a58483401c328e4c1079))
* options for geoip api ([ef693c8](https://github.com/Zephyruso/zashboard/commit/ef693c821686b9d56194787bf9fd0d36b4f0b443))


### Bug Fixes

* cache github version check result ([b9f9864](https://github.com/Zephyruso/zashboard/commit/b9f9864594e9306874a060c026259eef155f09d6))
* display now node for smart ([856a4a6](https://github.com/Zephyruso/zashboard/commit/856a4a6cc8f7b410a25741453b5c99c274088964))

## [1.83.0](https://github.com/Zephyruso/zashboard/compare/v1.82.0...v1.83.0) (2025-05-12)


### Features

* make logs history deletable ([efe4bdb](https://github.com/Zephyruso/zashboard/commit/efe4bdb47b8ce98543fe0845f8987e324d9147f2))
* smart group api ([55510ae](https://github.com/Zephyruso/zashboard/commit/55510ae801a458cd933dae63b332c0826d78845d))


### Bug Fixes

* block error tip for latency test ([a84c608](https://github.com/Zephyruso/zashboard/commit/a84c60846d221632cb3a206f7d2e5796894415cc))
* sourceip options sort ([7907be0](https://github.com/Zephyruso/zashboard/commit/7907be04d52433227d0ae5bde32c0a71ec44ec23))
* style ([193acc2](https://github.com/Zephyruso/zashboard/commit/193acc23cfdb60722b4b16e1544f6c458d111518))

## [1.82.0](https://github.com/Zephyruso/zashboard/compare/v1.81.0...v1.82.0) (2025-04-27)


### Features

* display icon in connection details ([182b51f](https://github.com/Zephyruso/zashboard/commit/182b51f1266ae945d058795d1a8a5aa52336aba7))


### Bug Fixes

* case insensitive search for connections ([771119a](https://github.com/Zephyruso/zashboard/commit/771119a9fde71b97dccd7f096a75592201b1169e))
* discard outdated latency result ([97cce60](https://github.com/Zephyruso/zashboard/commit/97cce608067b038db05f7c418b9410b29f160d99))
* xudp tag display ([c281d7c](https://github.com/Zephyruso/zashboard/commit/c281d7c6736c01f90b31a56bd3cf0ced66bc8452))

## [1.81.0](https://github.com/Zephyruso/zashboard/compare/v1.80.2...v1.81.0) (2025-04-23)


### Features

* inbound user column ([7db4d1b](https://github.com/Zephyruso/zashboard/commit/7db4d1bbdd23c043e5b8cd9f503a96239053667e))
* notification for upgrade result ([a5adac3](https://github.com/Zephyruso/zashboard/commit/a5adac3be271598db4baf85f39f4dc98855650c8))
* setting for number of charts in sidebar ([0f61f4d](https://github.com/Zephyruso/zashboard/commit/0f61f4da39a57600cd978a40bd1462810120395e))


### Bug Fixes

* icon settings collapse style ([7a17311](https://github.com/Zephyruso/zashboard/commit/7a173114da06fe31a7df25a0c1049c308b7b19c7))
* safe area for bottom ([72b3682](https://github.com/Zephyruso/zashboard/commit/72b36821e32675850796564f2f23994fcf03cef4))

## [1.80.2](https://github.com/Zephyruso/zashboard/compare/v1.80.1...v1.80.2) (2025-04-18)


### Bug Fixes

* input select style ([f20ed11](https://github.com/Zephyruso/zashboard/commit/f20ed1186c2ce63f670bc0e42cff7d78751b063e))
* modal opacity style ([5c56ddc](https://github.com/Zephyruso/zashboard/commit/5c56ddc7f9184871deacdfa29814ca8bb94b04cc))

## [1.80.1](https://github.com/Zephyruso/zashboard/compare/v1.80.0...v1.80.1) (2025-04-17)


### Bug Fixes

* 0 in memory ws ([870dc0f](https://github.com/Zephyruso/zashboard/commit/870dc0f127b4a8047f8e31a0ad33dbfb6b2c0666))
* style for transparent ([6e54ac3](https://github.com/Zephyruso/zashboard/commit/6e54ac322b6d8feb304ff370a003056c7e99ed39))

## [1.80.0](https://github.com/Zephyruso/zashboard/compare/v1.79.0...v1.80.0) (2025-04-16)


### Features

* blur intensity ([cc73668](https://github.com/Zephyruso/zashboard/commit/cc73668889d18f177065406b9633329c76edba1f))
* import settings from url ([a67a337](https://github.com/Zephyruso/zashboard/commit/a67a33718b51217e86eeef4b819af573a7a973f6))


### Bug Fixes

* proxy group invisible ([461aa0b](https://github.com/Zephyruso/zashboard/commit/461aa0b1ea81b640ce7a174df31531ced4636999))

## [1.79.0](https://github.com/Zephyruso/zashboard/compare/v1.78.0...v1.79.0) (2025-04-15)


### Features

* blurry effect ([8398a43](https://github.com/Zephyruso/zashboard/commit/8398a435bfffb8aaaaac22423fb33dc6e76378ad))
* display all features setting for sing-box fork ([f309a89](https://github.com/Zephyruso/zashboard/commit/f309a89d193556f01663782b2ca8772390b8a6bf))
* switch for scroll animation ([1d9062b](https://github.com/Zephyruso/zashboard/commit/1d9062b60274e09a4afd350eddbdbe9155f4c477))


### Bug Fixes

* bounce animation flicker ([7ceafb9](https://github.com/Zephyruso/zashboard/commit/7ceafb91cf0ae1f433c22abfc9d25f465bbacb8a))
* translate for mode ([2660118](https://github.com/Zephyruso/zashboard/commit/2660118f9103b802d6ec4051238974146eb8d040))

## [1.78.0](https://github.com/Zephyruso/zashboard/compare/v1.77.0...v1.78.0) (2025-04-13)


### Features

* reF1nd sing-box ([16c4f47](https://github.com/Zephyruso/zashboard/commit/16c4f47ba6a19d7196c4774d96c4de4917adedce))
* update rule provider in rules ([1a9605c](https://github.com/Zephyruso/zashboard/commit/1a9605c89d4c99e67cff76e460ab9118b862e385))

## [1.77.0](https://github.com/Zephyruso/zashboard/compare/v1.76.3...v1.77.0) (2025-04-11)


### Features

* bouncein animation for mobile ([a1e9d38](https://github.com/Zephyruso/zashboard/commit/a1e9d38b3f98d28ee0a100635e5c4e79aa0c660f))


### Bug Fixes

* chart performance ([ca7b861](https://github.com/Zephyruso/zashboard/commit/ca7b861fea8e03fc8d9ba94863d561fb1dd52c8c))

## [1.76.3](https://github.com/Zephyruso/zashboard/compare/v1.76.2...v1.76.3) (2025-04-10)


### Bug Fixes

* merge same sourceip label options ([43a8576](https://github.com/Zephyruso/zashboard/commit/43a8576eddab71f5c7590a166b9a84dc738bea1a))
* performance for page switch ([f25b5bc](https://github.com/Zephyruso/zashboard/commit/f25b5bc12e46e4482da48597ad967ddbaa5293ee))
* swipe animation performance ([9837522](https://github.com/Zephyruso/zashboard/commit/98375229e1db1efb8d8047e2f592ca56950fee53))

## [1.76.2](https://github.com/Zephyruso/zashboard/compare/v1.76.1...v1.76.2) (2025-04-02)


### Bug Fixes

* hidden group icon status ([89d459a](https://github.com/Zephyruso/zashboard/commit/89d459ab56c718de2d0cc3440bf71c13493abaaf))
* make disable pull to refresh optional ([56e2273](https://github.com/Zephyruso/zashboard/commit/56e2273da856510f95b95aba19b208798366183e))

## [1.76.1](https://github.com/Zephyruso/zashboard/compare/v1.76.0...v1.76.1) (2025-03-30)


### Bug Fixes

* catch icon settings empty ([1e95227](https://github.com/Zephyruso/zashboard/commit/1e95227f34c3b076db09c310a3d7b6e210d5b071))
* chart style in sidebar ([88e4b17](https://github.com/Zephyruso/zashboard/commit/88e4b176cd28d636a542d2dda820396638ee00c5))

## [1.76.0](https://github.com/Zephyruso/zashboard/compare/v1.75.2...v1.76.0) (2025-03-26)


### Features

* custom icon for sing-box ([6db29e2](https://github.com/Zephyruso/zashboard/commit/6db29e2b7a2cc885a3ae67fd301bf18df1922996))


### Bug Fixes

* outline style ([c840ab2](https://github.com/Zephyruso/zashboard/commit/c840ab2d71ff8f4f118ac98dc7d00bff3b400e71))

## [1.75.2](https://github.com/Zephyruso/zashboard/compare/v1.75.1...v1.75.2) (2025-03-24)


### Bug Fixes

* collapse animation performance ([9c72e96](https://github.com/Zephyruso/zashboard/commit/9c72e961725a15196188edb3731c8c48d6944237))
* missing collapse all btn in mobile ([3e7ee22](https://github.com/Zephyruso/zashboard/commit/3e7ee224f0646820f6f3635c37d8b05a95644457))
* region for details ([eaf8cf1](https://github.com/Zephyruso/zashboard/commit/eaf8cf1127bafaa6dfa83d9d90f60ae972489e3c))

## [1.75.1](https://github.com/Zephyruso/zashboard/compare/v1.75.0...v1.75.1) (2025-03-21)


### Bug Fixes

* long rule for sing-box in table ([164f98f](https://github.com/Zephyruso/zashboard/commit/164f98ff6a54fec9a8e10563f72f496094bd26ce))
* setup page style ([5305893](https://github.com/Zephyruso/zashboard/commit/5305893312e0a35f4c8d859df9146be97039a465))

## [1.75.0](https://github.com/Zephyruso/zashboard/compare/v1.74.0...v1.75.0) (2025-03-19)


### Features

* city location for connection details ([44eb86d](https://github.com/Zephyruso/zashboard/commit/44eb86d11f24afc1a5eca138b0688cca7a4078f0))
* using the existing theme to reset custom theme ([daadc8f](https://github.com/Zephyruso/zashboard/commit/daadc8f6ba43cf66841aff80280bd42a447633e3))


### Bug Fixes

* long host style in connection table ([9428cc5](https://github.com/Zephyruso/zashboard/commit/9428cc505d0d46200042b21e5164f56d58f449e2))

## [1.74.0](https://github.com/Zephyruso/zashboard/compare/v1.73.1...v1.74.0) (2025-03-18)


### Features

* add custom theme ([4679ddd](https://github.com/Zephyruso/zashboard/commit/4679dddb900271386e430e7bc691bbf06fb44180))


### Bug Fixes

* highlight text for dark theme ([902af5c](https://github.com/Zephyruso/zashboard/commit/902af5cff064d9f3b29329383be43b48f1d6d089))

## [1.73.1](https://github.com/Zephyruso/zashboard/compare/v1.73.0...v1.73.1) (2025-03-17)


### Bug Fixes

* make daisyui v5 theme as default ([e0bc078](https://github.com/Zephyruso/zashboard/commit/e0bc07881ce62258534e40874513455864c6a987))
* proxy chains sort ([3415c3f](https://github.com/Zephyruso/zashboard/commit/3415c3f89b29df6f2bdefca7e66e5aba8be482db))
* style for connection details ([17d3504](https://github.com/Zephyruso/zashboard/commit/17d3504eac86856d24cb8e7b3312c1d299d42f96))

## [1.73.0](https://github.com/Zephyruso/zashboard/compare/v1.72.3...v1.73.0) (2025-03-14)


### Features

* support all sing-box log level ([864997c](https://github.com/Zephyruso/zashboard/commit/864997c21efd1f14c8abe3cd76247529f0c4cb7c))


### Bug Fixes

* catch testurl is empty ([a40c7e3](https://github.com/Zephyruso/zashboard/commit/a40c7e312d5d9e1ca7a2e9d32ad1a5e870e75578))
* remove openai cdn test ([78bfe09](https://github.com/Zephyruso/zashboard/commit/78bfe0945bb09fa9f9d5f30227b6e1a4c3fdda93))
* remove redirect to setup when api 404 ([50ca346](https://github.com/Zephyruso/zashboard/commit/50ca346b806491c12fa066ffca1bc75353a6310e))

## [1.72.3](https://github.com/Zephyruso/zashboard/compare/v1.72.2...v1.72.3) (2025-03-12)


### Bug Fixes

* prevent selecting a selected node ([b7fd831](https://github.com/Zephyruso/zashboard/commit/b7fd8316420574da51b591bfac55a5afc085f1aa))

## [1.72.2](https://github.com/Zephyruso/zashboard/compare/v1.72.1...v1.72.2) (2025-03-10)


### Bug Fixes

* animation for swipe page ([f25078c](https://github.com/Zephyruso/zashboard/commit/f25078cad670cc4dcae709a8fe095d79722768c1))
* i18n for remote destination ([788fef0](https://github.com/Zephyruso/zashboard/commit/788fef0fa8c0a979c4d290032a2c507826868474))

## [1.72.1](https://github.com/Zephyruso/zashboard/compare/v1.72.0...v1.72.1) (2025-03-07)


### Bug Fixes

* connection & proxies ctrl style for iPad ([9c02345](https://github.com/Zephyruso/zashboard/commit/9c023451662e1922de4d7f0128a338c694cabda8))
* separate destination and proxy node IP column ([51a502e](https://github.com/Zephyruso/zashboard/commit/51a502e942d63be1fab9fbb0b81c94714f97237c))

## [1.72.0](https://github.com/Zephyruso/zashboard/compare/v1.71.0...v1.72.0) (2025-03-06)


### Features

* policy fixed now tip ([f1fab79](https://github.com/Zephyruso/zashboard/commit/f1fab79c191a727bb1e134ffa6795827299cefd3))


### Bug Fixes

* remove CNAME in dist ([5e1c4d3](https://github.com/Zephyruso/zashboard/commit/5e1c4d31884c56327f38fb91925d69d025e4be3c))
* sort desc first for speeds ([f3030bc](https://github.com/Zephyruso/zashboard/commit/f3030bcc567a12324cfdcfdc6b08b3c32d9603de))
* url https params ([c53165a](https://github.com/Zephyruso/zashboard/commit/c53165a3f1bf1695457a2970912da6513b5b6903))

## [1.71.0](https://github.com/Zephyruso/zashboard/compare/v1.70.2...v1.71.0) (2025-03-05)


### Features

* daisyuiv5-theme ([eec8209](https://github.com/Zephyruso/zashboard/commit/eec8209f23f6dab9ab1247d66286870bb9604052))
* link to backend github ([ae6a3e0](https://github.com/Zephyruso/zashboard/commit/ae6a3e05e97acabc6f61f751775ce85ceee6a594))
* setting for auto theme ([1aabb78](https://github.com/Zephyruso/zashboard/commit/1aabb784e07ce050f77c4cd3a970e716455b525f))

## [1.70.2](https://github.com/Zephyruso/zashboard/compare/v1.70.1...v1.70.2) (2025-03-04)


### Bug Fixes

* bring old default theme back ([ecd0a5b](https://github.com/Zephyruso/zashboard/commit/ecd0a5b30af7ac3240c86b742fa7a970f553988a))

## [1.70.1](https://github.com/Zephyruso/zashboard/compare/v1.70.0...v1.70.1) (2025-03-04)


### Bug Fixes

* bring old v4 light and dark theme back to v5 ([d73484a](https://github.com/Zephyruso/zashboard/commit/d73484a84d2e429857e4eb899fe479c78e1a4f4c))

## [1.70.0](https://github.com/Zephyruso/zashboard/compare/v1.69.0...v1.70.0) (2025-03-03)


### Features

* daisyui v5 & tailwindcss v4 ([9df2083](https://github.com/Zephyruso/zashboard/commit/9df2083da99dc5baf008edc36f49d68c9c89171e))
* transfer type for connection table ([28f59c3](https://github.com/Zephyruso/zashboard/commit/28f59c3c8006054c9d40b29b96ee29f5e8b2ff12))


### Bug Fixes

* hide toggle collapse btn ([3f3bc03](https://github.com/Zephyruso/zashboard/commit/3f3bc03394925005abbc9e3f9101c172f00ee7aa))
* promise race for automatic backend switch ([be8fecb](https://github.com/Zephyruso/zashboard/commit/be8fecbc50643dd71919233914ae1b867d348379))

## [1.69.0](https://github.com/Zephyruso/zashboard/compare/v1.68.3...v1.69.0) (2025-02-26)


### Features

* switch for display now node & latency number in rule ([5a24958](https://github.com/Zephyruso/zashboard/commit/5a24958d18258136abe8af33e7870ae23ba1a9af))


### Bug Fixes

* provider style and count ([8a2eb32](https://github.com/Zephyruso/zashboard/commit/8a2eb32ff73648d7a6537f5875344dcd7fc681e9))
* proxies preview auto ([9c1f00b](https://github.com/Zephyruso/zashboard/commit/9c1f00b9163ee44ba87bb054c7410da857d31237))

## [1.68.3](https://github.com/Zephyruso/zashboard/compare/v1.68.2...v1.68.3) (2025-02-25)


### Bug Fixes

* manage hidden groups and other minor style ([cde403e](https://github.com/Zephyruso/zashboard/commit/cde403ec9e8ce6466bedb7b18c5d354f36111edc))
* proxy group grid style ([460d426](https://github.com/Zephyruso/zashboard/commit/460d426208f9873f48026ee1fed16447ea0822e5))

## [1.68.2](https://github.com/Zephyruso/zashboard/compare/v1.68.1...v1.68.2) (2025-02-24)


### Bug Fixes

* animation and performance for two-column ([1e38efc](https://github.com/Zephyruso/zashboard/commit/1e38efc5ebe7af0672aea8e3a205d2aa34794673))

## [1.68.1](https://github.com/Zephyruso/zashboard/compare/v1.68.0...v1.68.1) (2025-02-24)


### Bug Fixes

* proxy provider style with two-columns ([1e2d07e](https://github.com/Zephyruso/zashboard/commit/1e2d07ea943f2764e8d0f6c2a324cdb6cd7b9402))

## [1.68.0](https://github.com/Zephyruso/zashboard/compare/v1.67.1...v1.68.0) (2025-02-24)


### Features

* two-columns groups for mobile inspired by Clash Dash and Surge ([9e9fc5f](https://github.com/Zephyruso/zashboard/commit/9e9fc5f5d954d9b70055b99c23f03fde134263f5))


### Bug Fixes

* backend available detect ([0d8db22](https://github.com/Zephyruso/zashboard/commit/0d8db2271bef2aa1da0a4c0a5481c1ac31c5c3ec))

## [1.67.1](https://github.com/Zephyruso/zashboard/compare/v1.67.0...v1.67.1) (2025-02-22)


### Bug Fixes

* disable proxy select for loadbalance ([e37f83e](https://github.com/Zephyruso/zashboard/commit/e37f83e1e12fd6a5ce984a55bb2076c585579306))
* switch for display GLOBAL by mode ([60fc0c3](https://github.com/Zephyruso/zashboard/commit/60fc0c33adb13d7fd0e1c18d6a320fd7d5a8a08b))

## [1.67.0](https://github.com/Zephyruso/zashboard/compare/v1.66.0...v1.67.0) (2025-02-21)


### Features

* available proxy count ([163f261](https://github.com/Zephyruso/zashboard/commit/163f261d71d0704d2c44e601530b02af560698b5))
* customizable min card width ([2958beb](https://github.com/Zephyruso/zashboard/commit/2958beb7c3b5b6e20ddb4d9af00312978a9d0283))
* hover tip for proxygroup now node ([fb3b58e](https://github.com/Zephyruso/zashboard/commit/fb3b58eaa80e2f201323ae9d4149cf99be33cb29))
* options for display global in non global mode ([9f2ca36](https://github.com/Zephyruso/zashboard/commit/9f2ca36569ced463957c9e8f5493af5aae475501))


### Bug Fixes

* options for proxies count ([e0e51af](https://github.com/Zephyruso/zashboard/commit/e0e51af831a62933a2137b7e7230c78d91e2d4f1))
* proxy provider style ([9eb400b](https://github.com/Zephyruso/zashboard/commit/9eb400b19cfdf905c879616af8e78d2863823dfb))

## [1.66.0](https://github.com/Zephyruso/zashboard/compare/v1.65.1...v1.66.0) (2025-02-19)


### Features

* log search history ([091afd4](https://github.com/Zephyruso/zashboard/commit/091afd4ea81782d490458ccaf56880bd1d7a0812))
* refresh btn for pwa ([791a287](https://github.com/Zephyruso/zashboard/commit/791a28780cc2c2f812de7e5053cf8c143d05e858))


### Bug Fixes

* global for sing-box ([ae25805](https://github.com/Zephyruso/zashboard/commit/ae25805370970a2faa82f9a7a65cb36ea6f21b5c))
* icon cache by browser ([b459108](https://github.com/Zephyruso/zashboard/commit/b459108dae76e5329ed8b0cc8031250257e68fc2))

## [1.65.1](https://github.com/Zephyruso/zashboard/compare/v1.65.0...v1.65.1) (2025-02-18)


### Bug Fixes

* scrollbar & proxy chains style ([16bdbc4](https://github.com/Zephyruso/zashboard/commit/16bdbc438214bc00be65f57ce3dfd881a3e238b9))

## [1.65.0](https://github.com/Zephyruso/zashboard/compare/v1.64.0...v1.65.0) (2025-02-17)


### Features

* hover tip for latency history ([4814e90](https://github.com/Zephyruso/zashboard/commit/4814e905c8c05280513cc7bf9f815d62731ab670))
* url params disable upgrade core ([cfca43c](https://github.com/Zephyruso/zashboard/commit/cfca43c3fd58a183fc58f595560cc317273735a7))


### Bug Fixes

* connections details modal ([de18946](https://github.com/Zephyruso/zashboard/commit/de189463ac2359e7260ad3fc5d90dde90b6e6b42))
* ip details when destinationIP is null ([3d1e4cd](https://github.com/Zephyruso/zashboard/commit/3d1e4cdbdbbe6256265553d675156ab2d5f7a678))
* rule provider style ([f0dda31](https://github.com/Zephyruso/zashboard/commit/f0dda319db40382c82527814803996fdc6343938))

## [1.64.0](https://github.com/Zephyruso/zashboard/compare/v1.63.1...v1.64.0) (2025-02-13)


### Features

* draggable & editable source ip label ([36d19a9](https://github.com/Zephyruso/zashboard/commit/36d19a9aff9f9df6a53039fce3d408fb3a5420db))


### Bug Fixes

* disable swipe when input focused ([6426052](https://github.com/Zephyruso/zashboard/commit/6426052a9be131a0c032fd8a699160e168002539))
* placeholder for sourceip & icon ([bbbf52f](https://github.com/Zephyruso/zashboard/commit/bbbf52fe295632dc18b612207f6176ff2c03f6af))

## [1.63.1](https://github.com/Zephyruso/zashboard/compare/v1.63.0...v1.63.1) (2025-02-12)


### Bug Fixes

* source ip input & backend version style ([441871c](https://github.com/Zephyruso/zashboard/commit/441871cef532d52787273270e489cd3cf7d3d210))
* timeout for notification ([2ecbb6b](https://github.com/Zephyruso/zashboard/commit/2ecbb6bd40780266608c4cdc33ba1756ab44aeb8))

## [1.63.0](https://github.com/Zephyruso/zashboard/compare/v1.62.1...v1.63.0) (2025-02-10)


### Features

* autocomplete for source ip label ([83640ca](https://github.com/Zephyruso/zashboard/commit/83640ca5e0a334a86202cc379042fb9c72ac6254))
* switch for core upgrade check ([5ceaa73](https://github.com/Zephyruso/zashboard/commit/5ceaa737bc51d052d71a883ed4db56124d3e76a3))


### Bug Fixes

* card/table customize style ([8d3a382](https://github.com/Zephyruso/zashboard/commit/8d3a382d6a10f9d21b08f8c176cba1145d905527))
* grid style ([677abad](https://github.com/Zephyruso/zashboard/commit/677abad58014930d6cadbc68316dd6a861158018))
* remove deprecated details button ([b06492a](https://github.com/Zephyruso/zashboard/commit/b06492af4b6ec28d403ccc001b0436140b420ec9))

## [1.62.1](https://github.com/Zephyruso/zashboard/compare/v1.62.0...v1.62.1) (2025-02-08)


### Bug Fixes

* card customize style ([3cb1e84](https://github.com/Zephyruso/zashboard/commit/3cb1e84bced195d370e049a64e3aed3a188ff4bf))

## [1.62.0](https://github.com/Zephyruso/zashboard/compare/v1.61.2...v1.62.0) (2025-02-08)


### Features

* move card/table customization to connections popup ([e372da1](https://github.com/Zephyruso/zashboard/commit/e372da1ed60cd2c2e85fa93b0ccc54cd4da2312d))
* preset for connection card style ([539e23c](https://github.com/Zephyruso/zashboard/commit/539e23c968d5384f7fb7d8027fb91ae6580875b8))


### Bug Fixes

* default testurl with https ([a1eb0a4](https://github.com/Zephyruso/zashboard/commit/a1eb0a41f2a63ee2ca469467609033b91bd5eeb8))
* toast & settings style ([f33a077](https://github.com/Zephyruso/zashboard/commit/f33a077e7386779ec438f59b55a2b0956b7e7635))

## [1.61.2](https://github.com/Zephyruso/zashboard/compare/v1.61.1...v1.61.2) (2025-02-08)


### Bug Fixes

* connection details style ([acbcfb2](https://github.com/Zephyruso/zashboard/commit/acbcfb2e2c22460c00147d73be610b539e988670))
* missing proxies ctrl in some cases ([375a0d4](https://github.com/Zephyruso/zashboard/commit/375a0d4e8b86c87ecb25481cbf8dbeae9cae68ee))
* show hidden group -&gt; manage hidden group ([4e8fb42](https://github.com/Zephyruso/zashboard/commit/4e8fb42977a1513ef4cb28b0cb09bafb7e04c6c6))

## [1.61.1](https://github.com/Zephyruso/zashboard/compare/v1.61.0...v1.61.1) (2025-02-07)


### Bug Fixes

* filter log by time ([0af9828](https://github.com/Zephyruso/zashboard/commit/0af9828c8110340f13dfdd29871adbf8cd90717d))
* tip position & timeout ([fe8730b](https://github.com/Zephyruso/zashboard/commit/fe8730bb51f780285f2c0c18381e1925ad32410a))
* two columns style for md screen ([3561fdf](https://github.com/Zephyruso/zashboard/commit/3561fdfb74a2a3ac43ab0fc99d2ed9695d7249aa))

## [1.61.0](https://github.com/Zephyruso/zashboard/compare/v1.60.3...v1.61.0) (2025-02-07)


### Features

* display ip asn info in connection details ([bcb96ec](https://github.com/Zephyruso/zashboard/commit/bcb96ecc42d90b89c1b1d4847b4c8dc1315b5b25))
* update geo button ([144aecc](https://github.com/Zephyruso/zashboard/commit/144aecc922318b9c312dd55cfd1614b551b10889))


### Bug Fixes

* hide group btn style ([b10804b](https://github.com/Zephyruso/zashboard/commit/b10804b74f3716ee450e2bb180d4bc22908dd234))

## [1.60.3](https://github.com/Zephyruso/zashboard/compare/v1.60.2...v1.60.3) (2025-02-06)


### Bug Fixes

* hide proxy group btn position ([bce1642](https://github.com/Zephyruso/zashboard/commit/bce1642cbe4ff5a093ee9ffa192a4ec245e1761f))

## [1.60.2](https://github.com/Zephyruso/zashboard/compare/v1.60.1...v1.60.2) (2025-02-05)


### Bug Fixes

* autocomplete for setup ([18417b5](https://github.com/Zephyruso/zashboard/commit/18417b5e844ba3bac40f8c592f62371927c16826))
* hide connections ([8065ebd](https://github.com/Zephyruso/zashboard/commit/8065ebdbd5d4da1b23e2caa8d215c6ea57a0ede7))
* regex search for logs ([3d1d1b9](https://github.com/Zephyruso/zashboard/commit/3d1d1b98a4119b1c5e600e04ab5e9dcd1a899363))
* rule card style for sing-box 1.11.0 ([669cf5a](https://github.com/Zephyruso/zashboard/commit/669cf5abf270e69ff59ef66aa237812d0aa3c819))

## [1.60.1](https://github.com/Zephyruso/zashboard/compare/v1.60.0...v1.60.1) (2025-01-26)


### Bug Fixes

* connections count ([2f36311](https://github.com/Zephyruso/zashboard/commit/2f36311e216b47ee844860b753dbd2c1e2f0724c))
* rule card & input style ([5498644](https://github.com/Zephyruso/zashboard/commit/549864497bc43ea9ef60a4508a6536b48397db22))

## [1.60.0](https://github.com/Zephyruso/zashboard/compare/v1.59.0...v1.60.0) (2025-01-25)


### Features

* label for backend ([7655df3](https://github.com/Zephyruso/zashboard/commit/7655df34f82d722139b8e96e54b7ca602210fe86))
* make group hidden by manual ([e903d7b](https://github.com/Zephyruso/zashboard/commit/e903d7b838e6d20da14566bf8a54f6f5a74c1ebe))
* setting for swipe in tabs ([e003184](https://github.com/Zephyruso/zashboard/commit/e003184ea9095679226183f9ab181eb4cd7d8fd0))


### Bug Fixes

* icon incorrect ([19db7c8](https://github.com/Zephyruso/zashboard/commit/19db7c85eab1cb9c4f8b5aff6db2f3e75a781648))
* move proxies settings to modal ([2bdc79c](https://github.com/Zephyruso/zashboard/commit/2bdc79ce105bcdeb0e8b848a6ef239d68f1cad5e))
* style ([e7a97c1](https://github.com/Zephyruso/zashboard/commit/e7a97c15e688a1fd9de3d4b998116974e2cb9421))
* style for loadbalance ([51d34f7](https://github.com/Zephyruso/zashboard/commit/51d34f7e6db8d9e9bb946bacbcc84a7f43d1b59c))

## [1.59.0](https://github.com/Zephyruso/zashboard/compare/v1.58.0...v1.59.0) (2025-01-24)


### Features

* swipe for tabs ([5ebcf75](https://github.com/Zephyruso/zashboard/commit/5ebcf759ee0403874a84db5502977843487477a5))


### Bug Fixes

* ctrls style ([36653fc](https://github.com/Zephyruso/zashboard/commit/36653fc91a17068010754bd3317311e809e6d567))
* import settings for ios ([a376f3f](https://github.com/Zephyruso/zashboard/commit/a376f3f6672060c8018e5e7ee57b3ca7f0538374))
* rename quick filter -&gt; hide connections ([477fdef](https://github.com/Zephyruso/zashboard/commit/477fdef1f4142a046cdfa67f8b274cd0e1c5a2b6))
* truncate connection card ([feda74b](https://github.com/Zephyruso/zashboard/commit/feda74bb58348b3d78deb4485fdffc478d9bfd2d))

## [1.58.0](https://github.com/Zephyruso/zashboard/compare/v1.57.0...v1.58.0) (2025-01-23)


### Features

* search for proxies ([f28cc86](https://github.com/Zephyruso/zashboard/commit/f28cc86fa45f48fef339dacbd05ab58755089199))
* unify style for ctrl component ([740a9f7](https://github.com/Zephyruso/zashboard/commit/740a9f7cc8dbe3fdc7f77d93677593139bd8ff37))


### Bug Fixes

* import settings failed ([6757609](https://github.com/Zephyruso/zashboard/commit/6757609295831e06ed91fb178220e5202c817ea2))

## [1.57.0](https://github.com/Zephyruso/zashboard/compare/v1.56.2...v1.57.0) (2025-01-22)


### Features

* toggle collapse for all ([652f1da](https://github.com/Zephyruso/zashboard/commit/652f1da0bdb654f4b312ea59a92259e9b5d04d4c))


### Bug Fixes

* connection card style ([16c1d88](https://github.com/Zephyruso/zashboard/commit/16c1d882cec3b4eb8ccec89caf9e03dfa87239ef))
* disable swipe when selection and dialog ([7e4b4d1](https://github.com/Zephyruso/zashboard/commit/7e4b4d142e9ecc533917d3a795686a45368cb7c9))

## [1.56.2](https://github.com/Zephyruso/zashboard/compare/v1.56.1...v1.56.2) (2025-01-21)


### Bug Fixes

* rules not display & selector latency test ([6f35379](https://github.com/Zephyruso/zashboard/commit/6f35379c011d0b375cc8f823abcce4f3b6f24b36))

## [1.56.1](https://github.com/Zephyruso/zashboard/compare/v1.56.0...v1.56.1) (2025-01-20)


### Bug Fixes

* get latency from now ([4268255](https://github.com/Zephyruso/zashboard/commit/4268255f2cfa1f0b64804397804d07cac5d301e4))

## [1.56.0](https://github.com/Zephyruso/zashboard/compare/v1.55.2...v1.56.0) (2025-01-20)


### Features

* independent latency test ([635a168](https://github.com/Zephyruso/zashboard/commit/635a168c04eb2f906c1199015faf1e2b858e9702))


### Bug Fixes

* ip check privacy ([2d66a61](https://github.com/Zephyruso/zashboard/commit/2d66a61e58b2182e6120919686946fabb02b8c7b))

## [1.55.2](https://github.com/Zephyruso/zashboard/compare/v1.55.1...v1.55.2) (2025-01-20)


### Bug Fixes

* disable swipe when dnd ([b8c3eb9](https://github.com/Zephyruso/zashboard/commit/b8c3eb979e4acb5d577b70532abf92af4dd68205))
* proxies ctrl style in mobile ([56c69ce](https://github.com/Zephyruso/zashboard/commit/56c69ce2b1a5690cb9a7b0ce0bed84db7b0755f5))

## [1.55.1](https://github.com/Zephyruso/zashboard/compare/v1.55.0...v1.55.1) (2025-01-19)


### Bug Fixes

* proxies ctrl style ([90cafdf](https://github.com/Zephyruso/zashboard/commit/90cafdfd2812bd62d92d33b075dc133aaa1bbc03))
* rule provider & notification style ([c8bb270](https://github.com/Zephyruso/zashboard/commit/c8bb2703b1d102e8a4b33adc277d53b9df2f31ef))

## [1.55.0](https://github.com/Zephyruso/zashboard/compare/v1.54.0...v1.55.0) (2025-01-19)


### Features

* latency test for all proxies ([43b04b3](https://github.com/Zephyruso/zashboard/commit/43b04b3944b7a220a1a7616ec79fe5a8ad70ba43))
* tip for large group latency test ([be7db20](https://github.com/Zephyruso/zashboard/commit/be7db20a9efe35ccbcdfe86e48e0b06ada0f6f05))


### Bug Fixes

* catch cors icon ([c15bedb](https://github.com/Zephyruso/zashboard/commit/c15bedba41b1ae2467b69ff1ea3670f96fed5c41))
* icon shrink for macos ([3a0646f](https://github.com/Zephyruso/zashboard/commit/3a0646f662e450c4812e1b1aa62b230617a439ba))
* loading with rollup && latency test ([a0aa905](https://github.com/Zephyruso/zashboard/commit/a0aa905b2e16cc0967e9890b90ce76ce8c9c54b5))
* ru.ts for Total Connections Overview ([#195](https://github.com/Zephyruso/zashboard/issues/195)) ([f9f2bcf](https://github.com/Zephyruso/zashboard/commit/f9f2bcf6332cf24b70cef10d429ae1a9bddd9231))
* swipe threshold ([9933c6e](https://github.com/Zephyruso/zashboard/commit/9933c6e3f40aa4a7482d3fe866a0cb3874735855))

## [1.54.0](https://github.com/Zephyruso/zashboard/compare/v1.53.1...v1.54.0) (2025-01-18)


### Features

* latency test animation ([207a139](https://github.com/Zephyruso/zashboard/commit/207a139154af485ba2cb1d5c656ac484da8504f1))
* swipe page animation ([dd7fe3d](https://github.com/Zephyruso/zashboard/commit/dd7fe3d7c50fed87338c1bbfb0bf691208fdef86))
* swipe to switch pages in mobile ([dbf7306](https://github.com/Zephyruso/zashboard/commit/dbf7306a788fcb3d98876dd9253dd57af77044d1))


### Bug Fixes

* scroll to top for details modal ([da8f837](https://github.com/Zephyruso/zashboard/commit/da8f83730417155e0d9949d873fa390a6fba4b66))
* unable to switch backend ([9fe51e5](https://github.com/Zephyruso/zashboard/commit/9fe51e58705a4aa0e644186203fc59b8a517a479))

## [1.53.1](https://github.com/Zephyruso/zashboard/compare/v1.53.0...v1.53.1) (2025-01-17)


### Bug Fixes

* break all for proxy name ([26281c1](https://github.com/Zephyruso/zashboard/commit/26281c1542f953bdeea611c667370fd932364ce8))

## [1.53.0](https://github.com/Zephyruso/zashboard/compare/v1.52.1...v1.53.0) (2025-01-17)


### Features

* resizeable table columns ([c781105](https://github.com/Zephyruso/zashboard/commit/c781105118cd33cecaed5fda0a4ad015a5439956))
* sortable backend list ([f556aa4](https://github.com/Zephyruso/zashboard/commit/f556aa47a4e35a0fc84f12030bc72515440d5c01))


### Bug Fixes

* connections ctrl style ([4743daf](https://github.com/Zephyruso/zashboard/commit/4743daf06a0952afa4b77237ab0d7b3c82dccda5))
* connections settings style ([03e002a](https://github.com/Zephyruso/zashboard/commit/03e002a4e9efe2e94c826caaf3f7ea52803e8446))
* proxy name shrink ([300c92c](https://github.com/Zephyruso/zashboard/commit/300c92cb0758df1377468c8d3850a5683a5fa3a8))

## [1.52.1](https://github.com/Zephyruso/zashboard/compare/v1.52.0...v1.52.1) (2025-01-16)


### Bug Fixes

* details modal & icon style ([ab67366](https://github.com/Zephyruso/zashboard/commit/ab673667cb5f091808635eb7afbbd92a14aacba1))

## [1.52.0](https://github.com/Zephyruso/zashboard/compare/v1.51.0...v1.52.0) (2025-01-16)


### Features

* connection history in overview page ([8c0bfb0](https://github.com/Zephyruso/zashboard/commit/8c0bfb033b2436c298326296de8cbe1843e443c2))
* display icon in connections ([d6dba90](https://github.com/Zephyruso/zashboard/commit/d6dba903e8e9e07bec226b017803658f1f93758d))


### Bug Fixes

* ctrls and other style ([55d4a46](https://github.com/Zephyruso/zashboard/commit/55d4a46aa0c17b49e3627db8cd950c4878e759bd))
* details modal style ([d9f786b](https://github.com/Zephyruso/zashboard/commit/d9f786b95068663dc607238542c54d4647972855))
* ip check style ([d2f84c5](https://github.com/Zephyruso/zashboard/commit/d2f84c594b55090991ba3fc48252edf4049afe3d))

## [1.51.0](https://github.com/Zephyruso/zashboard/compare/v1.50.0...v1.51.0) (2025-01-15)


### Features

* one by one latency test for large group ([6a5aebc](https://github.com/Zephyruso/zashboard/commit/6a5aebce6a67df6afe3c56dc002402d5f58ec687))
* override speedtesturl with config ([5662cfe](https://github.com/Zephyruso/zashboard/commit/5662cfedd5deaeec962f53a7f3738798127af12b))
* setting for display statistics in collapsed sidebar ([ddbc273](https://github.com/Zephyruso/zashboard/commit/ddbc273b75830175a2114aab4cbcb49d334fd4c2))


### Bug Fixes

* dayjs locale ([b806e9d](https://github.com/Zephyruso/zashboard/commit/b806e9dfe8361c7a90b0bf3fb0c9006c7705ebca))
* details modals & proxies ctrl style ([0ca01e5](https://github.com/Zephyruso/zashboard/commit/0ca01e52bd903842c54c25ea189c8419ef014224))
* grouped row click ([089861c](https://github.com/Zephyruso/zashboard/commit/089861cee8753ee50ac5cd205c4d05d28af809ee))
* latency test for proxy node card ([1f94549](https://github.com/Zephyruso/zashboard/commit/1f94549d3c9e640a3c3d1bd88ff640b9925fc6e9))
* missing destinationPort in connection card ([a7c461a](https://github.com/Zephyruso/zashboard/commit/a7c461ad260f56b1ab9dc6b4e993071d2d3b8502))
* number of proxies node ([785d56c](https://github.com/Zephyruso/zashboard/commit/785d56cc67b63d8737b0d65273b30e33c5fbb9e7))
* tip for sidebar collapsed ([5f90287](https://github.com/Zephyruso/zashboard/commit/5f90287178fc2ae70bc05d98d05114ecc3009668))

## [1.50.0](https://github.com/Zephyruso/zashboard/compare/v1.49.1...v1.50.0) (2025-01-14)


### Features

* display details modal for table & card click ([e9b3210](https://github.com/Zephyruso/zashboard/commit/e9b3210e61235cf18582e4e81b6a29ba30a33b53))
* latency test when right click ([f801e41](https://github.com/Zephyruso/zashboard/commit/f801e4111768ca4503925f1fe08df03bf5bdc421))


### Bug Fixes

* btm-nav & ipcheck style ([238ca13](https://github.com/Zephyruso/zashboard/commit/238ca1396b542343e5b72c05371b71176ab0ca27))
* display sniffhost for host ([c7096cc](https://github.com/Zephyruso/zashboard/commit/c7096ccccd8bc0e022dc31aec92b8f3eff9be10b))
* ip filter ([0df5b68](https://github.com/Zephyruso/zashboard/commit/0df5b68fb0120f51fb685109f4a7f9be3a0def0f))
* latency test timeout ([b80f07e](https://github.com/Zephyruso/zashboard/commit/b80f07e753b4b6bd94f74df03a5f9868d8c27c2b))
* style for unavailable proxy ([2091ccf](https://github.com/Zephyruso/zashboard/commit/2091ccf815b1b203ea4edb080ac4b6f10eecff87))

## [1.49.1](https://github.com/Zephyruso/zashboard/compare/v1.49.0...v1.49.1) (2025-01-12)


### Bug Fixes

* latency test failed ([8d1e31b](https://github.com/Zephyruso/zashboard/commit/8d1e31b54ba537561b7a09ccdcf1b3b23b8f0033))
* parse of ipip.net ([711fef9](https://github.com/Zephyruso/zashboard/commit/711fef9b279563ad2b92fee863a4dd398dca046d))
* select blink in firefox ([040b792](https://github.com/Zephyruso/zashboard/commit/040b7925880c09e3aa2c4b521572e3d62264543c))
* tooltip style ([034b18d](https://github.com/Zephyruso/zashboard/commit/034b18db6d3da7bf50bed030f46b8726db6b20c0))

## [1.49.0](https://github.com/Zephyruso/zashboard/compare/v1.48.1...v1.49.0) (2025-01-11)


### Features

* ipip.net ([4816cd8](https://github.com/Zephyruso/zashboard/commit/4816cd8a0f28a1fbc9671e02433cc32ba6137f0a))
* sniff host ([6a4b091](https://github.com/Zephyruso/zashboard/commit/6a4b09144a12aca14e2a5aaaf5e48a8436bb5e1a))


### Bug Fixes

* ws performance ([ac5ad2e](https://github.com/Zephyruso/zashboard/commit/ac5ad2e26eb7b9ff2f5b367a6b3a44c0ac33a62b))

## [1.48.1](https://github.com/Zephyruso/zashboard/compare/v1.48.0...v1.48.1) (2025-01-10)


### Bug Fixes

* group test timeout ([b52f83f](https://github.com/Zephyruso/zashboard/commit/b52f83fe7264057c6bdad803822a822f309a1a0f))
* tip font ([c48c315](https://github.com/Zephyruso/zashboard/commit/c48c3158d6f4e9a680ab2727d8fbe2ec3824514d))
* virtual scroller estimate size ([034fe13](https://github.com/Zephyruso/zashboard/commit/034fe132d10752c6fc4181b30c312b7441ee8432))

## [1.48.0](https://github.com/Zephyruso/zashboard/compare/v1.47.0...v1.48.0) (2025-01-08)


### Features

* nav for mobile & network quic ([a38ac31](https://github.com/Zephyruso/zashboard/commit/a38ac310c92250bd1e5143f22d3af4301d9b7f36))


### Bug Fixes

* transparent & network type ([dec2173](https://github.com/Zephyruso/zashboard/commit/dec21733eb18510c0e68adf623a28aec75241848))

## [1.47.0](https://github.com/Zephyruso/zashboard/compare/v1.46.2...v1.47.0) (2025-01-07)


### Features

* add icon caching and clear cache functionality ([#146](https://github.com/Zephyruso/zashboard/issues/146)) ([1226600](https://github.com/Zephyruso/zashboard/commit/122660054151c0eb58dff9ed17f4e3aac4e354fd))
* dns query detail ([1bdcd15](https://github.com/Zephyruso/zashboard/commit/1bdcd153d9c903e00f569a28b587d23b9a02301e))
* proxy chain direction ([ab5a621](https://github.com/Zephyruso/zashboard/commit/ab5a62186792e838358604f13b260a0a34a0a972))


### Bug Fixes

* dots tooltip style ([6e32a16](https://github.com/Zephyruso/zashboard/commit/6e32a1693db62e5917cfd6b339ff82d5a2056eb0))
* opacity style ([321df18](https://github.com/Zephyruso/zashboard/commit/321df188df3129be88246560bac7404653dd8ed9))
* replace -&gt; ([845d015](https://github.com/Zephyruso/zashboard/commit/845d015a7d5f51fcff3b1c12eb9e41985a2f11f3))
* style for rule ([201dcf5](https://github.com/Zephyruso/zashboard/commit/201dcf5ec1f5b1edc36b42f572ca9585f9cd3771))

## [1.46.2](https://github.com/Zephyruso/zashboard/compare/v1.46.1...v1.46.2) (2025-01-06)


### Bug Fixes

* proxy group & rule style ([72e17ad](https://github.com/Zephyruso/zashboard/commit/72e17ade6819ac21010d42811fa126898f8b8d8d))

## [1.46.1](https://github.com/Zephyruso/zashboard/compare/v1.46.0...v1.46.1) (2025-01-06)


### Bug Fixes

* rule style ([8a64aeb](https://github.com/Zephyruso/zashboard/commit/8a64aebdb4f0feb8b7a851f19f6ebd811b835bf8))

## [1.46.0](https://github.com/Zephyruso/zashboard/compare/v1.45.1...v1.46.0) (2025-01-06)


### Features

* allow lan & auto upgrade core ([1a9c86c](https://github.com/Zephyruso/zashboard/commit/1a9c86cd424b798292ab06980b5276dc44706d25))


### Bug Fixes

* pwa style ([3faea83](https://github.com/Zephyruso/zashboard/commit/3faea836cb26f3903b4b3dd501adf98d9376f267))
* style for icon ([05eab9d](https://github.com/Zephyruso/zashboard/commit/05eab9df61391df085847820d99dc5916399761b))

## [1.45.1](https://github.com/Zephyruso/zashboard/compare/v1.45.0...v1.45.1) (2025-01-06)


### Bug Fixes

* rule & proxy group style ([a052679](https://github.com/Zephyruso/zashboard/commit/a052679e72f7cb5e0f5526531857fc379a271c66))
* tooltip style ([f90ba9a](https://github.com/Zephyruso/zashboard/commit/f90ba9a853249597c1fa0f022101ae25e7a129ce))

## [1.45.0](https://github.com/Zephyruso/zashboard/compare/v1.44.0...v1.45.0) (2025-01-06)


### Features

* select proxy by click dot ([296e959](https://github.com/Zephyruso/zashboard/commit/296e959ceda68b803701840de10390e13c88c28e))


### Bug Fixes

* connections card type ([a1627fa](https://github.com/Zephyruso/zashboard/commit/a1627fab815d4b0854d1546b52f2e23d916194d5))
* ctrl style ([2d22041](https://github.com/Zephyruso/zashboard/commit/2d22041ebd4013b70547dec0d78f7569dcfb7670))
* rules ctrl style ([9522770](https://github.com/Zephyruso/zashboard/commit/9522770a260b7369fabd8ddacb63f5dfb07cc05b))

## [1.44.0](https://github.com/Zephyruso/zashboard/compare/v1.43.0...v1.44.0) (2025-01-03)


### Features

* upload image for bg ([966d5e9](https://github.com/Zephyruso/zashboard/commit/966d5e9c869a0e044ad31489b08ebf5334761c5f))


### Bug Fixes

* ru.ts ([#143](https://github.com/Zephyruso/zashboard/issues/143)) ([cae45f4](https://github.com/Zephyruso/zashboard/commit/cae45f46ac87dec5308b08d3e49417c75d1a599f))

## [1.43.0](https://github.com/Zephyruso/zashboard/compare/v1.42.0...v1.43.0) (2025-01-02)


### Features

* range input for transparent ([5cd7ed9](https://github.com/Zephyruso/zashboard/commit/5cd7ed9bbdb504d52ccea9c934a0e68af5cbe88f))
* size for icon ([0b7c54e](https://github.com/Zephyruso/zashboard/commit/0b7c54ed603d94cb076b919410b940568caafa34))


### Bug Fixes

* close all btn ([fa4f31c](https://github.com/Zephyruso/zashboard/commit/fa4f31ce6cf6fb4b230a085c04ac1d75d39595ab))
* style for transparent ([8f9ba4b](https://github.com/Zephyruso/zashboard/commit/8f9ba4b58c71f6cba204cff15df3aaabd838d360))

## [1.42.0](https://github.com/Zephyruso/zashboard/compare/v1.41.0...v1.42.0) (2024-12-31)


### Features

* options for transparent ([3c4b986](https://github.com/Zephyruso/zashboard/commit/3c4b986ffbf207a94b0c1e787fb177e47c1dcb9a))
* search for rules ([8f7c67e](https://github.com/Zephyruso/zashboard/commit/8f7c67e3b1fa09c2bdcf1ac4dbdfb7d58568d129))


### Bug Fixes

* connections card & overview style ([690edfc](https://github.com/Zephyruso/zashboard/commit/690edfc677a23fd4f81377ac7de906cb8dafdca1))
* desitination ([21a5990](https://github.com/Zephyruso/zashboard/commit/21a5990738f9987c3c7fa62b6f37408d0a90cc21))
* rule size ([917ecc2](https://github.com/Zephyruso/zashboard/commit/917ecc203b26987779fc94541cdf006e240859ae))
* style ([c969408](https://github.com/Zephyruso/zashboard/commit/c969408173e9fea57eab884f67bbb08580b4b344))

## [1.41.0](https://github.com/Zephyruso/zashboard/compare/v1.40.0...v1.41.0) (2024-12-31)


### Features

* option for hidden groups ([4da005e](https://github.com/Zephyruso/zashboard/commit/4da005ed8f85dc3453c41ffffa6dec6c7b28d2fc))


### Bug Fixes

* charts style ([5ca830e](https://github.com/Zephyruso/zashboard/commit/5ca830ed0d0c7cb67bf0b360048728927e602600))
* connections ctrl style ([9f5cd96](https://github.com/Zephyruso/zashboard/commit/9f5cd965558ffb11ccfe8afa606d38b3c5253b9c))
* overview style ([7c33b18](https://github.com/Zephyruso/zashboard/commit/7c33b18f6ff3a8fdacdec1e2d7e25ae96d55041d))

## [1.40.0](https://github.com/Zephyruso/zashboard/compare/v1.39.2...v1.40.0) (2024-12-31)


### Features

* option for split overview page ([5076f4e](https://github.com/Zephyruso/zashboard/commit/5076f4e7b0478f94f374ad52098cab98e7dcee8d))
* sort direction for card ([17e3c43](https://github.com/Zephyruso/zashboard/commit/17e3c43de8b14558f152f0eda0caebd34dcb2da9))


### Bug Fixes

* default pages ([fffa435](https://github.com/Zephyruso/zashboard/commit/fffa435ee8475864964701256b8ac55d436543c7))
* inner sourceip filter ([215031d](https://github.com/Zephyruso/zashboard/commit/215031d4688a8689e4bb4ad495e774e62101cb6f))

## [1.39.2](https://github.com/Zephyruso/zashboard/compare/v1.39.1...v1.39.2) (2024-12-31)


### Bug Fixes

* remove default img ([668c00a](https://github.com/Zephyruso/zashboard/commit/668c00ad0d38df2c37a0f858b5a7e54abdf194d7))

## [1.39.1](https://github.com/Zephyruso/zashboard/compare/v1.39.0...v1.39.1) (2024-12-31)

### Bug Fixes

* close conn for card ([bcc7e82](https://github.com/Zephyruso/zashboard/commit/bcc7e82b1709eda1a30ed1f6ac13baf53d280dee))

## [1.39.0](https://github.com/Zephyruso/zashboard/compare/v1.38.0...v1.39.0) (2024-12-31)


### Features

* bing bg ([7b09ab1](https://github.com/Zephyruso/zashboard/commit/7b09ab17732b9065178dba8de6157a5d777daffa))


### Bug Fixes

* default theme -&gt; auto switch theme ([0e19ac6](https://github.com/Zephyruso/zashboard/commit/0e19ac6a18f28ea407c3f594e0a87175d4785fe8))
* settings for overview & sourceip is null ([539de88](https://github.com/Zephyruso/zashboard/commit/539de88fad71a33c5ed62971d0057ed51e687aed))
* style ([56289dc](https://github.com/Zephyruso/zashboard/commit/56289dc3b1962557e6158d1d967bef9287a86edc))

## [1.38.0](https://github.com/Zephyruso/zashboard/compare/v1.37.0...v1.38.0) (2024-12-30)


### Features

* customizable connection card ([b7a67bd](https://github.com/Zephyruso/zashboard/commit/b7a67bdd8a43979a4ccbe4eac51d5bdd2c99b82c))
* latency of cloudflare ([0da167d](https://github.com/Zephyruso/zashboard/commit/0da167def4a0c2967b67d9bb004d381ab6ad1e46))
* overview page ([f1eaf27](https://github.com/Zephyruso/zashboard/commit/f1eaf2778975c0bf9bddde91f22a96327d363b09))


### Bug Fixes

* connections card style ([a11823e](https://github.com/Zephyruso/zashboard/commit/a11823ec50926e25e9d602bc4dc3afd0de93632c))
* rules icon ([03ef6e0](https://github.com/Zephyruso/zashboard/commit/03ef6e0b535b02b0751ac16903bf3cf3a969be9d))
* subscription info is null & overview page ([1f17bba](https://github.com/Zephyruso/zashboard/commit/1f17bba66a289974aaacba443f003df478ba7156))

## [1.37.0](https://github.com/Zephyruso/zashboard/compare/v1.36.0...v1.37.0) (2024-12-30)


### Features

* carousel ([b8689c6](https://github.com/Zephyruso/zashboard/commit/b8689c648cab18da6aab68e66139f208bcfc4ae1))
* netease -&gt; openai ([3521796](https://github.com/Zephyruso/zashboard/commit/352179690a3e19ea8e32ba26b8d5c5d168e96fad))
* overview ([eba9dff](https://github.com/Zephyruso/zashboard/commit/eba9dff740e1c75aff5e467c14b962bb8d88e166))
* sticky thead ([0f91378](https://github.com/Zephyruso/zashboard/commit/0f91378f177d9fbb7736f64bb0898b54e9c3809f))

## [1.36.0](https://github.com/Zephyruso/zashboard/compare/v1.35.0...v1.36.0) (2024-12-29)


### Features

* connection status ([f9a05b0](https://github.com/Zephyruso/zashboard/commit/f9a05b0ded6d022ce6a26fd6f89d098e719b4187))
* ipcheck ([7c62958](https://github.com/Zephyruso/zashboard/commit/7c629584a96989adde91cdb209b2f4139f2a85ef))

## [1.35.0](https://github.com/Zephyruso/zashboard/compare/v1.34.0...v1.35.0) (2024-12-27)


### Features

* settings for proxy card size ([0e19b2d](https://github.com/Zephyruso/zashboard/commit/0e19b2dd04b3f6fd10aee4833d1f2b5798eac10e))


### Bug Fixes

* remove reload cfgs for sing-box ([4bad656](https://github.com/Zephyruso/zashboard/commit/4bad656eb0e35fa254bcebf6638eab88ea65c2be))

## [1.34.0](https://github.com/Zephyruso/zashboard/compare/v1.33.1...v1.34.0) (2024-12-27)


### Features

* settings for table size ([61ffe06](https://github.com/Zephyruso/zashboard/commit/61ffe0648392060ae4572935c019085fced7b0b6))


### Bug Fixes

* bigger proxy card ([af238be](https://github.com/Zephyruso/zashboard/commit/af238becf57553a09c66e505be8c94d1b29dbbc0))
* chart style ([d036723](https://github.com/Zephyruso/zashboard/commit/d036723c692f77b2eadcd927c239c885684d9d99))
* metacubex logo ([73c56f9](https://github.com/Zephyruso/zashboard/commit/73c56f9b49fa7d85dc2377ef919f31489ac0f35f))

## [1.33.1](https://github.com/Zephyruso/zashboard/compare/v1.33.0...v1.33.1) (2024-12-26)


### Bug Fixes

* rule provider style ([50dcc16](https://github.com/Zephyruso/zashboard/commit/50dcc16c3059c3e5c9a1ea39ecdd61d4941e3bc1))
* settings style ([ba9483d](https://github.com/Zephyruso/zashboard/commit/ba9483d4d144ac51176169f96a5c2e3a21fafcf0))
* sort by latency for proxy group ([641d324](https://github.com/Zephyruso/zashboard/commit/641d324f88d9a02317c5ae0466b5c205712aab7d))

## [1.33.0](https://github.com/Zephyruso/zashboard/compare/v1.32.1...v1.33.0) (2024-12-26)


### Features

* ports setting for mihomo ([eedcf06](https://github.com/Zephyruso/zashboard/commit/eedcf06383b3ce84097e3a270c4a5ef4967bf8aa))


### Bug Fixes

* api for reloadcfg & icon style ([eb17dae](https://github.com/Zephyruso/zashboard/commit/eb17daeca6b6af4b82aa2b50beaf5d6ad81a3063))
* bigger latency tag ([452243f](https://github.com/Zephyruso/zashboard/commit/452243f4bd6772fa1d4f9c75ff3277598ee70378))
* connections ctrl style ([f28d404](https://github.com/Zephyruso/zashboard/commit/f28d404d7ea57661f498b0cffdbaad251664919a))
* missing translate for russian ([7a03b7b](https://github.com/Zephyruso/zashboard/commit/7a03b7b62c4f46ea663f4ffc4f04b39eb80dc294))
* settings style ([16e893a](https://github.com/Zephyruso/zashboard/commit/16e893a6c67c0a81636bbd8c3285716251544683))

## [1.32.1](https://github.com/Zephyruso/zashboard/compare/v1.32.0...v1.32.1) (2024-12-25)


### Bug Fixes

* style ([50f9324](https://github.com/Zephyruso/zashboard/commit/50f932464f3d50e53cf1969a6f1918114efa0e88))

## [1.32.0](https://github.com/Zephyruso/zashboard/compare/v1.31.0...v1.32.0) (2024-12-25)


### Features

* add ru lang ([#108](https://github.com/Zephyruso/zashboard/issues/108)) ([e28c9b1](https://github.com/Zephyruso/zashboard/commit/e28c9b19805c0ca27d4bfbe9d4c54690b2f69d89))
* two line proxy card ([f942cd3](https://github.com/Zephyruso/zashboard/commit/f942cd36108913ca2c67a34cc56bba7bd5ce5e18))


### Bug Fixes

* ru.ts ([#109](https://github.com/Zephyruso/zashboard/issues/109)) ([f4d4e68](https://github.com/Zephyruso/zashboard/commit/f4d4e68b963de7229f3a9150501e59178a50ead3))
* style ([3479ab6](https://github.com/Zephyruso/zashboard/commit/3479ab65b565011f593074938c650c3ab163e994))
* update quick-filter-regex ([#110](https://github.com/Zephyruso/zashboard/issues/110)) ([8efb37a](https://github.com/Zephyruso/zashboard/commit/8efb37a6da61b5b158d062ddb31a04c29d718efb))
* xs element -&gt; sm element ([d0a160d](https://github.com/Zephyruso/zashboard/commit/d0a160d90d5053aad5be1e38f4ab2cf8282472b8))

## [1.31.0](https://github.com/Zephyruso/zashboard/compare/v1.30.0...v1.31.0) (2024-12-24)


### Features

* auto switch backend ([b153fd0](https://github.com/Zephyruso/zashboard/commit/b153fd021a1b1b376b76bd11e4cac740aa4fe0bc))
* dual mode for cdn fonts ([ba0fdc7](https://github.com/Zephyruso/zashboard/commit/ba0fdc7ba8b72cef28502cc072422f12ffc1d3a4))
* ipv6 test ([a654645](https://github.com/Zephyruso/zashboard/commit/a654645321ec89a131c9571d26ab3bea153bcfaa))
* tip for auto switch ([573f11f](https://github.com/Zephyruso/zashboard/commit/573f11f6c186c90a0566d537c731dc8cb9a409ff))


### Bug Fixes

* //version ([50a269d](https://github.com/Zephyruso/zashboard/commit/50a269ddeaa2802f8c976428738a4e6f14e41931))
* backend available timeout ([756f99f](https://github.com/Zephyruso/zashboard/commit/756f99f62ab896b1e7d3bf4b0bd5e53a0ed7de4f))
* rule card & ctrls style ([529fe0e](https://github.com/Zephyruso/zashboard/commit/529fe0e478c699cd328d96f49e574d73412978bf))

## [1.30.0](https://github.com/Zephyruso/zashboard/compare/v1.29.4...v1.30.0) (2024-12-19)


### Features

* backend version in settings ([04dea21](https://github.com/Zephyruso/zashboard/commit/04dea213af06e5cd52a786c57e4404a5b5b7b80a))
* import configs in setup page & rule style ([1e816e4](https://github.com/Zephyruso/zashboard/commit/1e816e45879f749c7467e8408e87a1f62a9cdaad))
* index for rules provider ([a54d48f](https://github.com/Zephyruso/zashboard/commit/a54d48f01bec8b89058a5c60972cf80983acf5b8))
* new rule card style ([6313cc8](https://github.com/Zephyruso/zashboard/commit/6313cc82751ae46e148d27452f3782ad785963ce))


### Bug Fixes

* backend version check & provider collapse title ([151872a](https://github.com/Zephyruso/zashboard/commit/151872a28b4d741f3c623a7cb09a0b3dc64fd13d))
* options label for old safari ([8631a8c](https://github.com/Zephyruso/zashboard/commit/8631a8cd65e1828150a82c36479157c6d675fbf5))
* tooltip & font style ([fa36b55](https://github.com/Zephyruso/zashboard/commit/fa36b55b619433edfd4b3b647da643210002631c))

## [1.29.4](https://github.com/Zephyruso/zashboard/compare/v1.29.3...v1.29.4) (2024-12-18)


### Bug Fixes

* backend settings layout ([a0febbb](https://github.com/Zephyruso/zashboard/commit/a0febbb181e9f81f0a92410766e4e7815ce600ce))
* transition for preview ([6dfa379](https://github.com/Zephyruso/zashboard/commit/6dfa3796f27b24f42519b88aef36e89b6fc7ab0e))

## [1.29.3](https://github.com/Zephyruso/zashboard/compare/v1.29.2...v1.29.3) (2024-12-17)


### Bug Fixes

* core version check ([947df26](https://github.com/Zephyruso/zashboard/commit/947df26c9c009637283a75b500a794e686ba379d))
* dns query & collpase style ([4b00b29](https://github.com/Zephyruso/zashboard/commit/4b00b29f23d909771463dd83c7f9bf4d58186572))

## [1.29.2](https://github.com/Zephyruso/zashboard/compare/v1.29.1...v1.29.2) (2024-12-17)


### Bug Fixes

* card style for mobile in two columns ([cef601b](https://github.com/Zephyruso/zashboard/commit/cef601b212b226ddaa31b288302bf679531e552b))
* latency tag & collapse style' ([e041f7b](https://github.com/Zephyruso/zashboard/commit/e041f7b66aa933a671f3b019419b89893a7a6840))

## [1.29.1](https://github.com/Zephyruso/zashboard/compare/v1.29.0...v1.29.1) (2024-12-17)


### Bug Fixes

* performance ([964a733](https://github.com/Zephyruso/zashboard/commit/964a7330aa6aa8f9c01c8b228afc23315e4d59f0))

## [1.29.0](https://github.com/Zephyruso/zashboard/compare/v1.28.3...v1.29.0) (2024-12-17)


### Features

* core update check & fix ([8694a3a](https://github.com/Zephyruso/zashboard/commit/8694a3ae85cf6a7ad81fd30bbc1f37ccdd96c7b1))


### Bug Fixes

* render block by cdn ([a00a071](https://github.com/Zephyruso/zashboard/commit/a00a07152f2d05ca1019c96bb92d767524d7ffe9))

## [1.28.3](https://github.com/Zephyruso/zashboard/compare/v1.28.2...v1.28.3) (2024-12-16)


### Bug Fixes

* proxies ctrl style ([f437696](https://github.com/Zephyruso/zashboard/commit/f4376960b330c372ac286c1be19c2ece23dc537b))
* proxy group style ([cd0291d](https://github.com/Zephyruso/zashboard/commit/cd0291d7d9148322ac3f2b3a145a07ea1bab0771))

## [1.28.2](https://github.com/Zephyruso/zashboard/compare/v1.28.1...v1.28.2) (2024-12-16)


### Bug Fixes

* performance ([710a4cb](https://github.com/Zephyruso/zashboard/commit/710a4cb0f24a8a110a3a818f25f717a0f84bfa15))

## [1.28.1](https://github.com/Zephyruso/zashboard/compare/v1.28.0...v1.28.1) (2024-12-16)


### Bug Fixes

* proxy group style & regex ip label ([ddb8dfe](https://github.com/Zephyruso/zashboard/commit/ddb8dfe9c55f9c6176898518bdf561ddd54f8779))

## [1.28.0](https://github.com/Zephyruso/zashboard/compare/v1.27.2...v1.28.0) (2024-12-16)


### Features

* add `/setup` route for SetupPage ([#88](https://github.com/Zephyruso/zashboard/issues/88)) ([684ee20](https://github.com/Zephyruso/zashboard/commit/684ee2062b2ba1dff8b18af1f5fc2234b024c23c))
* CNAME ([f4d87c3](https://github.com/Zephyruso/zashboard/commit/f4d87c3e4b93292f0c2de1262ab63d1edda65852))
* font & charts & proxy group style ([ec438ed](https://github.com/Zephyruso/zashboard/commit/ec438edb112ee074aaab3c53f89bf335754a745b))


### Bug Fixes

* lazy new countup ([96de66b](https://github.com/Zephyruso/zashboard/commit/96de66b2fedc668a41a89d6ecf850a920d22bb4f))
* router ([a9a0202](https://github.com/Zephyruso/zashboard/commit/a9a0202b1fa054e199b4ca7273a3bff942460a53))
* start time sort ([7cf335a](https://github.com/Zephyruso/zashboard/commit/7cf335a8f979e6eb22c753b226911fcd569272ad))

## [1.27.2](https://github.com/Zephyruso/zashboard/compare/v1.27.1...v1.27.2) (2024-12-14)


### Bug Fixes

* cdn fonts ([c8fb7b1](https://github.com/Zephyruso/zashboard/commit/c8fb7b17a49740ba2c0797fcdb2091ead98985a7))
* cfg for rolling effect ([4ff2987](https://github.com/Zephyruso/zashboard/commit/4ff2987d5bd9bdd02f9eb337d35e132c354f156f))
* style ([b788a8e](https://github.com/Zephyruso/zashboard/commit/b788a8e709e2292f1613ab147c7f2cc7fd64b032))
* tippy -&gt; tooltip ([9d5f882](https://github.com/Zephyruso/zashboard/commit/9d5f882cc1479bb38b816ce7612f8d288fba1d37))
* tooltip ([f900fe3](https://github.com/Zephyruso/zashboard/commit/f900fe378bc31edc6ce2b801dd3600d7c6667654))

## [1.27.1](https://github.com/Zephyruso/zashboard/compare/v1.27.0...v1.27.1) (2024-12-13)


### Bug Fixes

* fuck you safari ([3a73475](https://github.com/Zephyruso/zashboard/commit/3a7347594a6160c807c2631d4bb02b85944fadf1))
* log performonce ([f189598](https://github.com/Zephyruso/zashboard/commit/f18959802471a418df1c66f3c26ad9a956271451))
* performance ([e35e1db](https://github.com/Zephyruso/zashboard/commit/e35e1dbf2bfbcfef2ea3a363594be9ad837ed0a4))

## [1.27.0](https://github.com/Zephyruso/zashboard/compare/v1.26.2...v1.27.0) (2024-12-13)


### Features

* DNS query & latency rolling effect cfg ([f7896c5](https://github.com/Zephyruso/zashboard/commit/f7896c57df6e74948c24e08c5c5fca6cc715d1be))


### Bug Fixes

* latency countup performance ([86ea651](https://github.com/Zephyruso/zashboard/commit/86ea65191f628bd04000fbe8f13118e3026e1651))

## [1.26.2](https://github.com/Zephyruso/zashboard/compare/v1.26.1...v1.26.2) (2024-12-12)


### Bug Fixes

* height for pwa ([e848e94](https://github.com/Zephyruso/zashboard/commit/e848e947fc41698361b42eedf27263ef067341d7))
* padding ([8443931](https://github.com/Zephyruso/zashboard/commit/8443931c15be60308c6aa2924c90e44ff3b0f096))
* reduce dom ([9799232](https://github.com/Zephyruso/zashboard/commit/9799232745e586d4dc02c5d83cc6bf1bd0f8dec8))
* reduce dom for proxy group ([86cf36c](https://github.com/Zephyruso/zashboard/commit/86cf36c0b72de30fa3dd58ad79d75280bb361b0c))
* sidebar collapse btn & input clear btn ([b19128d](https://github.com/Zephyruso/zashboard/commit/b19128d8f34151c036d95b791196d19ee3685dc0))
* virtual scroller for rule ([0a35b87](https://github.com/Zephyruso/zashboard/commit/0a35b8713415c49b2de3b3e783112998080d82aa))

## [1.26.1](https://github.com/Zephyruso/zashboard/compare/v1.26.0...v1.26.1) (2024-12-12)


### Bug Fixes

* scroll for logs & style ([17170bd](https://github.com/Zephyruso/zashboard/commit/17170bd325d71a54eebd97fdc276f969cc159a01))
* virtual scroller for connections card ([7549eb3](https://github.com/Zephyruso/zashboard/commit/7549eb34171bbb04be965df3cf08ba2be841462b))

## [1.26.0](https://github.com/Zephyruso/zashboard/compare/v1.25.0...v1.26.0) (2024-12-12)


### Features

* log retention limit ([267df17](https://github.com/Zephyruso/zashboard/commit/267df17abd4bbf92131b9243dcfcadf9f75a860b))
* swap for navbar ([030f6e9](https://github.com/Zephyruso/zashboard/commit/030f6e9e97cc953caa22d1283ac52cf63851483b))
* virtual scroller for connections ([8239b83](https://github.com/Zephyruso/zashboard/commit/8239b83d0b470fc171612a1f09c62ccd22b4ec28))
* virtual scroller for logs ([22ed83e](https://github.com/Zephyruso/zashboard/commit/22ed83eadc90cafea8b221bd1e42c70827b6765c))


### Bug Fixes

* **autoUpgrade:** upgradeCoreAPI-&gt;upgradeUIAPI ([#79](https://github.com/Zephyruso/zashboard/issues/79)) ([eb6fb92](https://github.com/Zephyruso/zashboard/commit/eb6fb921bdedd12de9f11a2d3fdeaeae61efc02d))
* reduce dom usage ([dabeee7](https://github.com/Zephyruso/zashboard/commit/dabeee7d95d31bcfc52c4cf167a974ff2fcc9463))

## [1.25.0](https://github.com/Zephyruso/zashboard/compare/v1.24.0...v1.25.0) (2024-12-11)


### Features

* connections chart ([eb779f6](https://github.com/Zephyruso/zashboard/commit/eb779f648cf6528e14ae9ef24fad2479f0a2b282))
* ip label in logs ([26b721e](https://github.com/Zephyruso/zashboard/commit/26b721e05fbc246317fcc9a5e9df6e27bb001e9b))


### Bug Fixes

* handle empty secondaryPath in SetupPage ([#78](https://github.com/Zephyruso/zashboard/issues/78)) ([0446297](https://github.com/Zephyruso/zashboard/commit/04462972404ed93fb6026f8e8b8096cbf649d819))
* login ([80bc57a](https://github.com/Zephyruso/zashboard/commit/80bc57a452968073c8fce41251cff2d461bfced2))

## [1.24.0](https://github.com/Zephyruso/zashboard/compare/v1.23.0...v1.24.0) (2024-12-11)


### Features

* pauseable chart ([eb92569](https://github.com/Zephyruso/zashboard/commit/eb925694d13886a55ef78746341360b9b7dff95d))
* secondary path ([1867177](https://github.com/Zephyruso/zashboard/commit/18671772058a18130a86783ae27ca332c13457ad))


### Bug Fixes

* style ([9760297](https://github.com/Zephyruso/zashboard/commit/9760297b012c3ae01bc4e2ce5eca753714b1627f))
* tooltip for charts ([4f44be4](https://github.com/Zephyruso/zashboard/commit/4f44be424302065935c84da04ed7b67937fda573))

## [1.23.0](https://github.com/Zephyruso/zashboard/compare/v1.22.2...v1.23.0) (2024-12-10)


### Features

* auto update ([1ffc2fb](https://github.com/Zephyruso/zashboard/commit/1ffc2fb93177df314d4112f9b217c06015d724f8))
* countup style for latency ([8ed0b92](https://github.com/Zephyruso/zashboard/commit/8ed0b92a281e979c1a1bca172d797d80d89f758d))


### Bug Fixes

* auto update -&gt; auto upgrade ([6afe9b6](https://github.com/Zephyruso/zashboard/commit/6afe9b640fd7a44ee9fa284da6d49c512ce016a7))
* charts font ([574ef6b](https://github.com/Zephyruso/zashboard/commit/574ef6bb8b9e38ce185f81d852d966cfce6f32de))
* proxy card style ([5803d86](https://github.com/Zephyruso/zashboard/commit/5803d8696280b1051c4b957a6a8b7ee91aabe216))
* proxy node style ([72bef99](https://github.com/Zephyruso/zashboard/commit/72bef9980263adbf63687b89e5f87dba3a047ca2))
* rulePayload filter ([1ff658b](https://github.com/Zephyruso/zashboard/commit/1ff658bf1a4d4a94c718ebe26c993392d4d3822c))
* sourceip filter opts ([9d7d984](https://github.com/Zephyruso/zashboard/commit/9d7d984fafdc0041280c7c76e1390e4dc7ce4fc8))

## [1.22.2](https://github.com/Zephyruso/zashboard/compare/v1.22.1...v1.22.2) (2024-12-09)


### Bug Fixes

* is proxy group ([bf6665e](https://github.com/Zephyruso/zashboard/commit/bf6665eb5e9e2b4f6b426456bd10583608924702))
* proxy ctrl style ([827e626](https://github.com/Zephyruso/zashboard/commit/827e626aa4f10fd5ba40a1e32f7c8f2d7b77d337))
* proxy node grid ([2d77b57](https://github.com/Zephyruso/zashboard/commit/2d77b57ddb506119d2d8208f511c7487b17db9a0))
* small shadow ([88c8849](https://github.com/Zephyruso/zashboard/commit/88c88493176900a57119888814877f5a683d5e8f))

## [1.22.1](https://github.com/Zephyruso/zashboard/compare/v1.22.0...v1.22.1) (2024-12-09)


### Bug Fixes

* chart style ([3fcfdc0](https://github.com/Zephyruso/zashboard/commit/3fcfdc07af6dcf7d824ff16818769afadd026770))
* latency color ([8db460a](https://github.com/Zephyruso/zashboard/commit/8db460aeebc9cfd97f7085049b3835b17273deed))
* preview color & restart core ([a9f55d9](https://github.com/Zephyruso/zashboard/commit/a9f55d99e76cd6fe7be1be767e550f9531a2e8ad))
* provider style ([36fb61e](https://github.com/Zephyruso/zashboard/commit/36fb61e7cd9dfd9e8060877dcbc99946bb46f64a))

## [1.22.0](https://github.com/Zephyruso/zashboard/compare/v1.21.0...v1.22.0) (2024-12-09)


### Features

* allow setting protocol in params-based setup ([#70](https://github.com/Zephyruso/zashboard/issues/70)) ([1c26b96](https://github.com/Zephyruso/zashboard/commit/1c26b960579f502834ae045697ed970e79adb0f2))
* jump to settings page when request status's code is `401` ([#69](https://github.com/Zephyruso/zashboard/issues/69)) ([dd0a044](https://github.com/Zephyruso/zashboard/commit/dd0a04441f6010d225337779f0616603a96545d8))


### Bug Fixes

* host save for setup & style ([cd24cd9](https://github.com/Zephyruso/zashboard/commit/cd24cd9a24bed5c43ffcf50b2ba2d014304e8f9c))
* icon can not be seen clearly due to [#66](https://github.com/Zephyruso/zashboard/issues/66) ([#67](https://github.com/Zephyruso/zashboard/issues/67)) ([f8c8810](https://github.com/Zephyruso/zashboard/commit/f8c8810eb5f74c6cc88ff96fce4d165f530604ab))
* respect the system's language settings ([7e31034](https://github.com/Zephyruso/zashboard/commit/7e31034e244e107533f2a09925dd13a76a8e4145))
* unify shadow & rounded ([3f560ac](https://github.com/Zephyruso/zashboard/commit/3f560ac3b3969f025defdb5bee022125d4b5e69d))

## [1.21.0](https://github.com/Zephyruso/zashboard/compare/v1.20.1...v1.21.0) (2024-12-08)


### Features

* add ProxyIcon component to ProxyNodeCard ([#66](https://github.com/Zephyruso/zashboard/issues/66)) ([a797085](https://github.com/Zephyruso/zashboard/commit/a7970852d54b6d35763646423313b52ab6192c17))
* charts in settings & fix websocket reactive ([2a28021](https://github.com/Zephyruso/zashboard/commit/2a28021d949cfb6c34d864fb68e14500937de15d))


### Bug Fixes

* chart style ([9e299b7](https://github.com/Zephyruso/zashboard/commit/9e299b745fb5c5b1dde7833198b0dc42167efbb1))
* make fira sans great again ([9d8d71c](https://github.com/Zephyruso/zashboard/commit/9d8d71ceaa2d6fdebbb75e786b04ada8a905dc6a))
* set theme color when theme chagne for pwa ([6add135](https://github.com/Zephyruso/zashboard/commit/6add1356f3e1a9c3567976bad80879b62918456b))
* system ui ([94e2433](https://github.com/Zephyruso/zashboard/commit/94e243324da3a4810d81542656a8cf033d749fce))

## [1.20.1](https://github.com/Zephyruso/zashboard/compare/v1.20.0...v1.20.1) (2024-12-07)


### Bug Fixes

* count for conns ([466c090](https://github.com/Zephyruso/zashboard/commit/466c090b02212a7135775bfa27df457fd58c495c))

## [1.20.0](https://github.com/Zephyruso/zashboard/compare/v1.19.0...v1.20.0) (2024-12-07)


### Features

* connections count ([2a5440e](https://github.com/Zephyruso/zashboard/commit/2a5440e259520708077342dc2a40b32a9a33ea92))
* select of fonts ([6a38eb4](https://github.com/Zephyruso/zashboard/commit/6a38eb4b5b2e216b762bb542407595068fc38861))
* try MiSans ([#60](https://github.com/Zephyruso/zashboard/issues/60)) ([4c7a001](https://github.com/Zephyruso/zashboard/commit/4c7a001cfb300c8f6641a803a8bd205b2c56edc8))


### Bug Fixes

* make side collapsed default ([16d1c51](https://github.com/Zephyruso/zashboard/commit/16d1c51d45b4d89bb1785558b945685d97074010))
* tree shake & misans from npm ([6bebec6](https://github.com/Zephyruso/zashboard/commit/6bebec6725b3f69c89c7c73275d38fcab83d5ec7))

## [1.19.0](https://github.com/Zephyruso/zashboard/compare/v1.18.0...v1.19.0) (2024-12-06)


### Features

* config for preview threshold ([af7a1e9](https://github.com/Zephyruso/zashboard/commit/af7a1e9e7a6c3381c7eb4fa245840a8ab0b5086f))


### Bug Fixes

* font fira sans ([dc69219](https://github.com/Zephyruso/zashboard/commit/dc69219463e39909c955e3efbe42b143f3442de8))
* fuck twemoji ([ace9d13](https://github.com/Zephyruso/zashboard/commit/ace9d13e44245c4459469be8deb36770b78a0f13))
* latency status ([c1db2ad](https://github.com/Zephyruso/zashboard/commit/c1db2ad01fd2daecf5a86bc1c4fba04c3b3d71ef))
* node card udp ([1f5e457](https://github.com/Zephyruso/zashboard/commit/1f5e45773581c6562f878c6aa979112d2b2c3d0e))
* tip for quick filter ([461d2ce](https://github.com/Zephyruso/zashboard/commit/461d2ce489ab8d068ab6eb122512374da36b82c4))

## [1.18.0](https://github.com/Zephyruso/zashboard/compare/v1.17.0...v1.18.0) (2024-12-06)


### Features

* check update for ui ([#57](https://github.com/Zephyruso/zashboard/issues/57)) ([ba16c7e](https://github.com/Zephyruso/zashboard/commit/ba16c7e5cb3a001a898f0a837a0a1487fa69c78e))


### Bug Fixes

* font load ([977f743](https://github.com/Zephyruso/zashboard/commit/977f743e2207121e8d023048c9b20d14b192f81f))
* ttf -&gt; woff2 ([6f2a6f6](https://github.com/Zephyruso/zashboard/commit/6f2a6f6ffb178591d99a116fa99c321ed47a8a7e))
* update tip ([ca49591](https://github.com/Zephyruso/zashboard/commit/ca4959167bec442abdd7b26464d97c062d90971b))

## [1.17.0](https://github.com/Zephyruso/zashboard/compare/v1.16.0...v1.17.0) (2024-12-06)


### Features

* release build zip ([e60cd00](https://github.com/Zephyruso/zashboard/commit/e60cd00e8fdf8aba1201f025ffd6b19acd0536c5))


### Bug Fixes

* i18n for mode ([500dbf8](https://github.com/Zephyruso/zashboard/commit/500dbf8ff816520bf1aec3a1e58bf5ec2d4fba8e))

## [1.16.0](https://github.com/Zephyruso/zashboard/compare/v1.15.1...v1.16.0) (2024-12-06)


### Features

* font ([2ae072a](https://github.com/Zephyruso/zashboard/commit/2ae072a0f285731f1a789e3edc7e430e586bfc40))
* tip for https ([0eae3b3](https://github.com/Zephyruso/zashboard/commit/0eae3b308a25316943a690d5f6c586585b5a1bd4))

## [1.15.1](https://github.com/Zephyruso/zashboard/compare/v1.15.0...v1.15.1) (2024-12-05)


### Bug Fixes

* proxy group style ([80ebdfc](https://github.com/Zephyruso/zashboard/commit/80ebdfcee3b9ef525192dd6287a0bf4e6f9aed5b))

## [1.15.0](https://github.com/Zephyruso/zashboard/compare/v1.14.0...v1.15.0) (2024-12-05)


### Features

* node card style for mobile in dual columns ([3a6aa67](https://github.com/Zephyruso/zashboard/commit/3a6aa67b71526ca76a5d0dc96a6b09e949e6cf95))


### Bug Fixes

* proxies ctrl style ([eaed72f](https://github.com/Zephyruso/zashboard/commit/eaed72fc0f62f3464277a5964ed6d76c71143e5d))
* ui layout for mobile ([df9f48c](https://github.com/Zephyruso/zashboard/commit/df9f48c3ad38f02e3297c720196dad0779d18e12))

## [1.14.0](https://github.com/Zephyruso/zashboard/compare/v1.13.1...v1.14.0) (2024-12-05)


### Features

* charts animation ([e7e555d](https://github.com/Zephyruso/zashboard/commit/e7e555db258f34487ff35eaf6fb467c1f3b42bab))
* hide unavailable proxy ([cd5c03d](https://github.com/Zephyruso/zashboard/commit/cd5c03d198e4304ced77952b16e25efb208ed095))


### Bug Fixes

* node card style ([2152529](https://github.com/Zephyruso/zashboard/commit/2152529d4361919ffa65b8ef19dfa058475ef799))

## [1.13.1](https://github.com/Zephyruso/zashboard/compare/v1.13.0...v1.13.1) (2024-12-04)


### Bug Fixes

* md ([a190a8c](https://github.com/Zephyruso/zashboard/commit/a190a8cbcc733b23d7ee942eadf025720e0e9503))

## [1.13.0](https://github.com/Zephyruso/zashboard/compare/v1.12.0...v1.13.0) (2024-12-04)


### Features

Docker
## [1.12.0](https://github.com/Zephyruso/zashboard/compare/v1.11.0...v1.12.0) (2024-12-04)


### Features

* docker ([667069f](https://github.com/Zephyruso/zashboard/commit/667069fa4e73f01d188ad401a31591c6c2d9e9eb))
* ghcr ([dd3dbf2](https://github.com/Zephyruso/zashboard/commit/dd3dbf20ad3ead30ad1187d7508dc6ee14076192))
* hide `GLOBAL` proxy group  when `mode` is not `GLOBAL` in `mihomo` ,otherwise it will be shown ([#38](https://github.com/Zephyruso/zashboard/issues/38)) ([2390b28](https://github.com/Zephyruso/zashboard/commit/2390b28b6680383a69d4e13d2fa6db43f3f002a6))


### Bug Fixes

* hide proxy group whose `hidden` is true in `mihomo` ([#40](https://github.com/Zephyruso/zashboard/issues/40)) ([76fbda9](https://github.com/Zephyruso/zashboard/commit/76fbda94ed78f9a7f2585e55b44a9d5c997fa31f))
* process ([7ec9087](https://github.com/Zephyruso/zashboard/commit/7ec90877685c944498ab15e83f55f787c0235341))
* proxy grid style ([d57007c](https://github.com/Zephyruso/zashboard/commit/d57007c5995dbad9fdb950542bbe019355dcade6))
* settings style ([88f12c7](https://github.com/Zephyruso/zashboard/commit/88f12c7f3f9556adc4274d318594ce630fdcb906))

## [1.11.0](https://github.com/Zephyruso/zashboard/compare/v1.10.0...v1.11.0) (2024-12-03)


### Features

* export & import settings ([3617a07](https://github.com/Zephyruso/zashboard/commit/3617a07124925764fa05d532373bc2ad0dec796c))
* logos for version ([feb0e14](https://github.com/Zephyruso/zashboard/commit/feb0e14be50a5c9fec51d90c6c7bf9e3768fe7d4))
* support to set icon color to the theme color when proxy icon starts with `data:image/svg+xml` ([520c44a](https://github.com/Zephyruso/zashboard/commit/520c44ae0d74c538d7a335127698797cead22086))


### Bug Fixes

* bigger menu for mobile ([fa74af5](https://github.com/Zephyruso/zashboard/commit/fa74af5b0e98409dec880273af7d3b0a64eb6790))
* export on ios ([430cc2d](https://github.com/Zephyruso/zashboard/commit/430cc2d52ac0100ba27395e9cac15e29b5049685))
* ip label match ends ([8ffe0c4](https://github.com/Zephyruso/zashboard/commit/8ffe0c4051a6cdda43b04584aabb6d91dbba0303))
* remove ambiguity ([273da00](https://github.com/Zephyruso/zashboard/commit/273da002be4d7e2987bb7efb2da6c15c764e73bd))
* settings input style ([1586c75](https://github.com/Zephyruso/zashboard/commit/1586c752b86cd5401bf10eae9f250f69febaf417))
* style for statistics infos ([eae3bf8](https://github.com/Zephyruso/zashboard/commit/eae3bf8ccdb310bda124e3e9840dadb4e0218610))
* truncate long host ([3cdb783](https://github.com/Zephyruso/zashboard/commit/3cdb783c449e72d8ffa7d811dcfb88fa05ed6f3a))

## [1.10.0](https://github.com/Zephyruso/zashboard/compare/v1.9.1...v1.10.0) (2024-12-03)


### Features

* config for proxy preview type ([ffec0c5](https://github.com/Zephyruso/zashboard/commit/ffec0c5d8f8f8a645d3ca6cd9afdea6b2520953b))
* pwa ([dd054a7](https://github.com/Zephyruso/zashboard/commit/dd054a7145c0f16ecf4f48110a35568cbdd0f533))
* remove backend ([f26ba61](https://github.com/Zephyruso/zashboard/commit/f26ba61758364e62fa1b6370db00f334eda74c2c))


### Bug Fixes

* chain filter ([bc8655c](https://github.com/Zephyruso/zashboard/commit/bc8655ce0c1d68c9de52feb5b0312243a70a464c))
* default regex ([b2e71e6](https://github.com/Zephyruso/zashboard/commit/b2e71e69c442aa22bab3e7c420d6a0db80cf869a))
* proxy group title ([53471c9](https://github.com/Zephyruso/zashboard/commit/53471c99e490ebfb30437e7ffc45db03006e8589))
* rule card style ([240296e](https://github.com/Zephyruso/zashboard/commit/240296e69d2de40ff4a61179d79afad1e06199e1))
* rule card style ([35cbea0](https://github.com/Zephyruso/zashboard/commit/35cbea089649c59d1bf58e3bd6b2a5f9818885cd))

## [1.9.1](https://github.com/Zephyruso/zashboard/compare/v1.9.0...v1.9.1) (2024-12-02)


### Bug Fixes

* log style ([99c4f77](https://github.com/Zephyruso/zashboard/commit/99c4f778139fdfd64c35c12ba006f574f82155b1))
* sourceip label for card ([80cb1c8](https://github.com/Zephyruso/zashboard/commit/80cb1c82db772b363ed8f692d6258a08720cf556))
* truncate proxy chain in card ([7aaeaec](https://github.com/Zephyruso/zashboard/commit/7aaeaec8046348ff2e1f97e46d79504729b598a6))

## [1.9.0](https://github.com/Zephyruso/zashboard/compare/v1.8.0...v1.9.0) (2024-12-02)


### Features

* host label map & log style ([35a8dc9](https://github.com/Zephyruso/zashboard/commit/35a8dc99d1483522eaffc6284d490cb3f1ded01f))
* truncate proxy name ([7dbeb31](https://github.com/Zephyruso/zashboard/commit/7dbeb31790772bf7612cfc95055f39eae6ababda))
* tun mode switch ([9619aae](https://github.com/Zephyruso/zashboard/commit/9619aaeaf84756eb772e842eb902e3b1b6390e10))


### Bug Fixes

* element observer ([ad329a2](https://github.com/Zephyruso/zashboard/commit/ad329a2e3bd21a497ff48b00ee40d3aa090087f4))
* latency test for url-test ([f9113d6](https://github.com/Zephyruso/zashboard/commit/f9113d681021ecc2ca8f94ce7b0bd7e832fdb517))
* show tip when truncate ([a160824](https://github.com/Zephyruso/zashboard/commit/a160824f7759c719a203c92ebe46720f05b3c0c1))
* translate ([b8ab4d9](https://github.com/Zephyruso/zashboard/commit/b8ab4d9e3790e3ef420a990e89522c1b54e86a59))
* update all providers ([c88b1e1](https://github.com/Zephyruso/zashboard/commit/c88b1e1c3d569d77bd2248abfe53298fb4a42e57))

## [1.8.0](https://github.com/Zephyruso/zashboard/compare/v1.7.2...v1.8.0) (2024-12-02)


### Features

* proxy group hide & config for automatic disconnection ([8b48f45](https://github.com/Zephyruso/zashboard/commit/8b48f4535c13d02114fc589c7bc78e37cb83d2ac))
* source ip filter ([4a09d25](https://github.com/Zephyruso/zashboard/commit/4a09d25586b281b11f3b7d2cae397ee79e46ec2c))
* upgrade core for mihomo ([cd0f65b](https://github.com/Zephyruso/zashboard/commit/cd0f65b6f8ee0e07efa880bd8f162b8413be88b9))


### Bug Fixes

* dl speed ([0d09a78](https://github.com/Zephyruso/zashboard/commit/0d09a78b8c1f8ea03f59bd780fa7165b2bcc6288))
* proxy group style ([7c2841c](https://github.com/Zephyruso/zashboard/commit/7c2841c8436b68023b89ffe3ca2af6756d912b0e))
* source ip filter ([4ca1a89](https://github.com/Zephyruso/zashboard/commit/4ca1a8992915774f761fa493e135b890312f10fa))
* stable sourceips opts ([8836dd8](https://github.com/Zephyruso/zashboard/commit/8836dd81d1caccf240a9ee9c591d1ee01a0b851c))
* style fix & config for mobile ([a59fac2](https://github.com/Zephyruso/zashboard/commit/a59fac257e2f19a8022972bc1c245c4314881a5c))

## [1.7.2](https://github.com/Zephyruso/zashboard/compare/v1.7.1...v1.7.2) (2024-11-29)


### Bug Fixes

* modes for sing-box-p & version error & icon height ([793fdf4](https://github.com/Zephyruso/zashboard/commit/793fdf4c9221adf1108d93fafeacda54bf445804))

## [1.7.1](https://github.com/Zephyruso/zashboard/compare/v1.7.0...v1.7.1) (2024-11-29)


### Bug Fixes

* collapse for mobile ([4561d33](https://github.com/Zephyruso/zashboard/commit/4561d33c73aa628e8b9f12b65362f47817392854))
* md & logs color ([75b02f5](https://github.com/Zephyruso/zashboard/commit/75b02f50fc5438504053eb5a03bf9a4ba06d9e4e))
* node card style ([9b1d391](https://github.com/Zephyruso/zashboard/commit/9b1d3914bae838c0bcc36cca11aa17becf0c8830))
* statistics when switch backend ([b18c8b8](https://github.com/Zephyruso/zashboard/commit/b18c8b866551f580a9e0759683aed9b5af729170))

## [1.7.0](https://github.com/Zephyruso/zashboard/compare/v1.6.2...v1.7.0) (2024-11-29)


### Features

* time for log & proxy icon ([097e936](https://github.com/Zephyruso/zashboard/commit/097e9366d4f2041d76fb2249960f8ce6952a3e29))


### Bug Fixes

* rule card ([9697156](https://github.com/Zephyruso/zashboard/commit/969715641f4979b0f3b1fa808a119d860fb26f17))
* style ([95232e0](https://github.com/Zephyruso/zashboard/commit/95232e0d2457a5423b8156d056945b5209cdc62c))

## [1.6.2](https://github.com/Zephyruso/zashboard/compare/v1.6.1...v1.6.2) (2024-11-28)


### Bug Fixes

* btn click & logs layout ([c8f7a38](https://github.com/Zephyruso/zashboard/commit/c8f7a38fde8c980c6d3769f8556868b41297ba7e))
* proxy node grid ([4e3458b](https://github.com/Zephyruso/zashboard/commit/4e3458bfe8b3bc9333f804a8a55beb51fd203302))

## [1.6.1](https://github.com/Zephyruso/zashboard/compare/v1.6.0...v1.6.1) (2024-11-28)


### Bug Fixes

* align fix & href link ([8c7678f](https://github.com/Zephyruso/zashboard/commit/8c7678f850ee4fa2618437c5366ebd2f03703f4d))
* remove dynamic import & connections ([54eacb4](https://github.com/Zephyruso/zashboard/commit/54eacb453906d3916022fa2da46f7f24265461ff))
* speed info ([54d3364](https://github.com/Zephyruso/zashboard/commit/54d33646f419c92a2bdc6849354d63b1bfac9581))

## [1.6.0](https://github.com/Zephyruso/zashboard/compare/v1.5.5...v1.6.0) (2024-11-28)


### Features

* sidebar collapse & bars preview ([059c64f](https://github.com/Zephyruso/zashboard/commit/059c64f61f55f8b6ef09637d52e25985b9a4e2cd))

## [1.5.5](https://github.com/Zephyruso/zashboard/compare/v1.5.4...v1.5.5) (2024-11-27)


### Bug Fixes

* catch errors ([58754f7](https://github.com/Zephyruso/zashboard/commit/58754f75638d05541b43a4a1979d702928300da2))
* tab translate & home bg ([0bcffce](https://github.com/Zephyruso/zashboard/commit/0bcffce17edca247f6771e2db53656529da3765b))

## [1.5.4](https://github.com/Zephyruso/zashboard/compare/v1.5.3...v1.5.4) (2024-11-27)


### Bug Fixes

* chart style & home bg ([827f9df](https://github.com/Zephyruso/zashboard/commit/827f9df5fbd22c128ce33b68e65fb27954df7b82))

## [1.5.3](https://github.com/Zephyruso/zashboard/compare/v1.5.2...v1.5.3) (2024-11-26)


### Bug Fixes

* chart style ([02feffd](https://github.com/Zephyruso/zashboard/commit/02feffdcf6b32c0e8b2d18282780170894025612))

## [1.5.2](https://github.com/Zephyruso/zashboard/compare/v1.5.1...v1.5.2) (2024-11-26)


### Bug Fixes

* menu width ([7249ffe](https://github.com/Zephyruso/zashboard/commit/7249ffe0cdcc055d76b32b1fb4d230c0c80b1591))

## [1.5.1](https://github.com/Zephyruso/zashboard/compare/v1.5.0...v1.5.1) (2024-11-26)


### Bug Fixes

* tab for connections ([60cb6fe](https://github.com/Zephyruso/zashboard/commit/60cb6fe0dcd5cdc21c5bc8dbe4b5e4f377d81c11))
* unify card style & pretty bytes ([77bb99b](https://github.com/Zephyruso/zashboard/commit/77bb99b88cc3c9ce05f3381641ec77ca8b728cec))

## [1.5.0](https://github.com/Zephyruso/zashboard/compare/v1.4.0...v1.5.0) (2024-11-26)


### Features

* zashboard version ([f08c584](https://github.com/Zephyruso/zashboard/commit/f08c5848c23605db0cc8a240e7a64c27e0be57cd))


### Bug Fixes

* build ([a7d51f3](https://github.com/Zephyruso/zashboard/commit/a7d51f32512ae2c87e7c285f235ae6d299b71f6c))
* charts units ([f4dc1c7](https://github.com/Zephyruso/zashboard/commit/f4dc1c76b85e2af3da2c32595fbf07866b1f4a52))
* pretty bytes ([2563b02](https://github.com/Zephyruso/zashboard/commit/2563b02ca54a11a7fc4975b802b3a513d11a7ceb))

## [1.4.0](https://github.com/Zephyruso/zashboard/compare/v1.3.0...v1.4.0) (2024-11-26)


### Features

* speed charts ([244ed8b](https://github.com/Zephyruso/zashboard/commit/244ed8bfec1544bd03b160769fad645334f38629))


### Bug Fixes

* card style with long name ([ae77d8b](https://github.com/Zephyruso/zashboard/commit/ae77d8b9726a76959ca80a6df8a27c0d6398aa1d))

## [1.3.0](https://github.com/Zephyruso/zashboard/compare/v1.2.0...v1.3.0) (2024-11-26)


### Features

* custom sort proxy ([b38c154](https://github.com/Zephyruso/zashboard/commit/b38c1543dfb577598efdc451461f001e699de265))

## [1.2.0](https://github.com/Zephyruso/zashboard/compare/v1.1.0...v1.2.0) (2024-11-26)


### Features

* save sorting to storage ([e52950b](https://github.com/Zephyruso/zashboard/commit/e52950b40aa01223d812a8d280199fbac8b94117))
* upgrade all providers ([32465fe](https://github.com/Zephyruso/zashboard/commit/32465fe7f4e1a7e7d7e381fef4ff99f31ec98c10))
* upgrade ui ([796be32](https://github.com/Zephyruso/zashboard/commit/796be32f1869ebf79bcc35b4424b1f19f4528163))


### Bug Fixes

* provider preview ([b583847](https://github.com/Zephyruso/zashboard/commit/b583847d42345e7666f49e63874d003489fb00ac))

## [1.1.0](https://github.com/Zephyruso/zashboard/compare/v1.0.0...v1.1.0) (2024-11-26)


### Features

* providers ([b64119b](https://github.com/Zephyruso/zashboard/commit/b64119bbce9c8aa10cca56068d7459aaaa88b083))
* subscription info ([09c71be](https://github.com/Zephyruso/zashboard/commit/09c71bebb27555b176bc4e7cb2c9b56393c998da))

## 1.0.0 (2024-11-25)


### Features

* auto release ([47a2c6c](https://github.com/Zephyruso/zashboard/commit/47a2c6c7b9b5520ecd75b9c32f534a520b3e2095))
* cfg for two cols ([23ffa48](https://github.com/Zephyruso/zashboard/commit/23ffa480ecd29fdb8e1e5662ba473da0ae380acd))
* connection & logs ([fa7cc15](https://github.com/Zephyruso/zashboard/commit/fa7cc15a9b55a4dfa98a8fe0f749493f376d601d))
* connection tables ([a27ec0b](https://github.com/Zephyruso/zashboard/commit/a27ec0bc095fb80a3114093f8ab00c03aea38014))
* mode list ([1156911](https://github.com/Zephyruso/zashboard/commit/1156911ecf7f242dc3c1c83b904ff80386a404d6))
* quick filter & flush fakeip & backend switch ([186ccbd](https://github.com/Zephyruso/zashboard/commit/186ccbdbd8884111a40af5282dadc9e6fef22fed))
* version 1.0.0 ([2e429d1](https://github.com/Zephyruso/zashboard/commit/2e429d17f59a758d68727b8c27f3aa6e35e16d57))


### Bug Fixes

* pkg name ([550bd67](https://github.com/Zephyruso/zashboard/commit/550bd67366fb98bc24e38c05bc32b4c7314e832b))
