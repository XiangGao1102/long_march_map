
/* V62 — GitHub Pages / CSS-rotated portrait fallback:
   the app is visually rotated 90deg, so a visual vertical swipe arrives as
   physical clientX movement. Convert that axis into scrollTop only inside
   the left rail. Native-landscape behavior remains untouched. */
(() => {
  const rail = document.querySelector('.left-rail');
  if (!rail) return;

  let gesture = null;

  const cssRotated = () => document.documentElement.classList.contains('force-css-landscape');

  const pickScrollTarget = () => {
    // V63: CSS-rotated mode uses ONE scroll container only.
    // The expanded node list is made fully open by CSS below, so all nodes
    // belong to the left rail's scrollHeight instead of creating a nested
    // scroll area that can stop around node 14 on mobile browsers.
    return rail;
  };

  rail.addEventListener('touchstart', (event) => {
    if (!cssRotated() || event.touches.length !== 1) {
      gesture = null;
      return;
    }
    const touch = event.touches[0];
    const scroller = pickScrollTarget(event.target);
    gesture = {
      startX: touch.clientX,
      startY: touch.clientY,
      startedAt: performance.now(),
      startScrollTop: scroller.scrollTop,
      scroller,
      active: false,
      fromStrength: Boolean(event.target.closest?.('#hydro-strength, #mountain-strength')),
    };
  }, { capture: true, passive: true });

  rail.addEventListener('touchmove', (event) => {
    if (!gesture || !cssRotated() || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;
    const visualDx = dy;
    const visualDy = -dx;

    /* 滑杆优先接收普通拖动；大幅或快速左划继续交给原资料栏收起手势。 */
    if (gesture.fromStrength) return;
    const elapsed = Math.max(1, performance.now() - gesture.startedAt);
    const closingVelocity = Math.max(0, -visualDx) / elapsed;
    const closeIntent =
      visualDx < 0 &&
      Math.abs(visualDx) > Math.abs(visualDy) * 1.03 &&
      Math.abs(visualDx) >= 36 &&
      (closingVelocity > .16 || Math.abs(visualDx) >= 52);
    if (closeIntent) return;

    // With rotate(90deg), local vertical motion maps to the physical X axis.
    if (!gesture.active) {
      if (Math.abs(dx) < 5) return;
      if (Math.abs(dx) <= Math.abs(dy) * 0.7) return;
      gesture.active = true;
    }

    const scroller = gesture.scroller;
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTop = Math.max(0, Math.min(maxScroll, gesture.startScrollTop + dx));

    // Prevent the old portrait swipe-close handler and browser edge gesture
    // from stealing this visual vertical scroll.
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true, passive: false });

  const finish = () => { gesture = null; };
  rail.addEventListener('touchend', finish, { capture: true, passive: true });
  rail.addEventListener('touchcancel', finish, { capture: true, passive: true });
})();
