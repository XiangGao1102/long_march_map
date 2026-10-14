
(() => {
  const detail = document.getElementById('node-detail');
  const scroller = detail?.querySelector('.node-detail__scroll');
  if (!detail || !scroller) return;
  // 阻止地图/全局滑动手势抢走节点正文的滚动，但不阻止浏览器原生滚动。
  ['pointerdown','pointermove','touchstart','touchmove','wheel'].forEach(type => {
    scroller.addEventListener(type, e => e.stopPropagation(), { passive: type !== 'wheel' });
  });
  const resync = () => {
    scroller.style.overflowY = 'auto';
    scroller.style.webkitOverflowScrolling = 'touch';
  };
  document.addEventListener('fullscreenchange', () => setTimeout(resync, 60), { passive: true });
  document.addEventListener('webkitfullscreenchange', () => setTimeout(resync, 60), { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(resync), { passive: true });
  resync();
})();
