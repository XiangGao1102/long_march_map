
(() => {
  "use strict";

  const immersiveAudioId = "immersive-long-march-song";
  let wakeLockSentinel = null;
  let wantsScreenAwake = false;
  let reacquireTimer = 0;

  const getAudio = () => document.getElementById(immersiveAudioId);

  const immersiveIsOpen = () => {
    const experience = document.getElementById("immersive-map-experience");
    return document.body.classList.contains("immersive-map-open") && Boolean(experience?.classList.contains("is-open"));
  };

  const playbackNeedsWakeLock = () => {
    const audio = getAudio();
    return Boolean(immersiveIsOpen() && audio && !audio.paused && !audio.ended);
  };

  const clearReacquireTimer = () => {
    if (!reacquireTimer) return;
    window.clearTimeout(reacquireTimer);
    reacquireTimer = 0;
  };

  const releaseScreenWakeLock = async () => {
    clearReacquireTimer();
    const heldLock = wakeLockSentinel;
    wakeLockSentinel = null;
    if (!heldLock || heldLock.released) return;
    try {
      await heldLock.release();
    } catch (_) {
      // A browser may already have released the lock while changing visibility.
    }
  };

  const requestScreenWakeLock = async () => {
    if (!wantsScreenAwake || document.visibilityState !== "visible" || wakeLockSentinel) return;
    if (!navigator.wakeLock?.request) return;

    try {
      const requestedLock = await navigator.wakeLock.request("screen");
      if (!wantsScreenAwake || document.visibilityState !== "visible" || !playbackNeedsWakeLock()) {
        await requestedLock.release().catch(() => {});
        return;
      }
      wakeLockSentinel = requestedLock;
      requestedLock.addEventListener("release", () => {
        if (wakeLockSentinel === requestedLock) wakeLockSentinel = null;
        if (!wantsScreenAwake || document.visibilityState !== "visible" || !playbackNeedsWakeLock()) return;
        clearReacquireTimer();
        reacquireTimer = window.setTimeout(() => {
          reacquireTimer = 0;
          requestScreenWakeLock();
        }, 120);
      }, { once: true });
    } catch (_) {
      wakeLockSentinel = null;
    }
  };

  const syncScreenWakeLock = () => {
    wantsScreenAwake = playbackNeedsWakeLock();
    if (wantsScreenAwake && document.visibilityState === "visible") {
      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }
  };

  document.addEventListener("play", (event) => {
    if (event.target?.id !== immersiveAudioId) return;
    wantsScreenAwake = true;
    requestScreenWakeLock();
  }, true);

  document.addEventListener("pause", (event) => {
    if (event.target?.id !== immersiveAudioId) return;
    wantsScreenAwake = false;
    releaseScreenWakeLock();
  }, true);

  document.addEventListener("ended", (event) => {
    if (event.target?.id !== immersiveAudioId) return;
    wantsScreenAwake = false;
    releaseScreenWakeLock();
  }, true);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") {
      releaseScreenWakeLock();
      return;
    }
    syncScreenWakeLock();
  });

  window.addEventListener("pagehide", () => {
    wantsScreenAwake = false;
    releaseScreenWakeLock();
  });

  new MutationObserver(syncScreenWakeLock).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"]
  });

  syncScreenWakeLock();
})();
