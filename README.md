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
