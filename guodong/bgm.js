/* bgm.js — 背景音乐：小店「经营」/ 小屋「小屋」，切换场景时交叉淡入淡出。
   浏览器不允许自动出声，所以在访客第一次点击 / 按键后才开始播放。设置存在 localStorage。 */
const BGM = (() => {
  'use strict';
  const KEY = 'guodong.settings';
  let st = { music: true, vol: .55 };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) {} };
  const tracks = { shop: new Audio('assets/audio/shop.mp3'), home: new Audio('assets/audio/home.mp3') };
  for (const a of Object.values(tracks)) { a.loop = true; a.preload = 'none'; a.volume = 0; }
  let scene = 'shop', unlocked = false, raf = 0;

  let duck = 1;
  function target(name) { return st.music && unlocked && name === scene ? st.vol * duck : 0; }
  function fade() {
    cancelAnimationFrame(raf);
    const step = () => {
      let busy = false;
      for (const [name, a] of Object.entries(tracks)) {
        const t = target(name), v = a.volume, nv = Math.abs(t - v) < .02 ? t : v + (t - v) * .08;
        a.volume = Math.max(0, Math.min(1, nv));
        if (t > 0 && a.paused) { a.play().catch(() => {}); }
        if (t === 0 && a.volume === 0 && !a.paused) a.pause();
        if (a.volume !== t) busy = true;
      }
      if (busy) raf = requestAnimationFrame(step);
    };
    step();
  }
  function unlock() { if (unlocked) return; unlocked = true; fade(); }
  addEventListener('pointerdown', unlock, { once: true, capture: true });
  addEventListener('keydown', unlock, { once: true, capture: true });

  // UI: a small music toggle + volume slider under the title
  const ui = document.getElementById('music');
  function render() {
    if (!ui) return;
    ui.querySelector('button').textContent = st.music ? '🎵 音乐：开' : '🔇 音乐：关';
    ui.querySelector('button').classList.toggle('off', !st.music);
    ui.querySelector('input').value = Math.round(st.vol * 100);
  }
  if (ui) {
    ui.querySelector('button').addEventListener('click', () => { st.music = !st.music; save(); render(); unlock(); fade(); });
    ui.querySelector('input').addEventListener('input', e => { st.vol = e.target.value / 100; if (st.vol > 0) st.music = true; save(); render(); fade(); });
    render();
  }
  /* ---- little sound effects, synthesised (no extra files) ---- */
  let ac = null;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
  function tone(freq, t0, dur, vol = .12, type = 'sine') {
    const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0005, t0 + dur);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .05);
  }
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const sfx = {
    tick() { const a = ctx(); if (a) tone(1800, a.currentTime, .05, .06, 'square'); },
    ding() { const a = ctx(); if (!a) return; tone(1318, a.currentTime, 1.2, .1); tone(2637, a.currentTime, .6, .03); },
    pop() { const a = ctx(); if (a) tone(520, a.currentTime, .12, .08, 'triangle'); },
    drip() { const a = ctx(); if (!a) return; for (let i = 0; i < 4; i++) tone(1400 + Math.random() * 600, a.currentTime + i * .12, .08, .05); },
    // an original little music-box tune that slows down as the spring winds out
    musicBox(seconds = 10, onEnd) {
      const a = ctx(); if (!a) { onEnd && setTimeout(onEnd, seconds * 1000); return; }
      const tune = [76, 79, 84, 83, 79, 76, 77, 81, 84, 81, 77, 74, 76, 79, 83, 86, 84, 79, 76, 72];
      let t = a.currentTime + .05, gap = .2, i = 0;
      while (t - a.currentTime < seconds) {
        const n = tune[i % tune.length];
        tone(midi(n), t, 1.1, .09); tone(midi(n + 12), t, .5, .025);
        if (i % 4 === 0) tone(midi(n - 24), t, 1.2, .035, 'triangle');
        t += gap; gap *= (t - a.currentTime > seconds * .6) ? 1.07 : 1.004; i++;
      }
      duck = .25; fade();
      setTimeout(() => { duck = 1; fade(); onEnd && onEnd(); }, (t - a.currentTime) * 1000 + 300);
    },
  };
  /* ---- the music box: the user's own recording; while it plays, the room music stops ---- */
  const mb = new Audio('assets/audio/musicbox.mp3'); mb.preload = 'none';
  let mbOn = false, mbEnd = null;
  mb.addEventListener('ended', () => { mbOn = false; duck = 1; fade(); mbEnd && mbEnd(); });
  const musicBox = {
    toggle(onEnd) {
      unlock();
      if (mbOn) { mb.pause(); mbOn = false; duck = 1; fade(); return false; }
      mb.volume = Math.max(.2, st.vol); mb.play().catch(() => {}); mbOn = true; mbEnd = onEnd; duck = 0; fade();
      return true;
    },
    stop() { if (!mbOn) return; mb.pause(); mbOn = false; duck = 1; fade(); mbEnd && mbEnd(); },
    get on() { return mbOn; },
  };
  return { scene(name) { if (name !== 'home') musicBox.stop(); scene = name; fade(); }, get on() { return st.music; }, sfx, musicBox };
})();
