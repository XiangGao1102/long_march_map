
(() => {
  const detail = document.getElementById('node-detail');
  const scroller = detail?.querySelector('.node-detail__scroll');
  const title = detail?.querySelector('h2');
  if (!detail || !scroller || !title) return;

  let lastTitle = title.textContent || '';
  const resetToTop = () => {
    scroller.scrollTop = 0;
    // 图片/相册 DOM 可能在标题之后一帧更新，再补两次归零，保证默认从最上方图片开始。
    requestAnimationFrame(() => {
      scroller.scrollTop = 0;
      requestAnimationFrame(() => { scroller.scrollTop = 0; });
    });
    setTimeout(() => { scroller.scrollTop = 0; }, 80);
  };

  const observer = new MutationObserver(() => {
    const now = title.textContent || '';
    if (now !== lastTitle) {
      lastTitle = now;
      resetToTop();
    }
  });
  observer.observe(title, { childList: true, characterData: true, subtree: true });

  // 节点卡片从隐藏变可见时也从顶部开始；同一节点图片预览关闭不触发标题变化，因此不会破坏预览返回位置。
  let wasVisible = detail.classList.contains('is-visible');
  const classObserver = new MutationObserver(() => {
    const visible = detail.classList.contains('is-visible');
    if (visible && !wasVisible) resetToTop();
    wasVisible = visible;
  });
  classObserver.observe(detail, { attributes: true, attributeFilter: ['class'] });
})();
