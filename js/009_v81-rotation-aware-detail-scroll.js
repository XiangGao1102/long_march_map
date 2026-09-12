
(() => {
  const detail = document.getElementById('node-detail');
  const scroller = detail?.querySelector('.node-detail__scroll');
  if (!detail || !scroller) return;

  let active = false;
  let pointerId = null;
  let lastX = 0;
  let lastY = 0;

  const cssRotated = () => document.documentElement.classList.contains('force-css-landscape');

  function begin(x, y, id = null) {
    active = true;
    pointerId = id;
    lastX = x;
    lastY = y;
  }

  function drag(x, y, ev) {
    if (!active) return;
    const dx = x - lastX;
    const dy = y - lastY;
    lastX = x;
    lastY = y;

    /* CSS 顺时针旋转 90° 后，视觉纵轴对应物理 X 轴。
       原生横屏/未旋转时，仍按普通物理 Y 轴滚动。 */
    const delta = cssRotated() ? dx : -dy;
    if (Math.abs(delta) > 0.1) {
      scroller.scrollTop += delta;
      ev?.preventDefault?.();
      ev?.stopPropagation?.();
    }
  }

  function end() {
    active = false;
    pointerId = null;
  }

  // 优先 Pointer Events；在旧 WebView/Safari 中同时保留 touch 兜底。
  scroller.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    begin(e.clientX, e.clientY, e.pointerId);
    try { scroller.setPointerCapture?.(e.pointerId); } catch (_) {}
    e.stopPropagation();
  }, { passive: true });

  scroller.addEventListener('pointermove', e => {
    if (!active || (pointerId !== null && e.pointerId !== pointerId)) return;
    drag(e.clientX, e.clientY, e);
  }, { passive: false });

  ['pointerup','pointercancel','lostpointercapture'].forEach(type => {
    scroller.addEventListener(type, end, { passive: true });
  });

  scroller.addEventListener('touchstart', e => {
    if (typeof PointerEvent !== 'undefined') return;
    const t = e.touches[0];
    if (t) begin(t.clientX, t.clientY);
    e.stopPropagation();
  }, { passive: true });

  scroller.addEventListener('touchmove', e => {
    if (typeof PointerEvent !== 'undefined') return;
    const t = e.touches[0];
    if (t) drag(t.clientX, t.clientY, e);
  }, { passive: false });

  scroller.addEventListener('touchend', end, { passive: true });
  scroller.addEventListener('touchcancel', end, { passive: true });

  // 桌面鼠标滚轮/触控板继续正常工作。
  scroller.addEventListener('wheel', e => {
    e.stopPropagation();
  }, { passive: true });

  // 每次打开新节点时从顶部开始，确保全文滚动范围正确。
  const obs = new MutationObserver(() => {
    if (detail.classList.contains('is-visible')) {
      requestAnimationFrame(() => {
        scroller.style.overflowY = 'auto';
      });
    }
  });
  obs.observe(detail, { attributes: true, attributeFilter: ['class'] });
})();
