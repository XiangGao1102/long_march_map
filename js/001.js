
(() => {
  /* V44 — 跨浏览器固定横屏控制
     原则：
     1) 不再用“当前页面 iframe 再加载自己”的方式；
     2) Android/Chromium 支持时优先 Fullscreen + ScreenOrientation.lock；
     3) Safari、微信、QQ、WebView 不支持锁方向时，直接使用 CSS 旋转形成视觉横屏；
     4) 暴露统一的“有效横屏视口”给 Three.js 和标签投影逻辑使用。 */
  const root = document.documentElement;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const likelyMobile = coarsePointer || /Android|iPhone|iPad|iPod|Mobile|MicroMessenger|QQ\//i.test(navigator.userAgent || "");

  window.__LANDSCAPE_LETTERBOX_HOST__ = false;
  window.__LANDSCAPE_LETTERBOX_CONTENT__ = false;

  const isNativeFullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  const physicalPortrait = () => {
    const vv = window.visualViewport;
    const w = vv?.width || window.innerWidth || document.documentElement.clientWidth;
    const h = vv?.height || window.innerHeight || document.documentElement.clientHeight;
    return h >= w;
  };
  const isCssLandscape = () => root.classList.contains("force-css-landscape");

  /* CLOUD-COMPAT 2026-09
     在线页面的浏览器地址栏会频繁改变 visualViewport.height。原版本会因此反复
     改写逻辑横屏尺寸，导致 Three.js、DOM 标签和触摸坐标在腾讯云/GitHub Pages
     上出现漂移。这里保存一个稳定的物理视口：同一物理方向内仅宽度明显变化时
     才更新；单纯地址栏伸缩不再改变作品坐标系。 */
  let stableViewport = null;
  function readPhysicalViewport() {
    const vv = window.visualViewport;
    const vw = Math.max(1, Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 1));
    const vh = Math.max(1, Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 1));

    /* V140：手机端永远使用 screen 的完整尺寸。
       file://、https://、浏览器地址栏、Fullscreen 前后都不改变作品逻辑尺寸。 */
    if (likelyMobile) {
      const sw0 = Math.max(1, Math.round(window.screen?.width || vw));
      const sh0 = Math.max(1, Math.round(window.screen?.height || vh));
      const portraitNow = vh >= vw;
      return portraitNow
        ? { w: Math.min(sw0, sh0), h: Math.max(sw0, sh0) }
        : { w: Math.max(sw0, sh0), h: Math.min(sw0, sh0) };
    }

    return { w: vw, h: vh };
  }
  function refreshStableViewport(force = false) {
    const now = readPhysicalViewport();
    if (!stableViewport) { stableViewport = now; return stableViewport; }

    const oldPortrait = stableViewport.h >= stableViewport.w;
    const newPortrait = now.h >= now.w;
    const orientationChanged = oldPortrait !== newPortrait;

    /* V140：手机端只在真实横竖方向改变时交换长短边；
       地址栏和 Fullscreen 绝不重新定义内部尺寸。 */
    if (likelyMobile) {
      if (orientationChanged) stableViewport = now;
      return stableViewport;
    }

    const widthChanged = Math.abs(now.w - stableViewport.w) >= 4;
    if (force || orientationChanged || widthChanged) stableViewport = now;
    return stableViewport;
  }
  refreshStableViewport(true);

  window.__LONG_MARCH_VIEWPORT_WIDTH__ = () => {
    const { w, h } = refreshStableViewport(false);
    return likelyMobile ? Math.max(w, h) : w;
  };
  window.__LONG_MARCH_VIEWPORT_HEIGHT__ = () => {
    const { w, h } = refreshStableViewport(false);
    return likelyMobile ? Math.min(w, h) : h;
  };

  /* 统一把浏览器物理触点换算为作品的逻辑横屏坐标。所有需要精确坐标的交互
     都调用这一入口，避免不同浏览器对 transform 后 PointerEvent 的实现差异。 */
  window.__LONG_MARCH_CLIENT_TO_LOGICAL__ = (clientX, clientY) => {
    if (!isCssLandscape()) return { x: clientX, y: clientY };
    const app = document.getElementById("app");
    const rect = app?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) {
      return { x: clientY - rect.top, y: rect.right - clientX };
    }
    const { w } = refreshStableViewport(false);
    return { x: clientY, y: w - clientX };
  };

  const compatStyle = document.createElement("style");
  compatStyle.id = "long-march-v44-landscape-compat";
  compatStyle.textContent = `
    html.force-css-landscape,
    html.force-css-landscape body {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      overflow: hidden !important;
      background: #000 !important;
      overscroll-behavior: none;
    }
    html.force-css-landscape body {
      position: fixed !important;
      inset: 0 !important;
      touch-action: none;
    }
    html.force-css-landscape #app {
      position: fixed !important;
      left: 50% !important;
      top: 50% !important;
      right: auto !important;
      bottom: auto !important;
      width: var(--lm-landscape-width) !important;
      height: var(--lm-landscape-height) !important;
      min-width: 0 !important;
      min-height: 0 !important;
      transform: translate(-50%, -50%) rotate(90deg) !important;
      transform-origin: 50% 50% !important;
      overflow: hidden !important;
      contain: layout paint;
    }
    html.force-css-landscape #scene,
    html.force-css-landscape #scene canvas,
    html.force-css-landscape #labels-layer,
    html.force-css-landscape #terrain-labels {
      width: 100% !important;
      height: 100% !important;
    }
    html.force-css-landscape .mobile-fullscreen-prompt {
      max-width: min(520px, calc(var(--lm-landscape-width) - 20px));
    }
    /* V57: remove only the startup fullscreen prompt; all V44 UI stays unchanged. */
    #mobile-fullscreen-prompt { display: none !important; }
  `;
  document.head.appendChild(compatStyle);

  function syncLandscapeViewport(force = false) {
    const { w, h } = refreshStableViewport(force);
    root.style.setProperty("--lm-landscape-width", `${Math.max(w, h)}px`);
    root.style.setProperty("--lm-landscape-height", `${Math.min(w, h)}px`);
    root.style.setProperty("--lm-physical-width", `${w}px`);
    root.style.setProperty("--lm-physical-height", `${h}px`);
    root.dataset.landscapePresentation = isCssLandscape() ? "css-rotated" : (physicalPortrait() ? "portrait" : "native-landscape");
  }

  function enableCssLandscape() {
    if (!likelyMobile || !physicalPortrait()) return false;
    root.classList.add("force-css-landscape");
    syncLandscapeViewport();
    return true;
  }

  function disableCssLandscape() {
    root.classList.remove("force-css-landscape");
    syncLandscapeViewport();
  }

  async function requestNativeFullscreen() {
    if (isNativeFullscreen()) return true;
    try {
      if (root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: "hide" });
        return true;
      }
      if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
        return true;
      }
    } catch (error) {
      console.info("原生全屏不可用，使用兼容横屏模式。", error);
    }
    return isNativeFullscreen();
  }

  async function tryLockLandscape() {
    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock("landscape");
        return true;
      }
    } catch (error) {
      console.info("浏览器不允许锁定屏幕方向，使用 CSS 横屏兜底。", error);
    }
    return false;
  }

  window.__LONG_MARCH_HOST_STATE__ = () => ({
    fullscreen: isNativeFullscreen(),
    landscape: !physicalPortrait() || isCssLandscape(),
    cssLandscape: isCssLandscape(),
  });

  window.__LONG_MARCH_ENTER_LANDSCAPE__ = async () => {
    // 先立即给出视觉横屏，避免 Safari / 微信等待 API 失败后仍停留竖屏。
    if (physicalPortrait()) enableCssLandscape();
    const entered = await requestNativeFullscreen();
    const locked = entered ? await tryLockLandscape() : false;
    // 原生全屏会让地址栏消失并改变 viewport；强制重新采样，避免沿用旧尺寸。
    window.setTimeout(() => {
      refreshStableViewport(true);
      if (locked && !physicalPortrait()) disableCssLandscape();
      else if (physicalPortrait()) enableCssLandscape();
      syncLandscapeViewport();
      window.dispatchEvent(new Event("resize"));
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }, 80);
    return entered || isNativeFullscreen();
  };

  window.__LONG_MARCH_EXIT_LANDSCAPE__ = async () => {
    try { screen.orientation?.unlock?.(); } catch {}
    disableCssLandscape();
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (error) {
      console.info("浏览器未允许退出原生全屏。", error);
    }
    syncLandscapeViewport();
    window.dispatchEvent(new Event("resize"));
  };

  function syncMode() {
    // 手机竖着拿时始终保持“视觉横屏”；物理转为横屏后取消 CSS 旋转。
    if (likelyMobile && physicalPortrait()) enableCssLandscape();
    else disableCssLandscape();
    syncLandscapeViewport();
  }

  syncMode();
  window.addEventListener("resize", syncMode, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(() => { refreshStableViewport(true); syncMode(); }, 90), { passive: true });
  // 在线浏览器地址栏出现/收起只改变 visualViewport 高度；syncMode 会读取稳定视口，
  // 因此可安全响应而不会重建作品坐标系。
  window.visualViewport?.addEventListener("resize", syncMode, { passive: true });
  document.addEventListener("fullscreenchange", syncMode);
  document.addEventListener("webkitfullscreenchange", syncMode);

  /* CLOUD-FULLSCREEN V2:
     页面加载阶段只建立稳定 CSS 横屏；一旦用户产生任意真实触碰/点击，
     立即在该用户手势的捕获阶段申请浏览器原生全屏。浏览器若第一次拒绝，
     后续每次触碰仍会继续补申请，直到真正进入 fullscreen。 */
  const autoEnterLandscape = () => {
    syncMode();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoEnterLandscape, { once: true });
  } else {
    autoEnterLandscape();
  }
  window.addEventListener("load", autoEnterLandscape, { once: true });

  let nativeFullscreenRequestPending = false;
  let lastNativeFullscreenAttempt = 0;

  const requestFullscreenFromAnyGesture = (event) => {
    if (!likelyMobile || isNativeFullscreen() || nativeFullscreenRequestPending) return;
    // 只响应真实用户输入；避免脚本合成事件触发浏览器安全策略错误。
    if (event && event.isTrusted === false) return;
    const now = Date.now();
    if (now - lastNativeFullscreenAttempt < 180) return;
    lastNativeFullscreenAttempt = now;
    nativeFullscreenRequestPending = true;

    // 重要：必须在当前 pointer/touch/click 的同步调用链中立刻进入 requestFullscreen。
    // 不在这里先 await 任何异步操作，否则会丢失 user activation。
    requestNativeFullscreen().then(async (entered) => {
      if (entered) {
        try { await tryLockLandscape(); } catch {}
        refreshStableViewport(true);
        syncMode();
        window.dispatchEvent(new Event("resize"));
        requestAnimationFrame(() => {
          refreshStableViewport(true);
          syncMode();
          window.dispatchEvent(new Event("resize"));
        });
        setTimeout(() => {
          refreshStableViewport(true);
          syncMode();
          window.dispatchEvent(new Event("resize"));
        }, 260);
      }
    }).finally(() => {
      nativeFullscreenRequestPending = false;
    });
  };

  // PointerEvent 浏览器只绑定 pointerdown，避免同一次手势同时触发 touchstart + pointerdown。
  const primaryGestureEvent = "PointerEvent" in window ? "pointerdown" : "touchstart";
  window.addEventListener(primaryGestureEvent, requestFullscreenFromAnyGesture, { capture: true, passive: true });
  // click 作为少数 WebView 的补偿路径；节流会避免一次手势重复申请。
  window.addEventListener("click", requestFullscreenFromAnyGesture, { capture: true, passive: true });
})();
    