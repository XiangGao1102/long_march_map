
(() => {
  const clear = () => {
    const toggle = document.getElementById("mobile-panel-toggle");
    if (!toggle) return;
    /* 旧脚本若写过 inline left/top/translate，会压过常规样式；清掉后交给 V150 CSS。 */
    toggle.style.removeProperty("left");
    toggle.style.removeProperty("right");
    toggle.style.removeProperty("top");
    toggle.style.removeProperty("bottom");
    toggle.style.removeProperty("translate");
  };

  document.addEventListener("DOMContentLoaded", clear, { once: true });
  window.addEventListener("load", clear, { once: true });
  window.addEventListener("orientationchange", () => setTimeout(clear, 80), { passive: true });
  document.addEventListener("fullscreenchange", () => setTimeout(clear, 50));

  document.addEventListener("click", (event) => {
    if (
      event.target?.closest?.("#mobile-panel-toggle") ||
      event.target?.closest?.(".mobile-panel-close") ||
      event.target?.closest?.(".mobile-panel-backdrop")
    ) {
      setTimeout(clear, 30);
    }
  }, true);
})();
