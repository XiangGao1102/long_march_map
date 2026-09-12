
(() => {
  const root = document.documentElement;
  const isNativeFullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  const isLikelyMobile = () => window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|Mobile|MicroMessenger|QQ\//i.test(navigator.userAgent || '');
  let inflight = false;
  let lastAttempt = 0;

  function afterEntered() {
    try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}); } catch (_) {}
    const refresh = () => {
      try { window.__LONG_MARCH_REFRESH_STABLE_VIEWPORT__?.(true); } catch (_) {}
      window.dispatchEvent(new Event('resize'));
    };
    refresh();
    requestAnimationFrame(refresh);
    setTimeout(refresh, 80);
    setTimeout(refresh, 260);
  }

  function requestNow(event) {
    if (!isLikelyMobile() || isNativeFullscreen()) return;
    if (event?.isTrusted === false) return;
    // 对真正用户手势只做极短去重；不再用旧版 180ms 节流阻挡 touchend/click 补申请。
    const now = performance.now();
    if (inflight && now - lastAttempt < 35) return;
    lastAttempt = now;

    const fn = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!fn) return;
    inflight = true;
    try {
      let result;
      if (root.requestFullscreen) result = root.requestFullscreen({ navigationUI: 'hide' });
      else result = root.webkitRequestFullscreen();
      Promise.resolve(result).then(() => {
        if (isNativeFullscreen()) afterEntered();
      }).catch(() => {}).finally(() => { inflight = false; });
    } catch (_) {
      inflight = false;
    }
  }

  // 捕获阶段绑定到 document/root/window，多入口覆盖地图 canvas、按钮、节点卡片、空白背景等所有区域。
  const targets = [window, document, root];
  const events = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'];
  for (const target of targets) {
    for (const type of events) {
      try { target.addEventListener(type, requestNow, { capture: true, passive: true }); } catch (_) {}
    }
  }

  // 键盘/鼠标点击兼容（例如安卓平板外接鼠标）。
  document.addEventListener('mousedown', requestNow, { capture: true, passive: true });
})();
