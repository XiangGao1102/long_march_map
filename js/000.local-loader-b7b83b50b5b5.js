(() => {
  if (location.protocol !== "file:") return;
  const source = new URL("000.local-textures-6c4baa817ae8.js", document.currentScript.src).href;
  document.write('<script src="' + source + '"></scr' + 'ipt>');
})();
