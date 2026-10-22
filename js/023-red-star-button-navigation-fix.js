/* External page navigation disabled. Keep the button inert if present. */
(function () {
  'use strict';
  function disable() {
    var link = document.getElementById('red-star-china-link');
    if (!link) return;
    link.removeAttribute('href');
    link.removeAttribute('target');
    link.removeAttribute('rel');
    link.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', disable, { once: true });
  else disable();
})();
