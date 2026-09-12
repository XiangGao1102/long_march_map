
(() => {
  const root = document.documentElement;
  const mobile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|Mobile|MicroMessenger|QQ\//i.test(navigator.userAgent || '');
  if (!mobile) return;

  const nativeFs = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  const syncClass = () => root.classList.toggle('lm-pre-fullscreen', !nativeFs());
  syncClass();
  document.addEventListener('fullscreenchange', syncClass, { passive: true });
  document.addEventListener('webkitfullscreenchange', syncClass, { passive: true });
})();
