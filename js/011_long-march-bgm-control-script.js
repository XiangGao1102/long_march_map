
(() => {
  const audio = document.getElementById('long-march-bgm');
  const button = document.getElementById('long-march-bgm-toggle');
  const audioData = document.getElementById('long-march-bgm-data');
  if (!audio || !button || !audioData) return;

  const mapFullscreenButton = document.getElementById('fullscreen-toggle');
  const pageFullscreenButton = document.getElementById('page-fullscreen-toggle');
  const actionGroup = document.querySelector('.commandbar__actions');
  if (pageFullscreenButton) {
    pageFullscreenButton.before(button);
  } else if (mapFullscreenButton) {
    mapFullscreenButton.after(button);
  } else if (actionGroup) {
    actionGroup.append(button);
  }

  audio.loop = true;
  audio.volume = 0.5;
  audio.autoplay = true;
  audio.playsInline = true;
  audio.setAttribute('webkit-playsinline', '');

  let audioObjectUrl = "";
  let encodedAudio = "";
  try {
    const audioConfig = JSON.parse(audioData.textContent || "{}");
    if (audioConfig.src && audio) {
      audio.src = audioConfig.src;
      audio.load();
    }
  } catch (_) {}
const syncButton = () => {
    const soundEnabled = !audio.paused && !audio.muted;
    button.classList.toggle('is-muted', !soundEnabled);
    button.setAttribute('aria-pressed', String(soundEnabled));
    button.setAttribute('aria-label', soundEnabled ? '静音背景音乐' : '开启背景音乐');
    button.title = soundEnabled ? '静音背景音乐' : '开启背景音乐';
  };

  let userMuted = false;
  const startPlayback = async () => {
    if (userMuted) return false;
    audio.muted = false;
    audio.defaultMuted = false;
    try {
      await audio.play();
    } catch (_) {
      // Browsers may block sound until the first user interaction.
    }
    syncButton();
    return !audio.paused;
  };

  const toggleSound = async () => {
    if (audio.paused) {
      userMuted = false;
      await startPlayback();
    } else if (audio.muted) {
      userMuted = false;
      audio.muted = false;
      await audio.play().catch(() => {});
      syncButton();
    } else {
      userMuted = true;
      audio.muted = true;
      syncButton();
    }
  };

  let lastGestureToggleAt = 0;
  const unlockPlayback = (event) => {
    const soundButtonTouched = event.target && event.target.closest && event.target.closest('#long-march-bgm-toggle');
    if (soundButtonTouched) {
      if (event.type === 'keydown') return;
      lastGestureToggleAt = Date.now();
      toggleSound();
      return;
    }
    if (userMuted || !audio.paused) return;
    startPlayback().then(() => {
      if (!audio.paused) {
        window.removeEventListener(gestureEvent, unlockPlayback, true);
        window.removeEventListener('keydown', unlockPlayback, true);
      }
    });
  };

  const gestureEvent = 'PointerEvent' in window ? 'pointerdown' : 'touchstart';

  button.addEventListener('click', (event) => {
    // Pointer/touch activation is handled earlier on window capture so Android
    // browsers cannot lose the media gesture to the page's map handlers.
    // Some Chrome builds synthesize click with detail=0; use timing to prevent
    // the same physical press from toggling mute twice.
    if (Date.now() - lastGestureToggleAt < 800) return;
    toggleSound();
  });

  audio.addEventListener('play', syncButton);
  audio.addEventListener('pause', syncButton);
  audio.addEventListener('volumechange', syncButton);
  window.addEventListener(gestureEvent, unlockPlayback, { capture: true, passive: true });
  window.addEventListener('keydown', unlockPlayback, true);
  window.addEventListener('beforeunload', () => {
    if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
  }, { once: true });

  startPlayback();
})();
