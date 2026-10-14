
(() => {
  const TAB_SELECTOR = '.commandbar .route-switch .route-tab';
  let running = false;

  function setSize(tabs, size) {
    const value = `${size.toFixed(2)}px`;
    for (const tab of tabs) {
      tab.style.setProperty('font-size', value, 'important');
      const span = tab.querySelector('span');
      if (span) span.style.setProperty('font-size', value, 'important');
    }
  }

  function allFit(tabs) {
    return tabs.every(tab => {
      const span = tab.querySelector('span');
      if (!span) return true;

      const dot = tab.querySelector('i');
      const cs = getComputedStyle(tab);
      const pad =
        (parseFloat(cs.paddingLeft) || 0) +
        (parseFloat(cs.paddingRight) || 0);
      const gap = dot ? (parseFloat(cs.gap) || 0) : 0;
      const dotW = dot ? dot.getBoundingClientRect().width : 0;
      const available = tab.getBoundingClientRect().width - pad - gap - dotW;

      /* 留 1px 安全余量，避免 Android 字体栅格化临界裁切。 */
      return span.scrollWidth <= available - 1;
    });
  }

  function fitRouteTabs() {
    if (running) return;
    running = true;

    requestAnimationFrame(() => {
      const tabs = [...document.querySelectorAll(TAB_SELECTOR)];
      const bar = document.querySelector('.commandbar');

      if (tabs.length !== 4 || !bar || bar.offsetWidth <= 0) {
        running = false;
        return;
      }

      /* 从 15px 开始寻找最大共同字号。
         四个按钮必须同时完整显示，任何一个被裁切就继续缩小。 */
      let lo = 9.5;
      let hi = 15.0;
      let best = lo;

      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        setSize(tabs, mid);
        void bar.offsetWidth;

        if (allFit(tabs)) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }

      /* 再留 0.15px 保险余量。 */
      best = Math.max(9.5, best - 0.15);
      setSize(tabs, best);

      running = false;
    });
  }

  function scheduleFit() {
    setTimeout(fitRouteTabs, 0);
    setTimeout(fitRouteTabs, 80);
    setTimeout(fitRouteTabs, 220);
    setTimeout(fitRouteTabs, 500);
  }

  document.addEventListener('DOMContentLoaded', scheduleFit, { once: true });
  window.addEventListener('load', scheduleFit, { once: true });
  window.addEventListener('resize', scheduleFit, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(scheduleFit, 120), { passive: true });
  document.addEventListener('fullscreenchange', scheduleFit);
  document.addEventListener('webkitfullscreenchange', scheduleFit);
  /* V164：不再 MutationObserver 监听 commandbar 的 style/class；
     这些变化本身就是布局脚本写入，观察它们会形成额外反馈开销。
     load/resize/orientation/fullscreen 已覆盖所有真正几何变化。 */
  scheduleFit();
})();
