
document.addEventListener("DOMContentLoaded", () => {
  const candidates = document.querySelectorAll("button, [role='button'], .text-button, .tool-button, .side-tab, .drawer-tab, span, b");
  for (const el of candidates) {
    if ((el.textContent || "").trim() === "展开") {
      /* 优先放大真正可点击的父控件，使文字和图标一起变大 */
      const control = el.closest("button, [role='button'], .text-button, .tool-button, .side-tab, .drawer-tab") || el;
      control.classList.add("v86-nav-expand-control");
      break;
    }
  }
});
