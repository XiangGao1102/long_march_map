
(() => {
  const app = document.getElementById('app');
  const getBar = () => document.querySelector('.commandbar');
  let raf = 0;
  let settleTimer = 0;
  let lastSignature = '';

  const rect = el => el ? el.getBoundingClientRect() : null;
  const px = n => `${Math.round(n * 100) / 100}px`;

  function setVar(bar, name, value) {
    if (bar.style.getPropertyValue(name) !== value) bar.style.setProperty(name, value);
  }

  function setMode(bar, mode) {
    const fit = mode === 'fit';
    if (bar.classList.contains('v76-fit') !== fit ||
        bar.classList.contains('v76-stack') === fit) {
      bar.classList.toggle('v76-fit', fit);
      bar.classList.toggle('v76-stack', !fit);
    }
  }

  function tabTextFits(bar) {
    const tabs = [...bar.querySelectorAll('.route-tab')];
    return tabs.every(tab => {
      const span = tab.querySelector('span');
      if (!span) return true;
      const dot = tab.querySelector('i');
      const cs = getComputedStyle(tab);
      const pad = parseFloat(cs.paddingLeft || 0) + parseFloat(cs.paddingRight || 0);
      const gap = parseFloat(cs.gap || 0);
      const dotW = dot ? dot.getBoundingClientRect().width : 0;
      const available = tab.getBoundingClientRect().width - pad - dotW - (dot ? gap : 0);
      return span.scrollWidth <= available + 0.75;
    });
  }

  function titleFits(bar) {
    const title = bar.querySelector('.brand-lockup h1');
    return !title || title.scrollWidth <= title.clientWidth + 0.75;
  }

  function zonesSafe(bar) {
    const brand = rect(bar.querySelector('.brand-lockup'));
    const route = rect(bar.querySelector('.route-switch'));
    const actions = rect(bar.querySelector('.commandbar__actions'));
    if (!brand || !route || !actions) return true;
    return (route.left - brand.right >= 1.5) && (actions.left - route.right >= 1.5);
  }

  function oneRowFits(bar) {
    return titleFits(bar) && tabTextFits(bar) && zonesSafe(bar);
  }

  function firstRowFitsStack(bar) {
    const brand = rect(bar.querySelector('.brand-lockup'));
    const actions = rect(bar.querySelector('.commandbar__actions'));
    return !!brand && !!actions && actions.left - brand.right >= 1.5;
  }

  function chooseBaseVars(bar, w) {
    const brandCol = Math.max(190, Math.min(330, w * 0.255));
    // 主标题优先：在常见横屏手机上保持 20–24px，始终高于按钮字号上限。
    const titleFont = Math.max(19, Math.min(24, w / 44));
    const stackTitleFont = Math.max(18, Math.min(22, w / 42));
    setVar(bar, '--v76-brand-col', px(brandCol));
    setVar(bar, '--v76-title-font', px(titleFont));
    setVar(bar, '--v76-stack-title-font', px(stackTitleFont));
    setVar(bar, '--v76-gap', w < 1000 ? '4px' : '6px');
    setVar(bar, '--v76-brand-gap', w < 900 ? '5px' : '7px');
    setVar(bar, '--v76-route-pad', w < 1000 ? '2px' : '3px');
    setVar(bar, '--v76-route-gap', '2px');
    setVar(bar, '--v76-action-gap', w < 900 ? '3px' : '5px');
    setVar(bar, '--v76-star', w < 900 ? '32px' : '34px');
  }

  /* 在真实 DOM 中找最大可用字号。路线标签和“生成路线”共用 --v76-ui-font。 */
  function maximizeFont(bar, mode) {
    let lo = 10;
    let hi = 15;
    let best = 10;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      setVar(bar, '--v76-ui-font', px(mid));
      // 强制同步布局读取；这里只在 resize/方向变化后的单次收敛里运行。
      void bar.offsetWidth;
      const ok = mode === 'fit'
        ? oneRowFits(bar)
        : (tabTextFits(bar) && firstRowFitsStack(bar));
      if (ok) { best = mid; lo = mid; } else { hi = mid; }
    }
    // 留 0.2px 安全余量，避免不同 Android 字体栅格化在临界点抖动。
    best = Math.max(10, best - 0.2);
    setVar(bar, '--v76-ui-font', px(best));

    // 视觉层级硬约束：主标题至少比按钮文字大 3px。
    const titleVar = mode === 'fit' ? '--v76-title-font' : '--v76-stack-title-font';
    const currentTitle = parseFloat(bar.style.getPropertyValue(titleVar)) || (mode === 'fit' ? 21 : 19);
    if (currentTitle < best + 3) {
      setVar(bar, titleVar, px(best + 3));
    }
    return best;
  }

  function layoutNow() {
    raf = 0;
    const bar = getBar();
    if (!bar || !app || app.classList.contains('is-map-focus')) return;

    const br = bar.getBoundingClientRect();
    const w = br.width || window.innerWidth || 1;
    chooseBaseVars(bar, w);

    // 先尝试一行，且从最大字号向下寻找可容纳值。
    setMode(bar, 'fit');
    maximizeFont(bar, 'fit');
    void bar.offsetWidth;

    // 只在一行确实无法同时完整显示标题、路线文本和按钮时切到两行。
    if (!oneRowFits(bar)) {
      setMode(bar, 'stack');
      maximizeFont(bar, 'stack');

      // 极端窄屏时优先完整保留文字，不允许第一行互相覆盖。
      if (!firstRowFitsStack(bar)) {
        const title = bar.querySelector('.brand-lockup h1');
        if (title) {
          let tf = parseFloat(getComputedStyle(title).fontSize) || 18;
          while (tf > 12 && !firstRowFitsStack(bar)) {
            tf -= 0.5;
            setVar(bar, '--v76-stack-title-font', px(tf));
            void bar.offsetWidth;
          }
        }
      }
    }

    lastSignature = [
      Math.round(w),
      Math.round(window.visualViewport?.height || window.innerHeight || 0),
      app.className,
      bar.classList.contains('v76-stack') ? 's' : 'f'
    ].join('|');
  }

  function scheduleStableLayout(delay = 0) {
    clearTimeout(settleTimer);
    if (delay) {
      settleTimer = setTimeout(() => scheduleStableLayout(0), delay);
      return;
    }
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(layoutNow);
  }

  // 初始化与真正会改变可用视口的事件。
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleStableLayout(), { once: true });
  } else {
    scheduleStableLayout();
  }
  window.addEventListener('load', () => scheduleStableLayout(40), { once: true });
  window.addEventListener('orientationchange', () => scheduleStableLayout(120), { passive: true });
  document.addEventListener('fullscreenchange', () => scheduleStableLayout(80));
  document.addEventListener('webkitfullscreenchange', () => scheduleStableLayout(80));
  document.fonts?.ready?.then(() => scheduleStableLayout(20)).catch?.(() => {});

  // 普通 resize / visualViewport.resize 在非全屏移动浏览器中可能高频触发。
  // 仅当“宽度”真正变化时重排；地址栏上下伸缩只改变高度，不再触发顶栏反复切换。
  let lastViewportWidth = Math.round(window.visualViewport?.width || window.innerWidth || 0);
  function onViewportResize() {
    const nowW = Math.round(window.visualViewport?.width || window.innerWidth || 0);
    if (Math.abs(nowW - lastViewportWidth) >= 2) {
      lastViewportWidth = nowW;
      scheduleStableLayout(80);
    }
  }
  window.addEventListener('resize', onViewportResize, { passive: true });
  window.visualViewport?.addEventListener('resize', onViewportResize, { passive: true });

  // 只观察 app 的模式切换，不观察 commandbar 本身，避免“自己改尺寸 → observer → 再改”的反馈循环。
  const mo = new MutationObserver(() => scheduleStableLayout(40));
  if (app) mo.observe(app, { attributes: true, attributeFilter: ['class'] });
})();
