
document.addEventListener("DOMContentLoaded", () => {
  const nodes = document.querySelectorAll(
    "button, [role='button'], .text-button, .tool-button, .side-tab, .drawer-tab, span, b"
  );
  for (const el of nodes) {
    if ((el.textContent || "").trim() === "展开") {
      const control =
        el.closest("button, [role='button'], .text-button, .tool-button, .side-tab, .drawer-tab") || el;
      control.classList.add("v89-nav-expand-control");
      break;
    }
  }
});
