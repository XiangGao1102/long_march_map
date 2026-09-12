
(() => {
  const steps = [
    {
      title: "探索 3D 地图",
      lead: "自由观察真实地形，并从不同视角了解长征路线所经山河。",
      target: "map",
      items: {
        desktop: [["↻", "按住拖动", "旋转地图视角"], ["⌕", "滚轮滚动", "缩放三维地图"], ["↔", "右键拖动", "平移当前视野"]],
        touch: [["↻", "单指拖动", "旋转地图视角"], ["⌕", "双指捏合", "缩放三维地图"], ["↔", "双指拖动", "平移当前视野"]]
      }
    },
    {
      title: "展开长征资料",
      lead: "地图左侧汇集路线概览、历史节点和沙盘图层控制。",
      target: "#mobile-panel-toggle",
      items: {
        desktop: [["☰", "点击左侧“展开”", "打开长征资料面板"], ["◎", "查看历史节点", "了解时间、地点与事件档案"]],
        touch: [["☰", "点击左侧“展开”", "打开长征资料面板"], ["◎", "上下浏览资料", "了解时间、地点与事件档案"]]
      }
    },
    {
      title: "进入沉浸 2D 路线",
      lead: "顶部地图按钮可打开2D艺术地图，在歌声与实时歌词中重走十六站。",
      target: "#fullscreen-toggle",
      items: {
        desktop: [["▱", "点击沉浸式路线按钮", "进入左侧地图、右侧歌词界面"], ["♫", "跟随《山河回响》", "歌词、节点与地图同步联动"]],
        touch: [["▱", "点击沉浸式路线按钮", "进入横屏2D地图与歌词界面"], ["♫", "跟随《山河回响》", "歌词、节点与地图同步联动"]]
      }
    }
  ];

  let currentStep = 0;
  let layer = null;
  let focus = null;
  let card = null;
  let readyObserver = null;

  const isTouch = () => window.matchMedia?.("(hover: none), (pointer: coarse)")?.matches ?? false;

  const logicalViewport = () => ({
    width: window.__LONG_MARCH_VIEWPORT_WIDTH__?.() || innerWidth,
    height: window.__LONG_MARCH_VIEWPORT_HEIGHT__?.() || innerHeight,
  });

  function screenRectToLogical(rect) {
    if (!rect) return null;
    const convert = window.__LONG_MARCH_CLIENT_TO_LOGICAL__ || ((x, y) => ({ x, y }));
    const pts = [
      convert(rect.left, rect.top),
      convert(rect.right, rect.top),
      convert(rect.right, rect.bottom),
      convert(rect.left, rect.bottom),
    ];
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function getMapRect() {
    const scene = document.querySelector("#scene canvas") || document.querySelector("#scene") || document.querySelector("#app");
    const app = document.querySelector("#app");
    const header = document.querySelector(".commandbar");
    const playback = document.querySelector("#playback");
    const base = screenRectToLogical((scene || app).getBoundingClientRect());
    const appRect = screenRectToLogical((app || scene).getBoundingClientRect());
    const headerRect = header ? screenRectToLogical(header.getBoundingClientRect()) : null;
    const playbackRect = playback ? screenRectToLogical(playback.getBoundingClientRect()) : null;
    const top = Math.max(appRect.top + 18, headerRect?.bottom + 12 || base.top + 18);
    const bottomCandidate = playbackRect && playbackRect.top > top ? playbackRect.top - 12 : appRect.bottom - 18;
    const bottom = Math.min(appRect.bottom - 18, bottomCandidate);
    const left = Math.max(appRect.left + 18, base.left + base.width * .13);
    const right = Math.min(appRect.right - 18, base.right - base.width * .13);
    return { left, top, width: Math.max(160, right - left), height: Math.max(120, bottom - top) };
  }

  function getTargetRect(step) {
    if (step.target === "map") return getMapRect();
    let target = document.querySelector(step.target);
    let rect = target ? screenRectToLogical(target.getBoundingClientRect()) : null;
    if ((!rect || rect.width < 4 || rect.height < 4) && step.target === "#mobile-panel-toggle") {
      target = document.querySelector("#left-rail");
      rect = target ? screenRectToLogical(target.getBoundingClientRect()) : null;
    }
    if (!rect || rect.width < 4 || rect.height < 4) return getMapRect();
    const pad = step.target === "#fullscreen-toggle" ? 10 : 12;
    const viewport = logicalViewport();
    return {
      left: Math.max(6, rect.left - pad),
      top: Math.max(6, rect.top - pad),
      width: Math.min(viewport.width - 12, rect.width + pad * 2),
      height: Math.min(viewport.height - 12, rect.height + pad * 2)
    };
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function positionGuide() {
    if (!layer || layer.hidden || !focus || !card) return;
    const step = steps[currentStep];
    const rect = getTargetRect(step);
    Object.assign(focus.style, {
      left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
      borderRadius: step.target === "map" ? "24px" : "16px"
    });
    card.classList.toggle("is-centered", step.target === "map");
    card.style.removeProperty("transform");
    if (step.target === "map") {
      ["left", "top", "right", "bottom"].forEach((name) => card.style.removeProperty(name));
      return;
    }
    const physicalCardRect = card.getBoundingClientRect();
    const cardRect = screenRectToLogical(physicalCardRect) || physicalCardRect;
    const viewport = logicalViewport();
    let left;
    let top;
    if (step.target === "#mobile-panel-toggle") {
      left = rect.left + rect.width + 24;
      if (left + cardRect.width > viewport.width - 14) left = viewport.width - cardRect.width - 14;
      top = rect.top + rect.height / 2 - cardRect.height / 2;
    } else {
      left = rect.left + rect.width / 2 - cardRect.width / 2;
      top = rect.top + rect.height + 18;
      if (top + cardRect.height > viewport.height - 14) top = rect.top - cardRect.height - 18;
    }
    card.style.left = `${clamp(left, 14, viewport.width - cardRect.width - 14)}px`;
    card.style.top = `${clamp(top, 14, viewport.height - cardRect.height - 14)}px`;
  }

  function itemMarkup(item) {
    return `<div class="lm-guide-card__item"><span class="lm-guide-card__icon" aria-hidden="true">${item[0]}</span><span><strong>${item[1]}</strong><small>${item[2]}</small></span></div>`;
  }

  function renderStep() {
    const step = steps[currentStep];
    const items = step.items[isTouch() ? "touch" : "desktop"];
    card.innerHTML = `
      <div class="lm-guide-card__eyebrow"><span>初次探索指引</span><span>${currentStep + 1} / ${steps.length}</span></div>
      <h2 id="lm-guide-title">${step.title}</h2>
      <p class="lm-guide-card__lead">${step.lead}</p>
      <div class="lm-guide-card__items">${items.map(itemMarkup).join("")}</div>
      <div class="lm-guide-card__footer">
        <div class="lm-guide-card__dots" aria-hidden="true">${steps.map((_, index) => `<i class="lm-guide-card__dot${index === currentStep ? " is-active" : ""}"></i>`).join("")}</div>
        <button class="lm-guide-card__ack" type="button" aria-label="${currentStep === steps.length - 1 ? "我知道了，开始自动播放中央红军路线" : "我知道了，查看下一条操作提示"}">我知道了&nbsp; →</button>
      </div>`;
    card.querySelector(".lm-guide-card__ack").addEventListener("click", advanceGuide, { once: true });
    requestAnimationFrame(() => {
      positionGuide();
      card.querySelector(".lm-guide-card__ack")?.focus({ preventScroll: true });
    });
  }

  function beginCentralRoute() {
    const centralTab = document.querySelector('.route-tab[data-route="central"]');
    if (centralTab && !centralTab.classList.contains("is-active")) centralTab.click();
    const routeToggle = document.querySelector("#route-toggle");
    if (!routeToggle || routeToggle.disabled) return;
    const copy = routeToggle.querySelector("span")?.textContent || "";
    if (!copy.includes("隐藏")) routeToggle.click();
  }

  function finishGuide() {
    document.body.classList.remove("lm-onboarding-active");
    layer.classList.add("is-leaving");
    beginCentralRoute();
    window.setTimeout(() => {
      layer.hidden = true;
      layer.classList.remove("is-leaving");
    }, 250);
  }

  function advanceGuide() {
    if (currentStep < steps.length - 1) {
      currentStep += 1;
      renderStep();
    } else {
      finishGuide();
    }
  }

  function showGuide() {
    if (layer && !layer.hidden) return;
    document.body.classList.add("lm-onboarding-active");
    currentStep = 0;
    layer.hidden = false;
    layer.classList.remove("is-leaving");
    renderStep();
  }

  function buildGuide() {
    layer = document.createElement("div");
    layer.id = "lm-three-step-guide";
    layer.hidden = true;
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-modal", "true");
    layer.setAttribute("aria-labelledby", "lm-guide-title");
    layer.innerHTML = '<div class="lm-guide-focus" aria-hidden="true"></div><section class="lm-guide-card"></section>';
    const app = document.querySelector("#app");
    (app || document.body).appendChild(layer);
    focus = layer.querySelector(".lm-guide-focus");
    card = layer.querySelector(".lm-guide-card");
  }

  function readyToGuide() {
    const routeToggle = document.querySelector("#route-toggle");
    const loading = document.querySelector("#loading");
    return Boolean(routeToggle && !routeToggle.disabled && (!loading || loading.classList.contains("is-hidden")));
  }

  function maybeShowGuide() {
    if (!readyToGuide()) return;
    readyObserver?.disconnect();
    readyObserver = null;
    showGuide();
  }

  buildGuide();
  const observed = [document.querySelector("#route-toggle"), document.querySelector("#loading")].filter(Boolean);
  readyObserver = new MutationObserver(maybeShowGuide);
  observed.forEach((element) => readyObserver.observe(element, { attributes: true, attributeFilter: ["disabled", "class"] }));
  window.addEventListener("resize", positionGuide, { passive: true });
  window.addEventListener("orientationchange", () => requestAnimationFrame(positionGuide), { passive: true });
  window.addEventListener("load", maybeShowGuide, { once: true });
  maybeShowGuide();
})();
