
(() => {
  /* V140：禁止任何后续 JS 再给“展开”按钮写屏幕坐标。
     只清掉旧 inline 残留；位置完全由统一逻辑 CSS 决定。 */
  const clear = () => {
    const toggle = document.getElementById("mobile-panel-toggle");
    if (!toggle) return;
    toggle.style.removeProperty("left");
    toggle.style.removeProperty("right");
    toggle.style.removeProperty("top");
    toggle.style.removeProperty("bottom");
    toggle.style.removeProperty("translate");
  };

  document.addEventListener("DOMContentLoaded", clear, { once: true });
  window.addEventListener("load", clear, { once: true });

  document.addEventListener("click", (event) => {
    if (
      event.target?.closest?.("#mobile-panel-toggle") ||
      event.target?.closest?.(".mobile-panel-close") ||
      event.target?.closest?.(".mobile-panel-backdrop")
    ) {
      setTimeout(clear, 50);
    }
  }, true);
})();
