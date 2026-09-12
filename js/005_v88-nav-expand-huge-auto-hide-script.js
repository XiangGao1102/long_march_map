
(() => {
  /* V164：原版这里观察整个 documentElement 子树，并在每次 class/style/childList
     变化时扫描大量 DOM + 读取 body.innerText。Three.js H5 长时间运行时会造成
     极高主线程负担。现在改成只读取真正的导航栏/按钮状态，且仅在相关事件发生时同步。 */

  let control = null;
  const findControl = () => {
    if (control?.isConnected) return control;
    control = document.getElementById("mobile-panel-toggle");
    if (!control) {
      const nodes = document.querySelectorAll("button, [role='button']");
      control = [...nodes].find((el) => (el.textContent || "").trim() === "展开") || null;
    }
    control?.classList.add("v88-nav-expand-control");
    return control;
  };

  const sync = () => {
    const btn = findControl();
    const rail = document.querySelector(".left-rail");
    const open = Boolean(
      rail?.classList.contains("is-mobile-open") ||
      btn?.classList.contains("is-open") ||
      btn?.getAttribute("aria-expanded") === "true"
    );
    document.documentElement.classList.toggle("v88-nav-open", open);
  };

  const schedule = () => requestAnimationFrame(sync);

  document.addEventListener("DOMContentLoaded", () => {
    findControl();
    sync();

    document.addEventListener("click", (event) => {
      if (
        event.target?.closest?.("#mobile-panel-toggle") ||
        event.target?.closest?.(".mobile-panel-close") ||
        event.target?.closest?.(".mobile-panel-backdrop")
      ) {
        schedule();
        setTimeout(sync, 80);
      }
    }, true);

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(sync, 100), { passive: true });
  }, { once: true });
})();
