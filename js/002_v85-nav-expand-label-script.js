
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button, [role='button'], .text-button, span, b").forEach((el) => {
    if ((el.textContent || "").trim() === "展开导航栏") {
      el.classList.add("v85-nav-expand-label");
    }
  });
});
