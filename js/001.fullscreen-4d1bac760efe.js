(() => {
  "use strict";
  const root = document.documentElement;
  const mobile = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|Mobile|MicroMessenger|QQ\//i.test(navigator.userAgent || "");
  let model = null;
  let syncFrame = 0;
  let fullscreenRequest = null;
  let trustedClick = null;
  let attemptedClick = null;

  window.__LANDSCAPE_LETTERBOX_HOST__ = false;
  window.__LANDSCAPE_LETTERBOX_CONTENT__ = false;
  root.dataset.lmMobile = String(mobile);

  function readViewport() {
    const vv = mobile ? window.visualViewport : null;
    const width = Math.max(1, Math.round(vv?.width || innerWidth || root.clientWidth));
    const height = Math.max(1, Math.round(vv?.height || innerHeight || root.clientHeight));
    const left = Math.round(vv?.offsetLeft || 0);
    const top = Math.round(vv?.offsetTop || 0);
    const rotated = mobile && height > width;
    return { width, height, left, top, rotated, logicalWidth: rotated ? height : width, logicalHeight: rotated ? width : height };
  }

  function syncViewport() {
    const next = readViewport();
    const changed = !model || Object.keys(next).some(key => next[key] !== model[key]);
    model = next;
    root.classList.toggle("force-css-landscape", next.rotated);
    root.dataset.landscapePresentation = next.rotated ? "css-rotated" : "native-landscape";
    root.dataset.lmSmallHeight = String(mobile && next.logicalHeight < 350);
    root.style.setProperty("--lm-landscape-width", `${next.logicalWidth}px`);
    root.style.setProperty("--lm-landscape-height", `${next.logicalHeight}px`);
    root.style.setProperty("--lm-physical-width", `${next.width}px`);
    root.style.setProperty("--lm-physical-height", `${next.height}px`);
    root.style.setProperty("--lm-viewport-center-x", `${next.left + next.width / 2}px`);
    root.style.setProperty("--lm-viewport-center-y", `${next.top + next.height / 2}px`);
    root.style.setProperty("--lm-viewport-rotation", next.rotated ? "90deg" : "0deg");
    if (changed) window.dispatchEvent(new CustomEvent("long-march-viewportchange", { detail: next }));
    return changed;
  }

  function scheduleSync() {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;
      // visualViewport can change without a window resize in Safari.
      if (syncViewport()) window.dispatchEvent(new Event("resize"));
    });
  }

  function localPoint(element, x, y) {
    const rect = element?.getBoundingClientRect();
    if (!rect) return { x, y };
    return model.rotated
      ? { x: y - rect.top, y: rect.right - x }
      : { x: x - rect.left, y: y - rect.top };
  }

  window.__LONG_MARCH_VIEWPORT_WIDTH__ = () => readViewport().logicalWidth;
  window.__LONG_MARCH_VIEWPORT_HEIGHT__ = () => readViewport().logicalHeight;
  window.__LONG_MARCH_LOCAL_POINT__ = localPoint;
  window.__LONG_MARCH_CLIENT_TO_LOGICAL__ = (x, y) => localPoint(document.getElementById("app"), x, y);
  window.__LONG_MARCH_LOGICAL_RECT__ = (element, host = document.getElementById("app")) => {
    if (!element || !host) return null;
    const rect = element.getBoundingClientRect();
    const parent = host.getBoundingClientRect();
    return model.rotated
      ? { left: rect.top - parent.top, top: parent.right - rect.right, width: rect.height, height: rect.width, right: rect.bottom - parent.top, bottom: parent.right - rect.left }
      : { left: rect.left - parent.left, top: rect.top - parent.top, width: rect.width, height: rect.height, right: rect.right - parent.left, bottom: rect.bottom - parent.top };
  };
  window.__LONG_MARCH_SYNC_VIEWPORT__ = () => { if (syncViewport()) window.dispatchEvent(new Event("resize")); };
  const nativeFullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  const standaloneDisplay = () => navigator.standalone === true || window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
  function syncFullscreenMode() {
    root.dataset.lmFullscreen = nativeFullscreen() ? "native" : standaloneDisplay() ? "standalone" : "browser";
  }
  window.__LONG_MARCH_HOST_STATE__ = () => ({ fullscreen: nativeFullscreen(), landscape: !mobile || model.logicalWidth >= model.logicalHeight, cssLandscape: model.rotated });

  function requestNativeFullscreen() {
    if (nativeFullscreen() || standaloneDisplay()) {
      syncFullscreenMode();
      return Promise.resolve(true);
    }
    if (fullscreenRequest) return fullscreenRequest;
    const currentClick = trustedClick?.eventPhase ? trustedClick : null;
    if (currentClick && attemptedClick === currentClick) return Promise.resolve(false);
    // Detect the actual API: supported iPads and future browsers can also enter fullscreen.
    const standard = typeof root.requestFullscreen === "function" && document.fullscreenEnabled !== false;
    const prefixed = typeof root.webkitRequestFullscreen === "function" && document.webkitFullscreenEnabled !== false;
    if (!standard && !prefixed) {
      syncFullscreenMode();
      return Promise.resolve(false);
    }
    let result;
    attemptedClick = currentClick;
    try {
      // Call synchronously inside the trusted click, before its activation expires.
      result = standard ? root.requestFullscreen({ navigationUI: "hide" }) : root.webkitRequestFullscreen();
    } catch {
      syncFullscreenMode();
      return Promise.resolve(false);
    }
    fullscreenRequest = Promise.resolve(result).then(() => nativeFullscreen(), () => false).finally(() => {
      fullscreenRequest = null;
      syncFullscreenMode();
      scheduleSync();
    });
    return fullscreenRequest;
  }

  async function lockLandscape() {
    try { await screen.orientation?.lock?.("landscape"); } catch {}
  }

  window.__LONG_MARCH_ENTER_LANDSCAPE__ = async () => {
    window.__LONG_MARCH_SYNC_VIEWPORT__();
    const entered = await requestNativeFullscreen();
    if (entered) await lockLandscape();
    scheduleSync();
    return entered || model.rotated;
  };
  window.__LONG_MARCH_EXIT_LANDSCAPE__ = async () => {
    try { screen.orientation?.unlock?.(); } catch {}
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch {}
    scheduleSync();
  };

  syncViewport();
  syncFullscreenMode();
  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("orientationchange", scheduleSync, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleSync, { passive: true });
  window.visualViewport?.addEventListener("scroll", scheduleSync, { passive: true });
  document.addEventListener("fullscreenchange", () => { syncFullscreenMode(); scheduleSync(); });
  document.addEventListener("webkitfullscreenchange", () => { syncFullscreenMode(); scheduleSync(); });
  window.addEventListener("load", scheduleSync, { once: true });

  function fullscreenFromGesture(event) {
    if (event.isTrusted === false) return;
    trustedClick = event;
    if (nativeFullscreen() || standaloneDisplay()) return;
    // Keep the existing manual fullscreen toggle usable for explicitly leaving fullscreen.
    if (event.target?.closest?.("#page-fullscreen-toggle")) return;
    requestNativeFullscreen().then(async entered => {
      if (entered) await lockLandscape();
      scheduleSync();
    });
  }
  // Wait for a completed click rather than resizing on pointerdown. Capture
  // also covers node controls which stop the click from bubbling to window.
  window.addEventListener("click", fullscreenFromGesture, { capture: true, passive: true });
})();
