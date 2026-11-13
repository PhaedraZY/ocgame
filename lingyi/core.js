/* ================= 零一 · Zero One — core.js =================
 * 1) window.L01：给 room.js / game.js 用的公共接口（契约见 _lingyi_spec.md）
 * 2) 全站动线：序章、背景色插值、贯穿全页的心电线、导航/HUD、01 信号、02 病历、05 对话
 * ============================================================ */
(() => {
'use strict';

const doc = document;
const root = doc.documentElement;
const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 小工具 ---------- */
const $ = (sel, r) => (r || doc).querySelector(sel);
const $$ = (sel, r) => Array.from((r || doc).querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const rand = (a, b) => a + Math.random() * (b - a);
const wait = ms => new Promise(r => setTimeout(r, ms));
function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

/* ---------- store ---------- */
const PREFIX = 'lingyi.';
const store = {
  get(key, def) {
    try { const v = localStorage.getItem(PREFIX + key); return v === null ? def : JSON.parse(v); }
    catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) { /* 隐私模式 */ }
  },
};

/* ---------- 心电波形：一拍内相位 → 幅度（约 -0.3..1） ---------- */
const gauss = (p, c, w) => { const x = (p - c) / w; return Math.exp(-x * x); };
function ecg(p) {
  p = p - Math.floor(p);
  return 0.12 * gauss(p, 0.20, 0.035)   // P
       - 0.12 * gauss(p, 0.375, 0.011)  // Q
       + 1.00 * gauss(p, 0.40, 0.013)   // R
       - 0.30 * gauss(p, 0.428, 0.013)  // S
       + 0.26 * gauss(p, 0.66, 0.055);  // T
}

/* ---------- 事件总线 ---------- */
const handlers = {};
function on(evt, fn) {
  (handlers[evt] || (handlers[evt] = [])).push(fn);
  return () => off(evt, fn);
}
function off(evt, fn) {
  const list = handlers[evt]; if (!list) return;
  const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1);
}
function emit(evt, data) {
  (handlers[evt] || []).slice().forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });
}

/* ================= 音频（WebAudio 合成） ================= */
let actx = null, master = null;
const audio = {
  get ctx() { return actx; },
  init() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.9;
      master.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  },
};

function tone({ freq, type = 'sine', dur = 0.12, gain = 0.15, attack = 0.005, at = 0, glide = 0 }) {
  if (!actx) return;
  const t = actx.currentTime + at;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

const sfx = {
  beep(freq = 880, dur = 0.12) {
    dur = Math.max(0.04, dur);
    tone({ freq, dur, gain: 0.13, attack: 0.004 });
    tone({ freq: freq * 2, dur: dur * 0.6, gain: 0.018, attack: 0.004 });
  },
  tick() { tone({ freq: 1650, type: 'triangle', dur: 0.05, gain: 0.06, attack: 0.002 }); },
  low() {
    tone({ freq: 220, type: 'triangle', dur: 0.32, gain: 0.14, glide: 110 });
    tone({ freq: 110, dur: 0.38, gain: 0.12, glide: 70 });
  },
  chime() {
    [784, 988, 1319].forEach((f, i) => {
      tone({ freq: f, dur: 1.2, gain: 0.08, attack: 0.02, at: i * 0.15 });
      tone({ freq: f * 2, type: 'triangle', dur: 0.5, gain: 0.012, attack: 0.02, at: i * 0.15 });
    });
  },
};

/* 白噪音 + 60BPM 心跳（心跳由 HUD 的节拍时钟触发，与小心形同步） */
let noiseGain = null, ambOn = false;
function makeNoise() {
  const len = actx.sampleRate * 4;
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {           // 近似粉噪，更柔和
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.0990460;
    b1 = 0.96300 * b1 + w * 0.2965164;
    b2 = 0.57000 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
  }
  const fade = Math.floor(actx.sampleRate * 0.05);   // 循环接缝淡入淡出
  for (let i = 0; i < fade; i++) { const k = i / fade; d[i] *= k; d[len - 1 - i] *= k; }
  const src = actx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lp = actx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 1200;
  noiseGain = actx.createGain(); noiseGain.gain.value = 0;
  src.connect(lp); lp.connect(noiseGain); noiseGain.connect(master);
  src.start();
}
function heartThump() {
  if (!ambOn || !actx) return;
  tone({ freq: 70, dur: 0.16, gain: 0.3, attack: 0.008, glide: 42 });
  tone({ freq: 140, type: 'triangle', dur: 0.05, gain: 0.03, attack: 0.003 });
  tone({ freq: 62, dur: 0.14, gain: 0.18, attack: 0.008, glide: 40, at: 0.24 });
}
const ambient = {
  get on() { return ambOn; },
  toggle(force) {
    const want = typeof force === 'boolean' ? force : !ambOn;
    if (want && !audio.init()) return ambOn;
    if (want && !noiseGain) makeNoise();
    if (want === ambOn) return ambOn;
    ambOn = want;
    if (noiseGain) {
      const t = actx.currentTime;
      noiseGain.gain.cancelScheduledValues(t);
      noiseGain.gain.setTargetAtTime(want ? 0.22 : 0, t, 0.35);
    }
    store.set('ambient', want);
    syncSoundBtn();
    emit('ambient', want);
    return ambOn;
  },
};

/* ================= toast / modal ================= */
let toastT = 0;
function toast(msg) {
  const el = $('#toast'); if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2300);
}

let modalOpen = false, lastFocus = null;
const modal = {
  get isOpen() { return modalOpen; },
  open(html) {
    const m = $('#modal'), body = $('#modalBody');
    body.innerHTML = html;
    body.scrollTop = 0;
    lastFocus = doc.activeElement;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    modalOpen = true;
    setTimeout(() => { const x = $('.modal-x', m); x && x.focus({ preventScroll: true }); }, 60);
    emit('modal', true);
    return body;
  },
  close() {
    if (!modalOpen) return;
    const m = $('#modal');
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    modalOpen = false;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    emit('modal', false);
  },
};

/* ================= 小特效：点击火花 / 羽毛 ================= */
const SPARK_PLUS = '<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>';
const SPARK_ZIG = '<svg viewBox="0 0 16 16"><path d="M0 9h4l2-6 2.5 10 2-6h5.5"/></svg>';
function sparks(x, y) {
  const fx = $('#fx'); if (!fx) return;
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const el = doc.createElement('span');
    el.className = 'spark';
    const a = rand(0, Math.PI * 2), r = rand(22, 46);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.setProperty('--dx', Math.cos(a) * r + 'px');
    el.style.setProperty('--dy', Math.sin(a) * r + 'px');
    el.style.setProperty('--rot', rand(-60, 60) + 'deg');
    if (i % 2) { el.innerHTML = SPARK_ZIG; el.style.width = el.style.height = '20px'; }
    else el.innerHTML = SPARK_PLUS;
    fx.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}
/* 在视口坐标 (x,y) 附近飘下 n 片羽毛 */
function feathers(x, y, n = 5) {
  const fx = $('#fx'); if (!fx || reduced) return;
  for (let i = 0; i < n; i++) {
    const el = doc.createElement('span');
    el.className = 'feather';
    el.innerHTML = '<svg viewBox="0 0 40 80"><use href="#i-feather"/></svg>';
    const dur = rand(2.6, 4);
    el.style.setProperty('--x0', (x + rand(-120, 120)) + 'px');
    el.style.setProperty('--y0', (y + rand(-40, 10)) + 'px');
    el.style.setProperty('--dx', rand(-90, 90) + 'px');
    el.style.setProperty('--dy', rand(180, 320) + 'px');
    el.style.setProperty('--rot', rand(-200, 200) + 'deg');
    el.style.setProperty('--dur', dur + 's');
    el.style.animationDelay = rand(0, 0.5) + 's';
    fx.appendChild(el);
    setTimeout(() => el.remove(), (dur + 0.6) * 1000);
  }
}

/* ================= HUD：节拍时钟 + 心率 ================= */
let bpm = 60, phase = 0, bumpT = 0;
const PX_PER_SEC = 40;
let hudSamples = [], hudAcc = 0, hudW = 90, hudH = 26, hudCtx = null, hudGrad = null, hudDirty = true;

function bump(n = 1) {
  n = Math.max(1, Math.round(n) || 1);
  bpm = Math.max(bpm, 60 + n);
  const hud = $('#hud'), num = $('#hudBpm');
  if (num) num.textContent = bpm;
  if (hud) hud.classList.add('up');
  clearTimeout(bumpT);
  bumpT = setTimeout(() => {
    bpm = 60;
    if (num) num.textContent = 60;
    if (hud) hud.classList.remove('up');
  }, 2000);
  emit('bump', bpm);
}

function hudSize() {
  const cv = $('#hudEcg'); if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  hudW = Math.max(30, Math.round(cv.clientWidth || 90));
  hudH = Math.max(14, Math.round(cv.clientHeight || 26));
  cv.width = hudW * dpr; cv.height = hudH * dpr;
  hudCtx = cv.getContext('2d');
  hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hudGrad = hudCtx.createLinearGradient(0, 0, hudW, 0);
  hudGrad.addColorStop(0, 'rgba(111,183,245,0)');
  hudGrad.addColorStop(0.35, 'rgba(111,183,245,.75)');
  hudGrad.addColorStop(1, 'rgba(111,183,245,1)');
  while (hudSamples.length < hudW) hudSamples.unshift(0);
  while (hudSamples.length > hudW) hudSamples.shift();
  hudDirty = true;
}
function hudStep(dt) {
  hudAcc += dt * PX_PER_SEC;
  let n = Math.floor(hudAcc);
  hudAcc -= n;
  if (n > hudW) n = hudW;
  for (let i = 0; i < n; i++) {
    const prev = phase;
    phase += bpm / 60 / PX_PER_SEC;
    if (phase >= 1) phase -= 1;
    if (prev < 0.4 && phase >= 0.4) heartThump();   // R 波
    hudSamples.push(ecg(phase));
    hudSamples.shift();
    hudDirty = true;
  }
}
function hudDraw() {
  const heart = $('#hudHeart');
  if (heart) {
    let d = phase - 0.42; if (d < -0.5) d += 1;
    const s = 1 + 0.3 * Math.exp(-(d / 0.07) * (d / 0.07));
    heart.style.transform = 'scale(' + s.toFixed(3) + ')';
  }
  if (!hudCtx || !hudDirty) return;
  hudDirty = false;
  const c = hudCtx, base = hudH * 0.66, amp = hudH * 0.55;
  c.clearRect(0, 0, hudW, hudH);
  c.lineWidth = 1.6; c.lineJoin = c.lineCap = 'round';
  c.strokeStyle = hudGrad;
  c.beginPath();
  for (let i = 0; i < hudSamples.length; i++) {
    const y = base - hudSamples[i] * amp;
    i ? c.lineTo(i, y) : c.moveTo(i, y);
  }
  c.stroke();
  const ly = base - hudSamples[hudSamples.length - 1] * amp;
  c.fillStyle = '#6fb7f5';
  c.beginPath(); c.arc(hudW - 1.5, ly, 2, 0, Math.PI * 2); c.fill();
}
function syncSoundBtn() {
  const b = $('#soundBtn'); if (!b) return;
  b.classList.toggle('on', ambOn);
  b.setAttribute('aria-pressed', String(ambOn));
}

/* ================= 公开接口 ================= */
const L01 = window.L01 = {
  $, $$, store, ecg, on, off, emit,
  audio, sfx, ambient, bump, toast, modal, feathers,
  get bpm() { return bpm; },
  get started() { return started; },
  reduced,
};

/* ================================================================
 *                         页面动线
 * ================================================================ */
let started = false;
const main = $('#main');
const secs = $$('[data-bg]', main).map(el => ({
  el, id: el.id,
  bg: hex(el.dataset.bg || '#fbfdff'),
  fg: hex(el.dataset.fg || '#4a4f5c'),
  top: 0, h: 0,
}));

function hex(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mixC = (a, b, t) => [0, 1, 2].map(i => Math.round(lerp(a[i], b[i], t)));
const rgb = c => 'rgb(' + c.join(',') + ')';

/* ---------- 一拍波形的 path（按 x 采样，尖峰附近加密） ---------- */
function wavePath(x0, x1, base, amp, beatAt, beatLen) {
  // beatAt: 这一拍起点 x 的数组
  let d = '', x = x0;
  while (x <= x1 + 0.01) {
    let v = 0, inBeat = false;
    for (const b of beatAt) {
      const p = (x - b) / beatLen;
      if (p >= 0 && p < 1) { v = ecg(p); inBeat = true; break; }
    }
    d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + (base - v * amp).toFixed(1);
    x += inBeat ? 1 : 6;
  }
  return d;
}
function setLen(path) {
  try { path.style.setProperty('--len', Math.ceil(path.getTotalLength() + 2)); } catch (e) { /* 未渲染 */ }
}

/* ---------- 章节标题：逐字拆分 + 小段心电 ---------- */
$$('[data-split]').forEach(el => {
  const t = el.textContent.trim();
  el.setAttribute('aria-label', t);
  el.innerHTML = Array.from(t).map((c, i) =>
    c === ' ' ? ' ' : '<span class="ch" style="--i:' + i + '" aria-hidden="true">' + c + '</span>').join('');
});
$$('.sec-ecg path').forEach(p => {
  p.setAttribute('d', wavePath(0, 260, 26, 22, [70], 120));
  setLen(p);
});

/* ---------- 进场：IntersectionObserver ---------- */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));
} else {
  $$('.reveal').forEach(el => el.classList.add('in'));
}

/* ================= 背景色插值 / 导航 / 首屏视差 ================= */
let curBg = '', curFg = '';
function measure() {
  const y = window.scrollY;
  secs.forEach(s => { const r = s.el.getBoundingClientRect(); s.top = r.top + y; s.h = r.height; });
}
function updateBg() {
  if (!secs.length) return;
  const vh = window.innerHeight, mid = window.scrollY + vh * 0.5, w = vh * 0.38;
  let i = 0;
  while (i < secs.length - 1 && mid >= secs[i + 1].top) i++;
  let bg = secs[i].bg, fg = secs[i].fg;
  for (const k of [i, i + 1]) {
    if (k <= 0 || k >= secs.length) continue;
    const b = secs[k].top;
    if (Math.abs(mid - b) < w) {
      const t = smooth((mid - (b - w)) / (2 * w));
      bg = mixC(secs[k - 1].bg, secs[k].bg, t);
      fg = mixC(secs[k - 1].fg, secs[k].fg, t);
    }
  }
  const bgS = rgb(bg), fgS = rgb(fg);
  if (bgS !== curBg) {
    curBg = bgS;
    root.style.setProperty('--bg', bgS);
    const lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
    doc.body.classList.toggle('dark', lum < 0.45);
    const meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', bgS);
  }
  if (fgS !== curFg) {
    curFg = fgS;
    root.style.setProperty('--fg', fgS);
    root.style.setProperty('--fg-soft', 'rgba(' + fg.join(',') + ',.62)');
  }
}

const navLinks = $$('#nav a');
let curNav = '';
function updateNav() {
  const probe = window.scrollY + window.innerHeight * 0.4;
  let id = 'signal';
  secs.forEach(s => { if (s.top <= probe && navLinks.some(a => a.dataset.sec === s.id)) id = s.id; });
  if (id !== curNav) {
    curNav = id;
    navLinks.forEach(a => {
      const onNow = a.dataset.sec === id;
      a.classList.toggle('on', onNow);
      if (onNow) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
}

const sigLeft = $('#sigLeft'), sig01 = $('#sig01');
function updateHero() {
  const y = window.scrollY, vh = window.innerHeight;
  if (y > vh * 1.4) return;
  if (sigLeft && !reduced) {
    sigLeft.style.transform = 'translate3d(0,' + (-y * 0.18).toFixed(1) + 'px,0)';
    sigLeft.style.opacity = clamp(1 - y / (vh * 0.75), 0, 1).toFixed(3);
  }
  if (sig01 && !reduced) sig01.style.setProperty('--par', (y * 0.35).toFixed(1) + 'px');
}

/* ================= 贯穿全页的心电线 ================= */
const trailSvg = $('#trail'), trailLine = $('#trailLine'), trailGhost = $('#trailGhost');
const trailHead = $('#trailHead'), trailGlow = $('#trailGlow');
let tPts = [], tKey = [], tCum = [], tTotal = 0, tScale = 1, tCur = 0, tTarget = 0, tOff = 0;

function buildTrail() {
  if (!trailSvg || !secs.length) return;
  const W = main.clientWidth, H = main.scrollHeight;
  tOff = main.getBoundingClientRect().top + window.scrollY;
  const top = k => secs[k].top - tOff;
  trailSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  trailSvg.style.height = H + 'px';
  const mob = W < 700;
  const edge = Math.max((W - 1180) / 2, mob ? 20 : W * 0.06);
  const xL = clamp(edge * 0.42, 10, 72), xR = W - xL;
  const ampV = mob ? 13 : 24, ampH = mob ? 22 : 34;
  const gapV = mob ? 380 : 520, lenV = mob ? 80 : 110;
  const gapH = mob ? 170 : 260, lenH = mob ? 70 : 100;
  const cross = Math.min(200, window.innerHeight * 0.26), half = cross / 2;
  const R = mob ? 26 : 46;
  const rnd = seeded(11);
  const pts = [];
  const push = (x, y, k) => pts.push([x, y, k]);

  let y = 90;
  for (let i = 0; i < secs.length; i++) {
    const left = i % 2 === 0;
    const side = left ? xL : xR, dir = left ? 1 : -1;
    const other = left ? xR : xL;
    const last = i === secs.length - 1;
    const b = last ? 0 : top(i + 1);
    const yA = b - half, yB = b + half;
    const yEnd = last ? Math.min(H - 24, Math.max(y + 60, top(i) + secs[i].h * 0.5)) : yA - R;

    // 竖向：沿留白下行，尖峰向内侧横向突出
    const s0 = y;
    for (let yy = y; yy <= yEnd; ) {
      const s = yy - s0 + 160;
      const ph = (s % gapV) / lenV;
      const v = ph < 1 ? ecg(ph) : 0;
      const wig = Math.sin(yy / 170) * 3 + (rnd() - 0.5) * 0.7;
      push(side + dir * v * ampV + wig, yy, yy);
      yy += ph < 1.02 ? 1.5 : 6;
    }
    if (last) break;

    // 圆角 1：二次贝塞尔 (side, yA-R) → (side, yA) → (side+dir*R, yA)
    const q = (p0, c, p1, t) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * c + t * t * p1;
    for (let j = 1; j <= 10; j++) {
      const t = j / 10;
      const yy = q(yA - R, yA, yA, t);
      push(q(side, side, side + dir * R, t), yy, yA - R + R * t);
    }
    // 横穿：微斜向下，一路带几拍心电
    const xs = side + dir * R, xe = other - dir * R, span = Math.abs(xe - xs);
    for (let dist = 0; dist <= span; ) {
      const u = dist / span;
      const ph = ((dist + 80) % gapH) / lenH;
      const env = dist > 40 && dist < span - 40 ? 1 : 0;
      const v = ph < 1 ? ecg(ph) * env : 0;
      const yb = yA + cross * u;
      push(xs + dir * dist, yb - v * ampH + (rnd() - 0.5) * 0.7, yA + cross * u);
      dist += ph < 1.02 && env ? 1.5 : 6;
    }
    // 圆角 2：(other-dir*R, yB) → (other, yB) → (other, yB+R)
    for (let j = 1; j <= 10; j++) {
      const t = j / 10;
      push(q(xe, other, other, t), q(yB, yB, yB + R, t), yB + R * t);
    }
    y = yB + R + 6;
  }

  // 累计长度
  tPts = pts; tKey = new Array(pts.length); tCum = new Array(pts.length);
  let d = '', acc = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    tCum[i] = acc; tKey[i] = p[2];
    d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  }
  trailLine.setAttribute('d', d);
  trailGhost.setAttribute('d', d);
  let real = acc;
  try { real = trailLine.getTotalLength() || acc; } catch (e) { /* noop */ }
  tTotal = acc; tScale = acc ? real / acc : 1;
  trailLine.style.strokeDasharray = real + ' ' + real;
  trailLine.style.strokeDashoffset = String(real - tCur * tScale);
}

function bsearch(arr, v) {   // 最后一个 <= v 的下标
  let lo = 0, hi = arr.length - 1;
  if (!arr.length || v < arr[0]) return -1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (arr[m] <= v) lo = m; else hi = m - 1; }
  return lo;
}
function trailTargetLen() {
  if (!tPts.length || !started) return 0;
  const yT = window.scrollY + window.innerHeight * 0.6 - tOff;
  const i = bsearch(tKey, yT);
  if (i < 0) return 0;
  if (i >= tKey.length - 1) return tTotal;
  const k0 = tKey[i], k1 = tKey[i + 1];
  const t = k1 > k0 ? (yT - k0) / (k1 - k0) : 0;
  return lerp(tCum[i], tCum[i + 1], t);
}
function updateTrail() {
  if (!tPts.length) return;
  tTarget = trailTargetLen();
  const diff = tTarget - tCur;
  if (Math.abs(diff) < 0.3 && tCur === tTarget) return;
  tCur = reduced || Math.abs(diff) < 0.3 ? tTarget : tCur + diff * 0.14;
  const real = tTotal * tScale;
  trailLine.style.strokeDashoffset = String(real - tCur * tScale);
  // 线头
  const i = bsearch(tCum, tCur);
  let x = -40, y = -40;
  if (i >= 0 && tCur > 0) {
    const j = Math.min(i + 1, tPts.length - 1);
    const seg = tCum[j] - tCum[i];
    const t = seg > 0 ? (tCur - tCum[i]) / seg : 0;
    x = lerp(tPts[i][0], tPts[j][0], t);
    y = lerp(tPts[i][1], tPts[j][1], t);
  }
  trailHead.setAttribute('cx', x.toFixed(1)); trailHead.setAttribute('cy', y.toFixed(1));
  trailGlow.setAttribute('cx', x.toFixed(1)); trailGlow.setAttribute('cy', y.toFixed(1));
}

/* ================= 布局 / 主循环 ================= */
let layoutT = 0, scrollDirty = true;
function layout() {
  measure();
  buildTrail();
  hudSize();
  scrollDirty = true;
}
function scheduleLayout() { clearTimeout(layoutT); layoutT = setTimeout(layout, 140); }

let lastT = performance.now(), lastY = -1;
function frame(t) {
  const dt = Math.min(0.1, (t - lastT) / 1000);
  lastT = t;
  hudStep(dt);
  hudDraw();
  if (scrollDirty || window.scrollY !== lastY) {
    lastY = window.scrollY; scrollDirty = false;
    updateBg(); updateNav(); updateHero();
  }
  updateTrail();
  requestAnimationFrame(frame);
}

/* ================= 序章 ================= */
const visits = store.get('visits', 0) + 1;
store.set('visits', visits);

const intro = $('#intro');
function initIntro() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  const visit = $('#introVisit');
  if (visit && store.get('promise', false) && visits > 1) {
    visit.textContent = '这是你第 ' + visits + ' 次来。他记得。';
    visit.hidden = false;
  }
  const ecgPath = $('#introEcg');
  if (ecgPath) { ecgPath.setAttribute('d', wavePath(0, 720, 70, 58, [0, 180, 360, 540], 180)); setLen(ecgPath); }

  const btn = $('#introBtn'), tag = $('#introTag');
  btn.addEventListener('click', () => {
    if (started || btn.disabled) return;
    btn.disabled = true;
    audio.init();
    sfx.beep(880, 0.14);
    intro.classList.add('ok');
    tag.textContent = 'SIGNAL OK · 60 BPM';
    tag.classList.add('ok');
    setTimeout(() => sfx.beep(880, 0.1), 600);
    setTimeout(() => startSite(store.get('ambient', true) !== false), 1250);
  });
  $('#introSkip').addEventListener('click', () => { audio.init(); startSite(false); });
}
function startSite(withAmbient) {
  if (started) return;
  started = true;
  intro.classList.add('lift');
  root.classList.remove('locked');
  doc.body.classList.remove('locked');
  doc.body.classList.add('started');
  setTimeout(() => intro.classList.add('gone'), 1250);
  if (withAmbient) ambient.toggle(true);
  layout();
  const hash = location.hash && location.hash.length > 1 ? doc.getElementById(location.hash.slice(1)) : null;
  if (hash) setTimeout(() => hash.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 700);
  emit('start', true);
}

/* ================= 01 信号 ================= */
function initSignal() {
  const flow = $('#sigFlow');
  if (flow) {
    const beats = []; for (let x = 0; x < 1800; x += 200) beats.push(x);
    flow.setAttribute('d', wavePath(0, 1800, 92, 70, beats, 200));
  }
  const fall = $('#sigFall');
  if (fall && !reduced) {
    for (let i = 0; i < 8; i++) {
      const scrap = i % 3 === 2;
      const el = doc.createElement('span');
      el.className = 'fall-item';
      el.innerHTML = scrap
        ? '<svg viewBox="0 0 60 44"><use href="#i-scrap"/></svg>'
        : '<svg viewBox="0 0 40 80"><use href="#i-feather"/></svg>';
      const dur = rand(11, 19);
      el.style.cssText =
        '--x:' + rand(2, 92).toFixed(1) + '%;--w:' + (scrap ? rand(34, 48) : rand(16, 28)).toFixed(0) + 'px;' +
        '--dur:' + dur.toFixed(1) + 's;--delay:' + (-rand(0, dur)).toFixed(1) + 's;' +
        '--dx:' + rand(-70, 70).toFixed(0) + 'px;--r0:' + rand(-40, 40).toFixed(0) + 'deg;--r1:' + rand(-160, 160).toFixed(0) + 'deg';
      fall.appendChild(el);
    }
  }
  const LINES = ['嗯。', '……你好。', '在。', '（已经是很热情的了。）', '别戳了，会掉帧。', '……哦。'];
  const chibi = $('#sigChibi'), bubble = $('#sigBubble');
  let li = 0, bubT = 0;
  chibi.addEventListener('click', () => {
    audio.init();
    chibi.classList.remove('boing'); void chibi.offsetWidth; chibi.classList.add('boing');
    bubble.textContent = LINES[li]; li = (li + 1) % LINES.length;
    bubble.classList.add('show');
    clearTimeout(bubT);
    bubT = setTimeout(() => bubble.classList.remove('show'), 2600);
    bump(1);
    sfx.beep(880, 0.1);
  });
}

/* ================= 02 病历：图鉴 + 色卡 ================= */
const PINS = [
  [53, 4, '心电光环', '红色的、没画完的一圈。波形是他自己的，画歪了。'],
  [25, 5, '蝴蝶结', '很大，浅蓝色。他说是"天线"。没有人信。'],
  [12, 24, '折线飘带', '飘带的末端长成了心电图的形状，心情好的时候会多跳一格。'],
  [52, 17, '半睁的眼睛', '蓝紫色。不是困，是省电模式。'],
  [47, 26.5, '胸口徽章', '一枚小小的波形徽章，上面是他第一次量到的心跳。'],
  [63, 30, '蓝色纽扣', '双排扣，一共七颗。少一颗会不安。'],
  [84, 42, '腰间的翅膀', '长在腰上。因为长在背上，睡觉会压到。'],
  [58, 41, '黑色腕带', '用来夹记录纸，也用来装作在看时间。'],
  [70, 71, '蓝色胶带', '裤子上的十字和波形是自己贴的。贴歪了也没有重贴。'],
  [35, 95, '厚底鞋', '浅蓝色。走路几乎没有声音。'],
];
const SWATCHES = [
  ['纸白', '#fbfdff'], ['铅笔灰', '#4a4f5c'], ['天蓝', '#6fb7f5'],
  ['淡蓝', '#cfe6fb'], ['眼睛蓝紫', '#4a3fe0'], ['光环红', '#d9475a'],
];
function initChart() {
  const fig = $('#atlasFig'), note = $('#atlasNote');
  if (fig && note) {
    let cur = -1;
    const show = i => {
      if (i === cur) return;
      cur = i;
      $$('.pin', fig).forEach((p, k) => p.classList.toggle('on', k === i));
      const [, , name, text] = PINS[i];
      note.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b><span><em>' + name + '</em>' + text + '</span>';
      note.classList.remove('flip'); void note.offsetWidth; note.classList.add('flip');
    };
    PINS.forEach(([x, y, name], i) => {
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'pin';
      b.textContent = i + 1;
      b.setAttribute('aria-label', name);
      b.style.cssText = '--x:' + x + '%;--y:' + y + '%;--pd:' + (i * 0.24).toFixed(2) + 's';
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(i); });
      b.addEventListener('focus', () => show(i));
      b.addEventListener('click', () => { show(i); sfx.tick(); });
      fig.appendChild(b);
    });
  }
  const sw = $('#swatches');
  if (sw) {
    SWATCHES.forEach(([name, c]) => {
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.title = name + ' ' + c;
      b.innerHTML = '<i style="--c:' + c + '"></i><span>' + name + '</span>';
      b.addEventListener('click', () => { copyText(c); sfx.tick(); toast('已复制 ' + name + ' ' + c); });
      sw.appendChild(b);
    });
  }
}
function copyText(s) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(s).catch(() => legacyCopy(s));
  } else legacyCopy(s);
}
function legacyCopy(s) {
  const ta = doc.createElement('textarea');
  ta.value = s; ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  doc.body.appendChild(ta); ta.select();
  try { doc.execCommand('copy'); } catch (e) { /* noop */ }
  ta.remove();
}

/* ================= 05 对话 + 纸条 ================= */
const QA = [
  ['你在干嘛？', ['……发呆。', '很忙的。'], 0],
  ['光环为什么是红色的？', ['因为是心电图。', '……波形是我自己的。画歪了。'], 0],
  ['你开心吗？', ['嗯。', '……看不出来吗。'], 1],
  ['翅膀为什么长在腰上？', ['不知道。', '长在背上的话，睡觉会压到。'], 0],
  ['手里的纸写了什么？', ['记录。', '今天有人来看我。写下来了。'], 1],
  ['你喜欢什么？', ['安静。', '蓝色。', '……现在这样也可以。'], 0],
  ['我可以待在这里吗？', ['……都行。', '椅子在那边。'], 1],
  ['你会飞吗？', ['会。', '但是走路比较不显眼。'], 0],
];
function initTalk() {
  const linesEl = $('#talkLines'), qs = $('#talkQs'), quotaEl = $('#quota');
  if (!linesEl || !qs) return;
  let quota = QA.length, busy = false;
  const asked = new Set(), shown = [];

  async function say(lines, question, append) {
    if (!append) linesEl.innerHTML = '';
    if (question) {
      const q = doc.createElement('p'); q.className = 'tl-you'; q.textContent = question;
      linesEl.appendChild(q);
    }
    for (let n = 0; n < lines.length; n++) {
      const p = doc.createElement('p');
      p.className = 'tl-him typing';
      linesEl.appendChild(p);
      const chars = Array.from(lines[n]);
      if (reduced) p.textContent = lines[n];
      else {
        for (const ch of chars) {
          p.textContent += ch;
          await wait(ch === '…' ? 140 : ch === '。' || ch === '，' ? 200 : 70);
        }
      }
      p.classList.remove('typing');
      if (n < lines.length - 1) await wait(reduced ? 200 : 520);
    }
  }
  function addBtn(i) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'q-btn';
    b.dataset.q = i;
    b.textContent = QA[i][0];
    b.addEventListener('click', () => ask(i, b));
    qs.appendChild(b);
  }
  function fill() {
    while (shown.length < 4) {
      const next = QA.findIndex((_, i) => !asked.has(i) && !shown.includes(i));
      if (next < 0) break;
      shown.push(next);
      addBtn(next);
    }
  }
  function setDisabled(v) { $$('.q-btn', qs).forEach(b => { b.disabled = v; }); }

  async function ask(i, btn) {
    if (busy || asked.has(i) || quota <= 0) return;
    busy = true;
    audio.init();
    sfx.tick();
    asked.add(i);
    shown.splice(shown.indexOf(i), 1);
    quota--;
    quotaEl.textContent = quota;
    setDisabled(true);
    btn.classList.add('out');
    setTimeout(() => btn.remove(), 350);
    await say(QA[i][1], QA[i][0]);
    if (QA[i][2]) bump(QA[i][2]);
    if (quota > 0) {
      await wait(250);
      fill();
      setDisabled(false);
      busy = false;
      return;
    }
    await wait(900);
    await say(['……说完了。', '配额用完了。']);
    await wait(1100);
    await say(['这个给你。'], null, true);
    await wait(500);
    openSlip(say);
  }
  fill();
}

function openSlip(say) {
  const slip = $('#slip'), svg = $('#slipEcg');
  if (!slip || !svg) return;
  slip.hidden = false;
  // 心电：三拍蓝线 → 最后一拍画成小爱心（红）→ 收尾平线
  const base = 108, cx = 720;
  const p1 = svg.querySelector('path');
  p1.setAttribute('d', wavePath(28, cx - 18, base, 74, [60, 230, 400], 170));
  const ns = 'http://www.w3.org/2000/svg';
  let p2 = svg.querySelector('.slip-heart'), p3 = svg.querySelector('.slip-tail');
  if (!p2) { p2 = doc.createElementNS(ns, 'path'); p2.setAttribute('class', 'slip-heart'); svg.appendChild(p2); }
  if (!p3) { p3 = doc.createElementNS(ns, 'path'); p3.setAttribute('class', 'slip-tail'); svg.appendChild(p3); }
  const t = 136;   // 心尖
  p2.setAttribute('d',
    'M' + (cx - 18) + ' ' + base + ' L' + cx + ' ' + t +
    ' C' + (cx - 10) + ' ' + (t - 12) + ' ' + (cx - 46) + ' ' + (t - 34) + ' ' + (cx - 46) + ' ' + (t - 60) +
    ' C' + (cx - 46) + ' ' + (t - 84) + ' ' + (cx - 12) + ' ' + (t - 90) + ' ' + cx + ' ' + (t - 66) +
    ' C' + (cx + 12) + ' ' + (t - 90) + ' ' + (cx + 46) + ' ' + (t - 84) + ' ' + (cx + 46) + ' ' + (t - 60) +
    ' C' + (cx + 46) + ' ' + (t - 34) + ' ' + (cx + 10) + ' ' + (t - 12) + ' ' + cx + ' ' + t +
    ' L' + (cx + 18) + ' ' + base);
  p2.style.stroke = 'var(--red)';
  p3.setAttribute('d', 'M' + (cx + 18) + ' ' + base + ' L872 ' + base);
  [p1, p2, p3].forEach(setLen);
  p1.style.animationDuration = '2.4s'; p1.style.animationDelay = '1.2s';
  p2.style.animationDuration = '1.1s'; p2.style.animationDelay = '3.6s';
  p3.style.animationDuration = '.5s';  p3.style.animationDelay = '4.7s';
  void slip.offsetWidth;
  slip.classList.add('open');
  setTimeout(() => slip.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }), 200);
  scheduleLayout();

  const btn = $('#slipBtn'), stamp = $('#slipStamp');
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    audio.init();
    stamp.classList.add('on');
    sfx.chime();
    bump(2);
    const r = slip.getBoundingClientRect();
    feathers(r.left + r.width / 2, r.top + 10, 7);
    store.set('promise', true);
    store.set('visits', visits);
    await wait(1500);
    const dialog = $('#dialog');
    if (dialog) dialog.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    await wait(reduced ? 0 : 600);
    await say(['……哦。', '那我等你。']);
  }, { once: false });
}

/* ================= 全局事件 ================= */
function initGlobal() {
  $('#soundBtn').addEventListener('click', () => { audio.init(); ambient.toggle(); sfx.tick(); });
  syncSoundBtn();

  const m = $('#modal');
  m.addEventListener('click', e => { if (e.target.closest('[data-close]')) modal.close(); });
  doc.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOpen) modal.close(); });

  doc.addEventListener('pointerdown', () => { if (started) audio.init(); }, { passive: true });
  doc.addEventListener('click', e => {
    if (!started || e.target.closest('#gameMount, #intro, #modal, #nav, #hud')) return;
    sparks(e.clientX, e.clientY);
  });

  window.addEventListener('resize', scheduleLayout);
  window.addEventListener('load', scheduleLayout);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(scheduleLayout);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleLayout).observe(main);
}

initIntro();
initSignal();
initChart();
initTalk();
initGlobal();
layout();
requestAnimationFrame(frame);

})();
