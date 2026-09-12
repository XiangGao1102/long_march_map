# 红军长征 H5 最终版工程包

由 `最终版.html` 拆分生成，入口为 `index.html`。

## 目录

- `index.html`：页面入口与 DOM 结构
- `css/`：43 个 CSS 文件，按原 HTML 出现顺序加载
- `js/`：22 个 JavaScript 文件，按原 HTML 出现顺序加载
- `assets/images/`：73 个去重图片文件
- `assets/audio/`：2 个音频文件
- `start-local.bat`：Windows 本地 HTTP 测试
- `start-local.sh`：macOS/Linux 本地 HTTP 测试

## 本地测试

由于工程包含 Three.js / Canvas / WebGL，建议通过本地 HTTP 服务测试，不要直接使用 file://。

Windows：双击 `start-local.bat`，然后访问 `http://127.0.0.1:8000`。

macOS/Linux：运行 `./start-local.sh`。

## 腾讯云 / GitHub Pages

将本目录中的全部文件与文件夹保持原目录结构上传，入口为 `index.html`。
不要只上传 index.html。

## 缓存建议

- assets/*：可设置长期缓存
- css/*、js/*：版本稳定后可长期缓存
- index.html：建议 no-cache 或短缓存

## 大小

- 原单文件：26.88 MB
- index.html：24.0 KB
- 工程总大小：18.65 MB


## 本地直接双击 index.html

本版本已经增加 `file://` 双兼容：

- 腾讯云 / GitHub Pages / HTTP(S)：三维纹理继续从 `assets/images/` 独立加载，保持缓存和并行加载优势。
- PC 本地直接双击 `index.html`：三维地形纹理、高程图、诗句节点纹理自动使用安全内置副本，避免 Canvas/WebGL 的本地文件安全限制。
- 其他图片、CSS、JS、音频仍保持工程化拆分。

因此既可以直接双击 `index.html` 测试，也可以运行 `start-local.bat` 通过本地 HTTP 测试。


## V166/V167 手机显示修复

本版本只增加两项显示兼容：

1. 初次三步操作提示被放入主作品 `#app` 的横屏坐标系，因此手机竖持时，从第一条提示开始就是横屏显示，不再先竖屏再切换。
2. iOS Safari/微信等无法真正进入网页 Fullscreen 的环境，使用 `visualViewport` 的实际可见区域作为安全画布。Safari 地址栏/工具栏占用的空间不再计入作品画布，顶栏、底栏、左侧导航栏、右侧节点栏和3D场景都会限制在可见区域内。

Android、PC、3秒路线、节点、小红旗、2D沉浸地图、长期稳帧优化等均未改变。


## V168 “显示全部”节点名称规则

- 单独显示中央红军、红二方面军或红四方面军时：继续显示该路线当前到达节点的事件名称。
- 点击“显示全部”同时展示三条路线时：隐藏三条路线上的事件名称，仅保留路线、小红旗和其他原有内容。
- 其他功能与视觉效果均未修改。


## V169 iOS沉浸式界面横屏修复

只修复 iOS 进入“沉浸式长征地图”后的方向误判：

- iPhone Safari 即使物理仍为竖持，只要主界面已处于 CSS 逻辑横屏，沉浸式界面直接继承同一横屏坐标系。
- 不再显示“请将设备横置”的错误提示。
- 沉浸式界面继续使用主界面的 `visualViewport` 安全区域，因此不会被 Safari 地址栏/工具栏遮挡。
- Android、PC、3D主界面、3秒路线、小红旗、节点、显示全部隐藏事件名称、2D内容与性能优化均未改变。


## V170 iOS沉浸式与Android横屏一致

本版本只修复 iOS 沉浸式界面：

- iOS 在逻辑横屏时完整复用 Android 手机横屏的分栏、歌词、播放器、关闭按钮、地图卡片、地图工具等尺寸参数。
- 覆盖 Safari 物理 portrait 导致的单列/竖屏样式误触发。
- 左侧地图仍为同一张内容；iOS 使用 3264×1928 的高质量同内容副本，显著降低大图解码内存，避免 Safari 黑屏。
- 地图加载完成后自动重新测量两次，确保旋转安全画布中的地图尺寸稳定。
- Android、PC、3D主界面、3秒路线、小红旗、节点、显示全部隐藏事件名称、首屏横屏、iOS主界面安全区、性能优化全部未改变。
