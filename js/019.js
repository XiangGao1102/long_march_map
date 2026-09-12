
(() => {
  "use strict";

  const MAP_ASPECT = 6528 / 3856;
  const SUNO_URL = "https://suno.com/s/K6lON4q8gIygKSWJ";
  const FALLBACK_DURATION = 146.1335;

  // Absolute vocal-entry timestamps aligned to the supplied 146.1335s vocal master.
  // The 8.06s instrumental prelude intentionally has no active lyric or node.
  // x/y are percentages on the supplied 6528 x 3856 map artwork.
  const cues = [
    { title: "瑞金出发", region: "江西·瑞金", x: 75.6, y: 66.1, start: 8.06, zoom: 1.48, lyric: "于都灯火，照亮长夜。" },
    { title: "血战湘江", region: "广西·兴安", x: 64.9, y: 71.3, start: 15.45, zoom: 1.52, lyric: "湘江激战，热血不息。" },
    { title: "通道会议", region: "湖南·通道", x: 65.0, y: 51.9, start: 22.84, zoom: 1.55, lyric: "通道灯下，决定西行。" },
    { title: "黎平会议", region: "贵州·黎平", x: 55.5, y: 63.3, start: 30.24, zoom: 1.54, lyric: "黎平天明，前路渐明。" },
    { title: "强渡乌江", region: "贵州·江界河", x: 44.3, y: 62.0, start: 37.63, zoom: 1.55, lyric: "竹船破浪，渡过乌江。" },
    { title: "遵义会议", region: "贵州·遵义", x: 51.8, y: 47.5, start: 45.02, zoom: 1.56, lyric: "遵义灯下，定下方向。" },
    { title: "四渡赤水", region: "川黔边·赤水河", x: 39.8, y: 55.8, start: 52.41, zoom: 1.53, lyric: "四渡赤水，冲出重围。" },
    { title: "巧渡金沙江", region: "云南·皎平渡", x: 15.3, y: 70.0, start: 59.80, zoom: 1.47, lyric: "巧渡金沙，静夜前行。" },
    { title: "强渡大渡河", region: "四川·安顺场", x: 22.2, y: 59.7, start: 67.20, zoom: 1.50, lyric: "大渡河上，勇士向前。" },
    { title: "飞夺泸定桥", region: "四川·泸定", x: 14.7, y: 46.7, start: 74.59, zoom: 1.51, lyric: "铁桥之上，烈火冲天。" },
    { title: "翻越雪山", region: "川西·夹金山", x: 17.2, y: 28.5, start: 81.98, zoom: 1.48, lyric: "翻过雪山，迎风向前。" },
    { title: "穿越草地", region: "川西北·若尔盖", x: 28.3, y: 17.9, start: 89.37, zoom: 1.50, lyric: "走出草地，再见青山。" },
    { title: "激战腊子口", region: "甘肃·迭部", x: 50.6, y: 20.0, start: 96.77, zoom: 1.56, lyric: "绝壁关前，勇士向上。" },
    { title: "到达吴起镇", region: "陕西·吴起", x: 62.0, y: 10.4, start: 104.16, zoom: 1.52, lyric: "到达吴起，红旗高扬。" },
    { title: "直罗镇战役", region: "陕西·富县", x: 67.1, y: 24.6, start: 111.55, zoom: 1.53, lyric: "直罗一战，山河回响。" },
    { title: "会宁大会师", region: "甘肃·会宁", x: 39.8, y: 18.2, start: 118.94, zoom: 1.50, lyric: "三军会宁，万里同心。" }
  ];
  const finale = { title: "万水千山，迎来黎明！", start: 126.34, lyric: "万水千山，迎来黎明！", finale: true };
  const timeline = [...cues, finale];

  const state = {
    open: false,
    active: -1,
    base: { left: 0, top: 0, width: 0, height: 0 },
    view: { scale: 1, tx: 0, ty: 0 },
    drag: null,
    raf: 0,
    backgroundWasPaused: true,
    userSeeking: false,
    pointerFrame: 0,
    pendingPointer: null,
    releaseTimer: 0
  };

  const ready = (fn) => document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", fn, { once: true })
    : fn();

  ready(() => {
    const originalTrigger = document.querySelector("#fullscreen-toggle");
    if (!originalTrigger) return;

    // The baseline binds this control to its legacy 3D map-focus mode. Replacing
    // only this DOM node removes that one listener while preserving the complete
    // baseline application and the button's original appearance and position.
    const trigger = originalTrigger.cloneNode(true);
    originalTrigger.replaceWith(trigger);

    const root = buildExperience();
    const backgroundAudio = document.querySelector("#long-march-bgm");
    const audio = root.querySelector("#immersive-long-march-song");
    const mapImage = root.querySelector(".im-map-image");
    const viewport = root.querySelector(".im-map-viewport");
    const canvas = root.querySelector(".im-map-canvas");
    const sceneCard = root.querySelector(".im-scene-card");
    const sceneStep = root.querySelector(".im-scene-card__step");
    const sceneTitle = root.querySelector(".im-scene-card__title");
    const sceneRegion = root.querySelector(".im-scene-card__region");
    const lyrics = [...root.querySelectorAll(".im-lyric")];
    const lyricScroller = root.querySelector(".im-lyrics-scroll");
    const markers = [...root.querySelectorAll(".im-marker")];
    const playButton = root.querySelector(".im-play");
    const progress = root.querySelector(".im-progress");
    const timeLabel = root.querySelector(".im-player__time");
    const playerCaption = root.querySelector(".im-player__caption");
    const lyricChars = lyrics.map((item) => [...item.querySelectorAll(".im-char")]);

    trigger.disabled = false;
    trigger.dataset.immersiveMap = "ready";
    trigger.setAttribute("aria-label", "打开沉浸式长征地图");
    trigger.title = "沉浸式长征地图";

    // Keep the two soundtracks mutually exclusive even if the baseline player
    // tries to resume its BGM while the immersive experience is open.
    const enforceExclusivePlayback = () => {
      if (state.open && backgroundAudio && !backgroundAudio.paused) backgroundAudio.pause();
    };
    backgroundAudio?.addEventListener("play", enforceExclusivePlayback);

    const getDuration = () => Number.isFinite(audio?.duration) && audio.duration > 1
      ? audio.duration
      : FALLBACK_DURATION;

    let immersiveAudioObjectUrl = "";
    let pendingSeekTime = null;
    let seekListenerAttached = false;
    let wantsPlayback = false;

    // Android system browsers and some third-party WebViews do not reliably
    // support seeking or playback from a large data: audio URL. Convert the
    // embedded MP3 to a local Blob URL once, while keeping ordinary file paths
    // unchanged for the folder-based build.
    const ensureAudioSource = () => {
      if (!audio) return false;
      if (audio.getAttribute("src")) return true;
      const source = audio.dataset.src || "";
      if (!source) return false;
      let resolvedSource = source;

      if (source.startsWith("data:audio/") && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        try {
          const comma = source.indexOf(",");
          const header = source.slice(0, comma);
          const mime = /^data:([^;,]+)/.exec(header)?.[1] || "audio/mpeg";
          const binary = atob(source.slice(comma + 1));
          const chunks = [];
          const chunkSize = 512 * 1024;
          for (let offset = 0; offset < binary.length; offset += chunkSize) {
            const slice = binary.slice(offset, offset + chunkSize);
            const bytes = new Uint8Array(slice.length);
            for (let index = 0; index < slice.length; index += 1) bytes[index] = slice.charCodeAt(index);
            chunks.push(bytes);
          }
          immersiveAudioObjectUrl = URL.createObjectURL(new Blob(chunks, { type: mime }));
          resolvedSource = immersiveAudioObjectUrl;
          root.dataset.audioTransport = "blob";
        } catch (_) {
          root.dataset.audioTransport = "data";
        }
      } else {
        root.dataset.audioTransport = source.startsWith("data:") ? "data" : "file";
      }

      audio.src = resolvedSource;
      audio.removeAttribute("data-src");
      audio.preload = "auto";
      audio.load();
      return true;
    };

    const applyPendingSeek = () => {
      if (!audio || pendingSeekTime === null || audio.readyState < 1) return;
      const target = pendingSeekTime;
      pendingSeekTime = null;
      try { audio.currentTime = Math.max(0, Math.min(getDuration(), target)); } catch (_) {}
      syncOnce();
    };

    const seekAudio = (seconds) => {
      if (!audio || !ensureAudioSource()) return;
      const target = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      if (audio.readyState >= 1) {
        pendingSeekTime = null;
        try { audio.currentTime = Math.min(getDuration(), target); } catch (_) { pendingSeekTime = target; }
        return;
      }
      pendingSeekTime = target;
      if (!seekListenerAttached) {
        seekListenerAttached = true;
        audio.addEventListener("loadedmetadata", () => {
          seekListenerAttached = false;
          applyPendingSeek();
        }, { once: true });
      }
    };

    const playImmersiveAudio = () => {
      if (!audio || !ensureAudioSource()) return;
      wantsPlayback = true;
      audio.loop = false;
      audio.muted = false;
      audio.volume = Math.max(0.82, audio.volume || 0);
      const result = audio.play();
      result?.catch?.(() => updatePlayIcon(playButton, false));
    };

    const applyView = (next, animate = true) => {
      const scaledWidth = state.base.width * next.scale;
      const scaledHeight = state.base.height * next.scale;
      const viewWidth = viewport.clientWidth;
      const viewHeight = viewport.clientHeight;
      const clampAxis = (value, baseStart, scaledSize, viewSize) => {
        const minimum = viewSize - baseStart - scaledSize;
        const maximum = -baseStart;
        return minimum <= maximum
          ? Math.max(minimum, Math.min(maximum, value))
          : (viewSize - scaledSize) / 2 - baseStart;
      };
      const bounded = {
        scale: next.scale,
        tx: clampAxis(next.tx, state.base.left, scaledWidth, viewWidth),
        ty: clampAxis(next.ty, state.base.top, scaledHeight, viewHeight)
      };
      state.view = bounded;
      viewport.classList.toggle("is-manual", !animate);
      canvas.style.transform = `matrix(${bounded.scale},0,0,${bounded.scale},${bounded.tx},${bounded.ty})`;
      if (!animate) requestAnimationFrame(() => viewport.classList.remove("is-manual"));
    };

    const measureMap = () => {
      const w = viewport.clientWidth;
      const h = viewport.clientHeight;
      if (!w || !h) return;
      let width = w;
      let height = width / MAP_ASPECT;
      if (height > h) {
        height = h;
        width = height * MAP_ASPECT;
      }
      state.base = { left: (w - width) / 2, top: (h - height) / 2, width, height };
      Object.assign(canvas.style, {
        left: `${state.base.left}px`,
        top: `${state.base.top}px`,
        width: `${width}px`,
        height: `${height}px`
      });
      if (state.active >= 0 && state.active < cues.length) focusCue(state.active, false);
      else applyView({ scale: 1, tx: 0, ty: 0 }, false);
    };

    const focusCue = (index, animate = true) => {
      const cue = cues[index];
      if (!cue || !state.base.width) return;
      const viewW = viewport.clientWidth;
      const viewH = viewport.clientHeight;
      const scale = cue.zoom;
      const pointX = state.base.width * cue.x / 100;
      const pointY = state.base.height * cue.y / 100;
      const targetX = viewW * 0.48;
      const targetY = viewH * 0.49;
      const tx = targetX - state.base.left - pointX * scale;
      const ty = targetY - state.base.top - pointY * scale;
      applyView({ scale, tx, ty }, animate);
    };

    const setActive = (index, force = false) => {
      index = Math.max(-1, Math.min(timeline.length - 1, index));
      if (!force && index === state.active) return;
      state.active = index;
      const cue = timeline[index];
      const isNode = index >= 0 && index < cues.length;
      lyrics.forEach((item, i) => {
        item.classList.toggle("is-active", i === index);
        item.classList.toggle("is-past", index >= 0 && i < index);
        item.setAttribute("aria-current", i === index ? "true" : "false");
      });
      markers.forEach((item, i) => item.classList.toggle("is-active", isNode && i === index));
      sceneCard.hidden = !isNode;
      if (isNode) {
        sceneStep.textContent = String(index + 1).padStart(2, "0");
        sceneTitle.textContent = cue.title;
        sceneRegion.textContent = cue.region;
        focusCue(index, true);
      } else {
        applyView({ scale: 1, tx: 0, ty: 0 }, true);
      }
      playerCaption.textContent = index < 0 ? "前奏中 · 即将从瑞金出发" : cue.lyric;
      if (index >= 0) scrollLyricToCenter(lyrics[index], lyricScroller, force);
      else lyricScroller.scrollTo({ top: 0, behavior: "auto" });
    };

    const paintLyricProgress = (index, ratio) => {
      lyricChars.forEach((chars, lineIndex) => {
        const litCount = lineIndex < index
          ? chars.length
          : lineIndex === index
            ? Math.ceil(chars.length * Math.max(0, Math.min(1, ratio)))
            : 0;
        chars.forEach((char, charIndex) => char.classList.toggle("is-lit", charIndex < litCount));
      });
    };

    const sync = () => {
      if (!state.open) return;
      const duration = getDuration();
      const current = audio ? audio.currentTime || 0 : 0;
      const ratio = duration ? Math.min(1, current / duration) : 0;
      let index = -1;
      for (let i = timeline.length - 1; i >= 0; i -= 1) {
        if (current >= timeline[i].start) { index = i; break; }
      }
      setActive(index);
      if (index >= 0) {
        const cueStart = timeline[index].start;
        const cueEnd = timeline[index + 1]?.start ?? Math.min(duration, 142.4);
        paintLyricProgress(index, (current - cueStart) / Math.max(0.001, cueEnd - cueStart));
      } else {
        paintLyricProgress(-1, 0);
      }
      if (!state.userSeeking) progress.value = String(Math.round(ratio * 1000));
      progress.style.setProperty("--im-progress", `${Math.round(ratio * 100)}%`);
      timeLabel.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
      updatePlayIcon(playButton, audio && !audio.paused);
      state.raf = requestAnimationFrame(sync);
    };

    const open = () => {
      if (state.open) return;

      if (state.releaseTimer) {
        clearTimeout(state.releaseTimer);
        state.releaseTimer = 0;
      }

      // 如果上一次关闭后已将2D界面移出合成树，这里先恢复，再做尺寸测量。
      root.classList.remove("is-runtime-suspended");

      state.open = true;
      state.backgroundWasPaused = backgroundAudio ? backgroundAudio.paused : true;
      backgroundAudio?.pause();
      document.body.classList.add("immersive-map-open");
      root.classList.add("is-open");
      root.setAttribute("aria-hidden", "false");
      if (mapImage && !mapImage.getAttribute("src")) {
        mapImage.decoding = "async";
        mapImage.src = mapImage.dataset.src;
      }
      trigger.classList.remove("is-active");
      trigger.setAttribute("aria-label", "关闭沉浸式长征地图");
      trigger.title = "关闭沉浸式长征地图";
      measureMap();
      setActive(-1, true);
      if (audio) {
        ensureAudioSource();
        seekAudio(0);
        playImmersiveAudio();
      }
      requestLandscape(root);
      cancelAnimationFrame(state.raf);
      state.raf = requestAnimationFrame(sync);
      root.querySelector(".im-close").focus({ preventScroll: true });
    };

    const close = () => {
      if (!state.open) return;
      state.open = false;

      // 关闭2D自身唯一的同步循环。
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;

      // 如果用户正在拖动2D地图时直接返回，清掉尚未执行的指针帧。
      if (state.pointerFrame) cancelAnimationFrame(state.pointerFrame);
      state.pointerFrame = 0;
      state.drag = null;
      state.pendingPointer = null;
      viewport.classList.remove("is-dragging", "is-manual");

      root.classList.remove("is-open");
      root.setAttribute("aria-hidden", "true");
      document.body.classList.remove("immersive-map-open");
      trigger.setAttribute("aria-label", "打开沉浸式长征地图");
      trigger.title = "沉浸式长征地图";

      if (audio) {
        wantsPlayback = false;
        audio.pause();
        seekAudio(0);
      }

      if (backgroundAudio && !state.backgroundWasPaused) {
        backgroundAudio.play().catch(() => {});
      }

      try { screen.orientation?.unlock?.(); } catch (_) {}
      if (document.fullscreenElement === root) {
        document.exitFullscreen?.().catch(() => {});
      }

      /* 高分辨率2D地图（6528×3856）关闭后继续保留解码纹理，
         会占用大量移动端图形/图片内存。等淡出动画完成后卸载它；
         下次打开时原有 open() 会从 data-src 自动重新加载，内容和功能不变。 */
      state.releaseTimer = window.setTimeout(() => {
        state.releaseTimer = 0;
        if (state.open) return;

        root.classList.add("is-runtime-suspended");

        if (mapImage) {
          mapImage.removeAttribute("src");
          mapImage.removeAttribute("srcset");
        }

        // 复位2D变换，释放独立合成层状态。
        canvas.style.transform = "none";
        canvas.style.willChange = "auto";
      }, 420);

      /* Fullscreen退出和方向解锁会在手机上触发一串 resize/orientation 事件。
         等这些事件基本稳定后，只对“现有”Three.js实例做一次恢复；
         不会创建第二个动画循环。 */
      window.setTimeout(() => {
        if (state.open) return;
        window.__LONG_MARCH_RESUME_3D_AFTER_IMMERSIVE__?.();
      }, 520);

      trigger.focus({ preventScroll: true });
    };

    // Capture prevents the old map-focus listener from running.
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.open ? close() : open();
    }, true);

    root.querySelector(".im-close").addEventListener("click", close);
    document.addEventListener("keydown", (event) => {
      if (!state.open) return;
      if (event.key === "Escape") close();
      if (event.code === "Space" && !/INPUT|BUTTON|A/.test(document.activeElement?.tagName || "")) {
        event.preventDefault();
        if (audio?.paused) playImmersiveAudio();
        else {
          wantsPlayback = false;
          audio?.pause();
        }
      }
    });

    playButton.addEventListener("click", () => {
      if (!audio) return;
      if (audio.paused) playImmersiveAudio();
      else {
        wantsPlayback = false;
        audio.pause();
      }
    });

    progress.addEventListener("pointerdown", () => { state.userSeeking = true; });
    progress.addEventListener("input", () => {
      if (!audio) return;
      const target = getDuration() * Number(progress.value) / 1000;
      seekAudio(target);
      progress.style.setProperty("--im-progress", `${Math.round(Number(progress.value) / 10)}%`);
      timeLabel.textContent = `${formatTime(target)} / ${formatTime(getDuration())}`;
      syncOnce();
    });
    progress.addEventListener("change", () => { state.userSeeking = false; });
    progress.addEventListener("pointerup", () => { state.userSeeking = false; });
    progress.addEventListener("touchend", () => { state.userSeeking = false; }, { passive: true });

    lyrics.forEach((item, index) => item.addEventListener("click", () => seekCue(index)));
    markers.forEach((item, index) => item.addEventListener("click", () => seekCue(index)));

    const seekCue = (index) => {
      seekAudio(timeline[index].start);
      setActive(index, true);
      playImmersiveAudio();
    };

    const syncOnce = () => {
      const duration = getDuration();
      const current = audio?.currentTime || 0;
      let index = -1;
      timeline.forEach((cue, i) => { if (current >= cue.start) index = i; });
      setActive(index);
      if (index >= 0) {
        const cueStart = timeline[index].start;
        const cueEnd = timeline[index + 1]?.start ?? Math.min(duration, 142.4);
        paintLyricProgress(index, (current - cueStart) / Math.max(0.001, cueEnd - cueStart));
      } else {
        paintLyricProgress(-1, 0);
      }
    };

    root.querySelector('[data-map-action="reset"]').addEventListener("click", () => {
      if (state.active >= 0 && state.active < cues.length) focusCue(state.active);
      else applyView({ scale: 1, tx: 0, ty: 0 }, true);
    });
    root.querySelector('[data-map-action="in"]').addEventListener("click", () => manualZoom(1.16));
    root.querySelector('[data-map-action="out"]').addEventListener("click", () => manualZoom(0.86));

    const manualZoom = (factor) => {
      const scale = Math.max(1, Math.min(3.2, state.view.scale * factor));
      const centerX = viewport.clientWidth / 2;
      const centerY = viewport.clientHeight / 2;
      const ratio = scale / state.view.scale;
      const tx = centerX - state.base.left - (centerX - state.base.left - state.view.tx) * ratio;
      const ty = centerY - state.base.top - (centerY - state.base.top - state.view.ty) * ratio;
      applyView({ scale, tx, ty }, true);
    };

    viewport.addEventListener("wheel", (event) => {
      if (!state.open) return;
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      const scale = Math.max(1, Math.min(3.2, state.view.scale * factor));
      const rect = viewport.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      const ratio = scale / state.view.scale;
      const tx = cx - state.base.left - (cx - state.base.left - state.view.tx) * ratio;
      const ty = cy - state.base.top - (cy - state.base.top - state.view.ty) * ratio;
      applyView({ scale, tx, ty }, false);
    }, { passive: false });

    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      state.drag = { x: event.clientX, y: event.clientY, tx: state.view.tx, ty: state.view.ty };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!state.drag) return;
      state.pendingPointer = { x: event.clientX, y: event.clientY };
      if (state.pointerFrame) return;
      state.pointerFrame = requestAnimationFrame(() => {
        state.pointerFrame = 0;
        if (!state.drag || !state.pendingPointer) return;
        applyView({
          scale: state.view.scale,
          tx: state.drag.tx + state.pendingPointer.x - state.drag.x,
          ty: state.drag.ty + state.pendingPointer.y - state.drag.y
        }, false);
      });
    });

    const endDrag = () => {
      state.drag = null;
      state.pendingPointer = null;
      if (state.pointerFrame) cancelAnimationFrame(state.pointerFrame);
      state.pointerFrame = 0;
      viewport.classList.remove("is-dragging");
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", measureMap, { passive: true });
    audio?.addEventListener("play", () => {
      backgroundAudio?.pause();
      updatePlayIcon(playButton, true);
    });
    audio?.addEventListener("canplay", () => {
      applyPendingSeek();
      if (state.open && wantsPlayback && audio.paused) audio.play().catch(() => updatePlayIcon(playButton, false));
    });
    audio?.addEventListener("pause", () => updatePlayIcon(playButton, false));
    audio?.addEventListener("ended", () => {
      wantsPlayback = false;
      updatePlayIcon(playButton, false);
    });
    window.addEventListener("beforeunload", () => {
      if (immersiveAudioObjectUrl) URL.revokeObjectURL(immersiveAudioObjectUrl);
    }, { once: true });
  });

  function buildExperience() {
    const root = document.createElement("section");
    root.id = "immersive-map-experience";
    root.setAttribute("aria-hidden", "true");
    root.setAttribute("aria-label", "沉浸式长征地图与实时歌词");
    root.innerHTML = `
      <audio id="immersive-long-march-song" data-src="assets/audio/audio_5d5e534d3c7100ed.mp3" preload="none" playsinline></audio>
      <div class="im-landscape-guard" role="status" aria-live="polite">
        <span class="im-landscape-guard__phone" aria-hidden="true"></span>
        <strong>请将设备横置</strong>
        <span>横屏后将自动进入左侧地图、右侧歌词的沉浸模式</span>
      </div>
      <div class="im-layout">
        <section class="im-map-column" aria-label="长征节点地图">
          <div class="im-map-viewport">
            <div class="im-map-canvas">
              <img class="im-map-image" data-src="assets/images/img_aaff512d2e35fde3.webp" decoding="async" alt="中央红军长征十六节点艺术地图">
              ${cues.map((cue, i) => `<button class="im-marker" type="button" style="left:${cue.x}%;top:${Math.min(96, cue.y + 5.8)}%" aria-label="跳转到${escapeHtml(cue.title)}"><span>${String(i + 1).padStart(2, "0")}</span></button>`).join("")}
            </div>
            <div class="im-map-shade"></div>
          </div>
          <div class="im-map-tip">滚轮缩放 · 按住拖动 · 点击歌词跳转节点</div>
          <div class="im-scene-card" aria-live="polite" hidden>
            <span class="im-scene-card__step">01</span><span class="im-scene-card__title">瑞金出发</span>
            <span class="im-scene-card__region">江西·瑞金</span>
          </div>
          <div class="im-map-tools" aria-label="地图视图控制">
            <button class="im-map-tool" data-map-action="out" type="button" aria-label="缩小地图">−</button>
            <button class="im-map-tool" data-map-action="reset" type="button" aria-label="回到当前节点">◎</button>
            <button class="im-map-tool" data-map-action="in" type="button" aria-label="放大地图">＋</button>
          </div>
        </section>
        <aside class="im-lyrics-column" aria-label="实时歌词">
          <div class="im-lyrics-head">
            <div><h2>《山河回响》</h2></div>
            <button class="im-close" type="button" aria-label="关闭沉浸式地图" title="关闭">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="im-lyrics-scroll">
            <ol class="im-lyrics-list">
              ${timeline.map((cue, i) => `<li><button class="im-lyric${cue.finale ? " is-finale" : ""}" type="button" data-cue="${i}" aria-label="${escapeHtml(cue.title)}"><span class="im-lyric__text">${renderLyricCharacters(cue.lyric)}</span></button></li>`).join("")}
            </ol>
          </div>
          <div class="im-player">
            <input class="im-progress" type="range" min="0" max="1000" value="0" aria-label="歌曲播放进度">
            <div class="im-player__row">
              <button class="im-play" type="button" aria-label="播放歌曲"></button>
              <div class="im-player__meta"><span class="im-player__time">00:00 / 00:00</span><span class="im-player__caption">前奏中 · 即将从瑞金出发</span></div>
              <a class="im-suno-link" href="${SUNO_URL}" target="_blank" rel="noopener noreferrer">Suno ai生成 ↗</a>
            </div>
          </div>
        </aside>
      </div>`;
    document.body.appendChild(root);
    updatePlayIcon(root.querySelector(".im-play"), false);
    return root;
  }

  function updatePlayIcon(button, isPlaying) {
    if (!button) return;
    button.setAttribute("aria-label", isPlaying ? "暂停歌曲" : "播放歌曲");
    button.innerHTML = isPlaying
      ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  }

  function scrollLyricToCenter(item, scroller, instant = false) {
    if (!item || !scroller) return;
    const itemRect = item.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const target = Math.max(
      0,
      scroller.scrollTop + itemRect.top - scrollerRect.top - (scroller.clientHeight - itemRect.height) / 2
    );
    scroller.scrollTo({ top: target, behavior: instant ? "auto" : "smooth" });
  }

  function requestLandscape(root) {
    if (!root) return;

    /* V169：iOS 主界面已经用 CSS 形成逻辑横屏时，沉浸式界面直接继承
       同一横屏坐标系，不再要求物理旋转，也不再尝试无效的元素全屏。 */
    const hostState = window.__LONG_MARCH_HOST_STATE__?.();
    const cssLandscape =
      Boolean(hostState?.cssLandscape) ||
      document.documentElement.classList.contains("force-css-landscape");
    const isIOS =
      /iPad|iPhone|iPod/i.test(navigator.userAgent || "") ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if ((isIOS && cssLandscape) || window.matchMedia("(orientation: landscape)").matches) {
      return;
    }

    const lock = () => {
      try {
        const result = screen.orientation?.lock?.("landscape");
        result?.catch?.(() => {});
      } catch (_) {}
    };

    if (root.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen({ navigationUI: "hide" }).then(lock).catch(() => {});
    } else {
      lock();
    }
  }

  function formatTime(seconds) {
    const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const minutes = Math.floor(value / 60);
    const rest = Math.floor(value % 60);
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }

  function renderLyricCharacters(value) {
    return [...String(value)].map((char) => `<span class="im-char">${escapeHtml(char)}</span>`).join("");
  }
})();

