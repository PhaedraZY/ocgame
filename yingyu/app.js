/* ================= 樱宇 · Cherry Cosmos ================= */
(() => {
'use strict';

/* ---------- 角色资料（可以直接改这里） ---------- */
const PROFILE = {
  fields: [
    ['名字', '樱宇', 'Ying Yu', true],
    ['种族', '樱桃星人 · 宇宙见习天使'],
    ['生日', '6 月 6 日 · 樱桃成熟的季节'],
    ['身高', '大约三颗樱桃叠起来那么高'],
    ['住址', '樱桃宇宙 · 第 3 号轨道 · 圆窗小屋'],
    ['能力', '让樱桃绕着光环公转'],
  ],
  likes: ['樱桃汽水', '圆圆的东西', '数星星', '红色蝴蝶结', '软软的云', '来做客的你'],
  dislikes: ['樱桃核卡牙', '黑洞（会吸走樱桃）', '早起'],
  catchphrase: '「今天也是甜甜的一天～🍒」',
};

const HOTSPOTS = [
  [46, 4, '公转樱桃', '三颗樱桃沿着光环轨道转圈圈，名字分别叫<b>小甜、小酸、小圆</b>。她开心的时候，它们会转得特别快。'],
  [62, 12, '樱桃光环', '其实不是天使光环，而是樱桃们的<b>轨道</b>。所以它总是有一点点歪。'],
  [45, 28, '头顶小樱桃', '发旋上长着的那一颗，就是她<b>出生时的那颗樱桃</b>。千万不能摘！'],
  [86, 31, '叶子发饰', '樱桃梗上的两片嫩叶，会随着心情<b>竖起来或耷拉下去</b>。'],
  [82, 46, '星球发夹', '蓝粉渐变的小星球，是她在宇宙里<b>捡到的第一颗星星</b>。'],
  [8, 60, '卷卷发辫', '两侧一圈一圈的卷卷辫，像<b>樱桃树的年轮</b>，每长大一岁就多一圈。'],
  [42, 55, '樱桃红瞳', '红红圆圆的眼睛，开心的时候会<b>亮晶晶</b>，难过的时候会变成酸樱桃色。'],
  [52, 80, '红色细蝴蝶结', '白色荷叶边小斗篷配一条细细的<b>红蝴蝶结</b>，是她最正式的出门装。'],
  [50, 96, '樱桃小鞋', '鞋尖缀着两颗小樱桃，走路时会发出很轻很轻的「<b>啵、啵</b>」声。'],
];

const PALETTE = [
  ['樱桃红', '#E2363F'], ['可可棕', '#8C6B5E'], ['奶油白', '#FFF8F0'],
  ['嫩叶绿', '#7DB65B'], ['星球蓝', '#9AD8F0'], ['泡泡粉', '#F2A7D8'],
];

const HERO_LINES = [
  '你好呀，旅人！欢迎来到樱桃宇宙～',
  '头上这三颗樱桃叫 小甜、小酸、小圆！',
  '别戳啦～樱桃要转晕了 @_@',
  '今天也是甜甜的一天～',
  '嘘……光环其实是樱桃的轨道哦',
  '往下漂流，可以来我的房间玩！',
];

const DIARY = [
  { date: 'Day 1 · 晴', img: 'assets/yingyu.png', text: '我是从一颗樱桃里醒过来的。四周黑黑的，只有头顶的光环在慢慢转。数了数，上面挂着三颗樱桃——太好了，我不是一个人。' },
  { date: 'Day 7 · 有流星', img: 'assets/shoes.png', text: '给三颗樱桃起了名字：小甜、小酸、小圆。小酸有点调皮，总抢着转到最前面。今天有流星飞过，我许愿想要一个自己的房间。' },
  { date: 'Day 23 · 多云', img: 'assets/dress.png', text: '用星星的边角料搭好了小房间！窗户一定要是圆的，因为月亮是圆的、樱桃是圆的，开心的心情也是圆的。顺便做了一条新裙子。' },
  { date: 'Day 42 · 甜', img: 'assets/yingyu.png', text: '今天有人敲门了——是你吗？如果你读到了这里，那我们就是朋友啦。下次来记得带一颗樱桃，我请你喝樱桃汽水。' },
];

const DEFAULT_WISHES = [
  { t: '希望樱桃永远都是甜的', x: 18, y: 22 },
  { t: '想和樱宇一起看一次流星雨', x: 72, y: 16 },
  { t: '明天也要好好吃饭！', x: 40, y: 40 },
  { t: '希望每个旅人都平平安安', x: 85, y: 44 },
  { t: '想要一个会发光的蝴蝶结', x: 10, y: 52 },
  { t: '小酸不要再转那么快了', x: 58, y: 8 },
];

/* ---------- utils ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const store = {
  get(k, d) { try { const v = localStorage.getItem('yingyu.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('yingyu.' + k, JSON.stringify(v)); } catch {} },
};
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
function sparks(x, y, n = 7, chars = ['✦', '♥', '•', '✧']) {
  const colors = ['#e2363f', '#ff8a9a', '#ffd1dc', '#9ad8f0', '#ffe28a', '#7db65b'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.textContent = chars[i % chars.length];
    const a = rand(0, Math.PI * 2), d = rand(30, 80);
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.color = colors[i % colors.length];
    s.style.fontSize = rand(10, 18) + 'px';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d - 20 + 'px');
    s.style.setProperty('--r', rand(-180, 180) + 'deg');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 950);
  }
}

/* ---------- audio: 樱桃音乐盒 ---------- */
const Audio = (() => {
  let ctx, master, musicGain, on = false, timer, step = 0, nextTime = 0;
  const STEP = 0.3;
  const MEL = [76,79,81,79, 76,74,72,0, 74,76,79,76, 74,72,74,0, 76,79,84,83, 81,79,76,0, 74,76,72,74, 72,0,0,0];
  const BASS = { 0: 48, 8: 53, 16: 57, 24: 55 };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
  }
  function pluck(freq, t, dur = 1.4, vol = .18, dest = master, type = 'sine') {
    if (!ctx) return;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o2.type = 'triangle'; o2.frequency.value = freq * 2;
    const g2 = ctx.createGain(); g2.gain.value = .25;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + .25) {
      const s = step % MEL.length;
      if (MEL[s]) pluck(hz(MEL[s]), nextTime, 1.3, .16, musicGain);
      if (BASS[s]) pluck(hz(BASS[s]), nextTime, 2.4, .12, musicGain, 'triangle');
      nextTime += STEP; step++;
    }
  }
  function start() {
    init(); if (!ctx || on) return; on = true;
    nextTime = ctx.currentTime + .1;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1);
    timer = setInterval(schedule, 90); schedule();
    sync();
  }
  function stop() {
    if (!ctx || !on) return; on = false; clearInterval(timer);
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + .4);
    sync();
  }
  function sync() {
    $('#soundBtn').classList.toggle('off', !on);
    $('#roomEl').classList.toggle('music', on);
  }
  const sfx = {
    pop() { init(); if (ctx) pluck(hz(84 + Math.floor(rand(0, 5))), ctx.currentTime, .4, .12); },
    catch(n = 0) { init(); if (ctx) { const t = ctx.currentTime; pluck(hz(79 + (n % 5) * 2), t, .35, .13); } },
    gold() { init(); if (!ctx) return; const t = ctx.currentTime; [84, 88, 91, 96].forEach((m, i) => pluck(hz(m), t + i * .06, .6, .12)); },
    hit() { init(); if (!ctx) return; const t = ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(50, t + .3); g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + .35); o.connect(g); g.connect(master); o.start(t); o.stop(t + .4); },
    chime() { init(); if (!ctx) return; const t = ctx.currentTime; [72, 76, 79, 84, 88].forEach((m, i) => pluck(hz(m), t + i * .09, 1.6, .1)); },
  };
  return { init, start, stop, toggle() { on ? stop() : start(); return on; }, get on() { return on; }, sfx };
})();

/* ---------- starfield ---------- */
(() => {
  const c = $('#starfield'), x = c.getContext('2d');
  let w, h, dpr, stars = [], mx = 0, my = 0, shoot = null;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(w * h / 5200);
    stars = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, z: rand(.2, 1), p: rand(0, 6.28), s: rand(.6, 1.6), hue: Math.random() < .12 ? (Math.random() < .5 ? '#ffb3c3' : '#b8e6ff') : '#fff' }));
  }
  addEventListener('resize', resize); resize();
  addEventListener('mousemove', e => { mx = e.clientX / w - .5; my = e.clientY / h - .5; });
  function frame(t) {
    x.clearRect(0, 0, w, h);
    const sy = scrollY;
    for (const s of stars) {
      const px = (s.x - mx * 30 * s.z + w) % w;
      const py = ((s.y - sy * .08 * s.z - my * 30 * s.z) % h + h) % h;
      const a = .35 + .65 * Math.abs(Math.sin(t / 1000 * s.s + s.p));
      x.globalAlpha = a * s.z; x.fillStyle = s.hue;
      x.beginPath(); x.arc(px, py, s.z * 1.6, 0, 6.28); x.fill();
    }
    if (!shoot && Math.random() < .004) shoot = { x: rand(w * .2, w), y: rand(0, h * .4), l: 0 };
    if (shoot) {
      shoot.l += 14; const len = 120;
      const gx = shoot.x - shoot.l, gy = shoot.y + shoot.l * .5;
      const g = x.createLinearGradient(gx, gy, gx + len, gy - len * .5);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#fff0');
      x.globalAlpha = Math.max(0, 1 - shoot.l / 600); x.strokeStyle = g; x.lineWidth = 2;
      x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + len, gy - len * .5); x.stroke();
      if (shoot.l > 600) shoot = null;
    }
    x.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ---------- cursor & click sparks ---------- */
(() => {
  const cur = $('#cursor');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.body.classList.add('has-cursor');
    addEventListener('mousemove', e => {
      cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
      cur.classList.toggle('hover', !!e.target.closest('a,button,.item,.hot,.wstar,#heroChar,.swatch,input'));
    });
  }
  addEventListener('click', e => { if (!e.target.closest('#gameCanvas,input')) sparks(e.clientX, e.clientY, 6); });
})();

/* ---------- intro ---------- */
(() => {
  const intro = $('#intro'), lines = $$('#introText p'), btn = $('#introBtn');
  lines.forEach((p, i) => setTimeout(() => p.classList.add('show'), 500 + i * 1100));
  setTimeout(() => btn.classList.add('show'), 500 + lines.length * 1100);
  let entered = false;
  function enter(fast) {
    if (entered) return; entered = true;
    Audio.init(); Audio.start(); Audio.sfx.chime();
    const ch = $('#introCherry');
    ch.classList.add('drop');
    setTimeout(() => $('#splash').classList.add('go'), fast ? 0 : 550);
    setTimeout(() => {
      intro.classList.add('gone'); document.body.classList.remove('locked');
      $('#nav').classList.add('show');
      setTimeout(() => heroSay('你好呀，旅人！欢迎来到樱桃宇宙～'), 900);
    }, fast ? 300 : 1100);
    setTimeout(() => { intro.remove(); $('#splash').remove(); }, 3000);
  }
  btn.addEventListener('click', () => enter());
  $('#introCherry').addEventListener('click', () => enter());
  $('#introSkip').addEventListener('click', () => enter(true));
})();

/* ---------- nav + reveal ---------- */
(() => {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));
  const links = $$('.nav a');
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.dataset.sec === e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section').forEach(s => so.observe(s));
  $('#soundBtn').addEventListener('click', () => toast(Audio.toggle() ? '🎵 樱桃音乐盒 · 开' : '🔇 音乐盒休息中'));
})();

/* ---------- hero ---------- */
let heroTimer;
function heroSay(msg) {
  const b = $('#heroBubble'); b.textContent = msg; b.classList.add('show');
  clearTimeout(heroTimer); heroTimer = setTimeout(() => b.classList.remove('show'), 3200);
}
(() => {
  const stage = $('#planetStage'), wrap = $('#heroChar');
  const orbs = [0, 2.09, 4.19].map(off => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 40 46'); el.setAttribute('class', 'orbiter');
    el.innerHTML = '<use href="#one-cherry"/>';
    stage.appendChild(el); return { el, off };
  });
  let ang = 0, speed = .5, last = performance.now(), li = 0;
  const tilt = -12 * Math.PI / 180;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    speed += (.5 - speed) * dt * 1.5; ang += speed * dt;
    const rx = stage.clientWidth * .43, ry = rx * .3;
    for (const o of orbs) {
      const a = ang + o.off, cx = Math.cos(a) * rx, cy = Math.sin(a) * ry;
      const X = cx * Math.cos(tilt) - cy * Math.sin(tilt), Y = cx * Math.sin(tilt) + cy * Math.cos(tilt);
      const depth = (Math.sin(a) + 1) / 2;
      o.el.style.transform = `translate(${X}px, ${Y + 10}px) scale(${.7 + depth * .55}) rotate(${a * 40}deg)`;
      o.el.style.zIndex = Math.sin(a) > 0 ? 6 : 4;
      o.el.style.opacity = .65 + depth * .35;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  wrap.addEventListener('click', e => {
    speed = 6; li = (li + 1) % HERO_LINES.length; heroSay(HERO_LINES[li]);
    wrap.classList.remove('boing'); void wrap.offsetWidth; wrap.classList.add('boing');
    sparks(e.clientX, e.clientY, 10, ['🍒', '✦', '♥']); Audio.sfx.pop();
  });
})();

/* ---------- profile ---------- */
(() => {
  $('#fields').innerHTML = PROFILE.fields.map(([k, v, s, big]) =>
    `<div><dt>${k}</dt><dd class="${big ? 'big' : ''}">${v}${s ? `<small>${s}</small>` : ''}</dd></div>`).join('');
  $('#likes').innerHTML = PROFILE.likes.map(t => `<span>${t}</span>`).join('');
  $('#dislikes').innerHTML = PROFILE.dislikes.map(t => `<span>${t}</span>`).join('');
  $('#catchphrase').textContent = PROFILE.catchphrase;

  const stage = $('#featureStage'), note = $('#featureNote');
  HOTSPOTS.forEach(([x, y, title, text], i) => {
    const b = document.createElement('button');
    b.className = 'hot'; b.style.left = x + '%'; b.style.top = y + '%'; b.textContent = i + 1;
    const show = () => {
      $$('.hot', stage).forEach(h => h.classList.remove('on')); b.classList.add('on');
      note.innerHTML = `<b>No.${i + 1} ${title}</b>　${text}`;
    };
    b.addEventListener('mouseenter', show); b.addEventListener('click', () => { show(); Audio.sfx.pop(); });
    stage.appendChild(b);
  });
  $('#palette').innerHTML = PALETTE.map(([n, c]) => `<button class="swatch" data-c="${c}"><i style="background:${c}"></i>${n}<em>${c}</em></button>`).join('');
  $$('.swatch').forEach(s => s.addEventListener('click', () => {
    navigator.clipboard?.writeText(s.dataset.c).catch(() => {});
    toast(`已复制 ${s.dataset.c} ✦`);
  }));
})();

/* ---------- modal ---------- */
function openModal(html) {
  $('#modalBody').innerHTML = html; $('#modal').classList.add('open');
}
function closeModal() { $('#modal').classList.remove('open'); }
$('#modalClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------- room ---------- */
const Room = (() => {
  const room = $('#roomEl'), char = $('#roomChar'), bubble = $('#roomBubble');
  const items = $$('.item', room);
  const found = new Set(store.get('found', []));
  let pos = 28, busy = false, bubbleT, plantStage = store.get('plant', 0), lineIdx = {};
  $('#foundTotal').textContent = items.length;

  function say(msg, ms = 3400) {
    bubble.textContent = msg; bubble.classList.add('show');
    clearTimeout(bubbleT); bubbleT = setTimeout(() => bubble.classList.remove('show'), ms);
  }
  function updateFound() {
    items.forEach(it => it.classList.toggle('found', found.has(it.dataset.id)));
    $('#foundNum').textContent = found.size;
    $('#foundBar').style.width = (found.size / items.length * 100) + '%';
  }
  function walkTo(x) {
    return new Promise(res => {
      if (Math.abs(x - pos) < 2) return res();
      char.classList.toggle('left', x < pos);
      char.classList.add('walk'); char.classList.remove('sleep');
      char.style.left = x + '%'; pos = x;
      setTimeout(() => { char.classList.remove('walk'); res(); }, 1100);
    });
  }
  function renderJar() {
    const n = store.get('jar', 0), g = $('#jarCherries');
    const shown = Math.min(n, 14);
    let h = '';
    for (let i = 0; i < shown; i++) {
      const row = Math.floor(i / 4), col = i % 4;
      const cx = 740 + col * 13 + (row % 2) * 6, cy = 216 - row * 12;
      h += `<circle cx="${cx}" cy="${cy}" r="6.5" fill="#e2363f"/><circle cx="${cx - 2}" cy="${cy - 2}" r="1.8" fill="#fff" opacity=".8"/>`;
    }
    g.innerHTML = h;
  }
  function renderPlant() {
    const g = $('#plantFruit');
    g.innerHTML = [
      '',
      '<g stroke="none"><circle cx="848" cy="128" r="5" fill="#fff"/><circle cx="855" cy="124" r="5" fill="#fff"/><circle cx="853" cy="132" r="5" fill="#fff"/><circle cx="851" cy="128" r="3" fill="#ffe28a"/></g>',
      '<circle cx="852" cy="132" r="9" fill="#a8d77f" stroke="#6b9c47" stroke-width="2.5"/>',
      '<use href="#one-cherry" x="836" y="112" width="34" height="40"/>',
    ][plantStage];
  }
  const LINES = {
    window: ['那颗蓝粉色的小星球，每天都会绕着我的窗户转一圈。', '看！流星！快许愿～', '窗户是圆的，因为月亮也是圆的。'],
    lamp: [],
    scope: [], closet: [], frame: [], diary: [],
    music: [],
    bed: ['呼……再睡五分钟……', '被子上的点点是我一颗一颗缝的哦。', 'zzz……樱桃汽水……zzz'],
    jar: [],
    plant: [],
  };
  const ACTIONS = {
    window() { const s = $('#shootStar'); s.classList.remove('go'); void s.getBoundingClientRect(); s.classList.add('go'); },
    lamp() {
      const dark = room.classList.toggle('dark');
      say(dark ? '关灯啦～墙上的夜光星星亮起来了！' : '开灯！星球灯又亮起来啦～');
      return true;
    },
    music() {
      const on = Audio.toggle();
      say(on ? '♪ 这是我最喜欢的樱桃音乐盒～' : '唱片休息一下……');
      return true;
    },
    bed() { setTimeout(() => char.classList.add('sleep'), 50); setTimeout(() => char.classList.remove('sleep'), 3600); },
    jar() {
      const n = store.get('jar', 0);
      say(n ? `罐子里存了 ${n} 颗樱桃！${n >= 50 ? '够做一大杯樱桃汽水了！' : '再去流星雨那里接一点吧～'}` : '空空的……去「樱桃流星雨」帮我接点樱桃回来吧！');
      return true;
    },
    plant() {
      plantStage = (plantStage + 1) % 4;
      const msgs = ['摘下来啦！放进罐子里～', '开花了！小小的白花～', '结出一颗青青的果子！', '变红了！是樱桃！'];
      if (plantStage === 0) { store.set('jar', store.get('jar', 0) + 1); renderJar(); updateJarStat(); }
      store.set('plant', plantStage); renderPlant();
      say(msgs[plantStage]); return true;
    },
    closet() { say('要看看我的衣柜吗？'); setTimeout(openCloset, 500); return true; },
    scope() { say('今晚的樱桃座特别亮！'); setTimeout(openScope, 500); return true; },
    diary() { say('啊……那是我的日记，只能偷看一点点哦！'); setTimeout(() => openDiary(0), 600); return true; },
    frame() { say('这是我第一次拍照！'); setTimeout(openPolaroid, 500); return true; },
  };

  items.forEach(it => it.addEventListener('click', async () => {
    if (busy) return; busy = true;
    const id = it.dataset.id;
    Audio.sfx.pop();
    it.classList.remove('wiggle'); void it.getBoundingClientRect(); it.classList.add('wiggle');
    await walkTo(+it.dataset.x);
    const handled = ACTIONS[id]?.();
    if (!handled) {
      const arr = LINES[id] || ['……？']; lineIdx[id] = ((lineIdx[id] ?? -1) + 1) % arr.length;
      say(arr[lineIdx[id]]);
    }
    const isNew = !found.has(id); found.add(id); store.set('found', [...found]); updateFound();
    if (isNew && found.size === items.length && !store.get('letter', false)) {
      store.set('letter', true); setTimeout(openLetter, 2600);
    }
    busy = false;
  }));

  updateFound(); renderJar(); renderPlant();
  setTimeout(() => say('欢迎来我的房间！随便摸摸看～'), 400);
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { say('欢迎来我的房间！随便摸摸看～'); io.disconnect(); } }, { threshold: .5 });
  io.observe(room);
  return { renderJar };
})();

function openCloset() {
  openModal(`<h3><small>my little closet</small>樱宇的衣柜</h3>
  <div class="closet">
    <div class="closet-rack"><img class="dress" src="assets/dress.png" alt="裙子"><br><img class="shoes" src="assets/shoes.png" alt="鞋子"></div>
    <ul>
      <li>白色荷叶边小斗篷，领口系一条红色细蝴蝶结</li>
      <li>樱桃红的蓬蓬短裙，下摆是软软的白花边</li>
      <li>咖啡色条纹短袜，配缀着樱桃的小鞋</li>
      <li>配饰：叶子发绳 · 星球发夹 · 卷卷发辫</li>
      <li style="color:#e2363f">今天也穿这一套出门吧！</li>
    </ul>
  </div>`);
}
function openScope() {
  const L = [[110, 200], [150, 130], [182, 72]];
  const ring = (cx, cy, r, n, off = 0) => Array.from({ length: n }, (_, i) => { const a = off + i / n * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const c1 = ring(108, 220, 46, 6, -1.2), c2 = ring(212, 228, 40, 6, -1.9);
  const poly = pts => pts.concat([pts[0]]).map(p => p.join(',')).join(' ');
  const all = [...c1, ...c2, [182, 72], [150, 120], [205, 130], [232, 58]];
  let bg = '';
  for (let i = 0; i < 60; i++) bg += `<circle cx="${rand(0, 320)}" cy="${rand(0, 320)}" r="${rand(.4, 1.3)}" fill="#fff" opacity="${rand(.2, .7)}"/>`;
  openModal(`<h3><small>through the telescope</small>樱桃座 · Cerasus</h3>
  <div class="scope-view"><svg viewBox="0 0 320 320">${bg}
    <g fill="none" stroke="#ffd6e0" stroke-width="1.6" stroke-linecap="round" opacity=".9">
      <polyline class="cline" points="${poly(c1)}"/><polyline class="cline" points="${poly(c2)}"/>
      <polyline class="cline" points="${c1[1].join(',')} 150,120 182,72 205,130 ${c2[1].join(',')}"/>
      <polyline class="cline" points="182,72 232,58 214,92 182,72"/>
    </g>
    ${all.map((p, i) => `<circle class="cstar" cx="${p[0]}" cy="${p[1]}" r="${i % 3 ? 3 : 4.2}" fill="#fff6c8" style="animation-delay:${-i * .3}s;filter:drop-shadow(0 0 4px #ffb3c6)"/>`).join('')}
  </svg></div>
  <p style="text-align:center">由 16 颗星星组成，只有在樱宇的望远镜里才看得见。<br>传说这两颗樱桃是一对好朋友，永远不会分开。</p>`);
}
function openDiary(i) {
  const d = DIARY[i];
  openModal(`<h3><small>secret diary · ${i + 1}/${DIARY.length}</small>樱宇的日记</h3>
  <div class="diary diary-turn">
    <div class="diary-page l"><div class="date">${d.date}</div><img src="${d.img}" alt=""></div>
    <div class="diary-page">${d.text}</div>
  </div>
  <div class="diary-nav">
    <button class="btn ghost" id="dPrev" ${i === 0 ? 'style="visibility:hidden"' : ''}>← 上一页</button>
    <span style="font-family:var(--f-hand);font-size:20px;color:#b39ba5">${i + 1} / ${DIARY.length}</span>
    <button class="btn" id="dNext">${i === DIARY.length - 1 ? '合上日记 ♥' : '下一页 →'}</button>
  </div>`);
  $('#dPrev').onclick = () => { Audio.sfx.pop(); openDiary(i - 1); };
  $('#dNext').onclick = () => { Audio.sfx.pop(); i === DIARY.length - 1 ? closeModal() : openDiary(i + 1); };
}
function openPolaroid() {
  openModal(`<h3><small>first photo</small>墙上的照片</h3>
  <div class="polaroid"><div class="pic"><img src="assets/yingyu.png" alt=""></div><span>first photo ✦ day 30</span></div>
  <p style="text-align:center;margin-top:10px">第一次拍照的时候太紧张了，小酸转得太快，糊掉了一点点。<br>不过这是她最喜欢的一张。</p>`);
}
function openLetter() {
  Audio.sfx.chime();
  openModal(`<h3><small>you found everything!</small>一封樱桃味的信</h3>
  <div class="letter">亲爱的旅人：<br>
  你把我房间里的每一个角落都摸遍啦！窗户、望远镜、衣柜、还有那本不能给别人看的日记（脸红）……<br>
  在樱桃宇宙，被认真看过的东西都会变得更甜一点。所以谢谢你，今天的我是全宇宙最甜的樱桃。<br>
  下次再来玩吧，我会把罐子装满等你！
  <div class="sign">—— 樱宇 🍒</div></div>`);
}

/* ---------- game: 樱桃流星雨 ---------- */
function updateJarStat() {
  $('#jarTotal').textContent = store.get('jar', 0);
  $('#bestScore').textContent = store.get('best', 0);
}
(() => {
  const W = 900, H = 520;
  const cv = $('#gameCanvas'), x = cv.getContext('2d'), over = $('#gameOver');
  const img = new Image(); img.src = 'assets/yingyu.png';
  let dpr = 1, running = false, visible = false, last = 0;
  let S;
  const bgStars = Array.from({ length: 90 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.5, 1.8), v: rand(4, 18), p: rand(0, 6) }));
  const keys = {};
  function fit() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit(); addEventListener('resize', fit);
  function reset() {
    S = { score: 0, hearts: 3, t: 60, items: [], parts: [], texts: [], px: W / 2, tx: W / 2, combo: 0, spawn: 0, el: 0, caught: 0, hurt: 0 };
  }
  reset();

  function toLocal(e) { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; }
  cv.addEventListener('pointermove', e => { if (S) S.tx = toLocal(e); });
  cv.addEventListener('pointerdown', e => { if (S) S.tx = toLocal(e); });
  addEventListener('keydown', e => {
    if (!running) return;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) { keys[e.key] = true; e.preventDefault(); }
  });
  addEventListener('keyup', e => { keys[e.key] = false; });

  function spawn() {
    const r = Math.random(), mp = .12 + S.el / 60 * .16;
    let type = 'cherry';
    if (r < mp) type = 'rock';
    else if (r < mp + .07) type = 'gold';
    else if (r < mp + .1 && S.hearts < 3) type = 'heart';
    S.items.push({ type, x: rand(40, W - 40), y: -40, vy: rand(140, 200) + S.el * 4.5, vx: rand(-20, 20), rot: rand(0, 6), vr: rand(-2, 2), s: type === 'rock' ? rand(20, 30) : 1 });
  }
  function burst(px, py, col, n = 10) {
    for (let i = 0; i < n; i++) { const a = rand(0, 6.28), v = rand(60, 220); S.parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 1, col, r: rand(2, 4.5) }); }
  }
  function floatText(px, py, t, col) { S.texts.push({ x: px, y: py, t, col, life: 1 }); }

  function drawCherry(cx, cy, rot, gold) {
    x.save(); x.translate(cx, cy); x.rotate(Math.sin(rot) * .3);
    x.strokeStyle = '#6b9c47'; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.moveTo(-9, 4); x.quadraticCurveTo(-6, -14, 4, -22); x.moveTo(10, 6); x.quadraticCurveTo(8, -10, 4, -22); x.stroke();
    x.fillStyle = '#8cc865'; x.beginPath(); x.ellipse(11, -22, 8, 4, -.4, 0, 6.28); x.fill();
    const body = gold ? '#ffcd4a' : '#e2363f', edge = gold ? '#d89a12' : '#a8202a';
    for (const [bx, by, br] of [[-10, 10, 12], [11, 12, 11]]) {
      x.fillStyle = body; x.strokeStyle = edge; x.lineWidth = 2.5;
      x.beginPath(); x.arc(bx, by, br, 0, 6.28); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.ellipse(bx - 4, by - 4, 3, 4, 0, 0, 6.28); x.fill();
    }
    if (gold) { x.shadowColor = '#ffe28a'; x.shadowBlur = 20; x.fillStyle = '#fff8'; x.beginPath(); x.arc(0, 0, 2, 0, 6.28); x.fill(); x.shadowBlur = 0; }
    x.restore();
  }
  function drawRock(it) {
    x.save(); x.translate(it.x, it.y);
    const g = x.createLinearGradient(0, -it.s * 3.5, 0, 0); g.addColorStop(0, '#ff8a4a00'); g.addColorStop(1, '#ffb36acc');
    x.fillStyle = g; x.beginPath(); x.moveTo(-it.s * .7, 0); x.lineTo(0, -it.s * 3.6); x.lineTo(it.s * .7, 0); x.fill();
    x.rotate(it.rot);
    x.fillStyle = '#8d8496'; x.strokeStyle = '#5f566a'; x.lineWidth = 3;
    x.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, r = it.s * (.82 + (i % 3) * .1); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#6f667a'; x.beginPath(); x.arc(-it.s * .3, -it.s * .2, it.s * .22, 0, 6.28); x.arc(it.s * .35, it.s * .25, it.s * .15, 0, 6.28); x.fill();
    x.restore();
  }
  function drawHeart(cx, cy, s, col = '#ff7fa3') {
    x.save(); x.translate(cx, cy); x.scale(s, s); x.fillStyle = col; x.strokeStyle = '#fff'; x.lineWidth = 2.5 / s;
    x.beginPath(); x.moveTo(0, 6); x.bezierCurveTo(-14, -4, -8, -16, 0, -8); x.bezierCurveTo(8, -16, 14, -4, 0, 6); x.fill(); x.stroke(); x.restore();
  }

  function drawScene(dt, t) {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1433'); g.addColorStop(.7, '#35244f'); g.addColorStop(1, '#5a2f55');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (const s of bgStars) {
      s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = rand(0, W); }
      x.globalAlpha = .4 + .6 * Math.abs(Math.sin(t / 900 + s.p)); x.fillStyle = '#fff';
      x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.28); x.fill();
    }
    x.globalAlpha = 1;
    // planet horizon
    x.fillStyle = '#2a1d42'; x.beginPath(); x.ellipse(W / 2, H + 380, W * .9, 420, 0, 0, 6.28); x.fill();
    x.strokeStyle = '#ffffff22'; x.lineWidth = 3; x.stroke();
    x.fillStyle = 'rgba(154,216,240,.25)'; x.beginPath(); x.arc(780, 90, 38, 0, 6.28); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 3; x.beginPath(); x.ellipse(780, 90, 62, 12, -.3, 0, 6.28); x.stroke();
  }
  function drawPlayer(t) {
    const pw = 112, ph = pw * 324 / 280, top = H - ph - 8;
    const bob = running ? Math.sin(t / 120) * 2 : Math.sin(t / 500) * 4;
    // halo catch hint
    x.strokeStyle = S.hurt > 0 ? 'rgba(255,90,90,.7)' : 'rgba(255,240,200,.55)'; x.lineWidth = 3;
    x.beginPath(); x.ellipse(S.px, top + 14 + bob, 46, 10, 0, 0, 6.28); x.stroke();
    if (S.hurt > 0 && Math.floor(t / 80) % 2) x.globalAlpha = .4;
    const lean = (S.tx - S.px) / 400;
    x.save(); x.translate(S.px, top + ph / 2 + bob); x.rotate(Math.max(-.15, Math.min(.15, lean)));
    if (img.complete) x.drawImage(img, -pw / 2, -ph / 2, pw, ph);
    x.restore(); x.globalAlpha = 1;
    return { cx: S.px, cy: top + 40 + bob, top };
  }
  function drawHUD() {
    for (let i = 0; i < 3; i++) drawHeart(30 + i * 30, 30, 1, i < S.hearts ? '#ff7fa3' : '#ffffff30');
    x.fillStyle = '#fff'; x.font = '600 26px Fredoka, sans-serif'; x.textAlign = 'right';
    x.fillText('🍒 ' + S.score, W - 20, 40);
    x.fillStyle = '#ffffff22'; x.fillRect(W / 2 - 150, 20, 300, 10);
    x.fillStyle = S.t < 10 ? '#ff6b74' : '#ffd1dc'; x.fillRect(W / 2 - 150, 20, 300 * Math.max(0, S.t) / 60, 10);
    x.textAlign = 'center'; x.font = '14px "ZCOOL KuaiLe", sans-serif'; x.fillStyle = '#ffffffaa';
    x.fillText(Math.ceil(Math.max(0, S.t)) + ' 秒', W / 2, 50);
    if (S.combo >= 3) { x.font = '22px "ZCOOL KuaiLe", sans-serif'; x.fillStyle = '#ffe28a'; x.fillText('连击 ×' + S.combo, W / 2, 80); }
  }

  function update(dt) {
    S.t -= dt; S.el += dt; S.hurt = Math.max(0, S.hurt - dt);
    const dir = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    if (dir) S.tx = Math.max(50, Math.min(W - 50, S.px + dir * 60));
    S.px += (S.tx - S.px) * Math.min(1, dt * 12);
    S.px = Math.max(50, Math.min(W - 50, S.px));
    S.spawn -= dt * 1000;
    if (S.spawn <= 0) { spawn(); S.spawn = Math.max(280, 640 - S.el * 6) * rand(.7, 1.2); }
    for (const p of S.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 1.6; }
    S.parts = S.parts.filter(p => p.life > 0);
    for (const t of S.texts) { t.y -= 50 * dt; t.life -= dt * 1.2; }
    S.texts = S.texts.filter(t => t.life > 0);
  }
  function endGame() {
    running = false;
    const best = store.get('best', 0), nb = S.score > best;
    if (nb) store.set('best', S.score);
    store.set('jar', store.get('jar', 0) + S.caught);
    updateJarStat(); Room.renderJar();
    const rank = S.score < 15 ? '樱桃见习生' : S.score < 35 ? '轨道小管家' : S.score < 60 ? '流星捕手' : '樱桃宇宙之主';
    $('#gameOverInner').innerHTML = `<h3>${S.hearts <= 0 ? '被陨石砸晕啦…' : '流星雨结束！'}</h3>
      <div class="score-big">${S.score}</div>
      <div class="rank">称号：${rank}${nb ? ' · 新纪录！' : ''}</div>
      <p>接到的 ${S.caught} 颗樱桃已经放进房间的罐子里啦 🍒</p>
      <button class="btn" id="gameStart">再来一次</button>`;
    $('#gameStart').onclick = start;
    over.classList.remove('hide');
    if (S.score >= 35) Audio.sfx.chime();
  }
  function start() {
    Audio.init(); reset(); running = true; over.classList.add('hide');
    cv.focus?.();
  }
  $('#gameStart').onclick = start;

  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    if (visible) {
      drawScene(dt, now);
      if (running) update(dt);
      const pl = drawPlayer(now);
      // items
      for (const it of S.items) {
        if (running) { it.y += it.vy * dt; it.x += it.vx * dt; it.rot += it.vr * dt; }
        if (it.type === 'rock') drawRock(it);
        else if (it.type === 'heart') drawHeart(it.x, it.y, 1.3);
        else drawCherry(it.x, it.y, it.rot + now / 300, it.type === 'gold');
        if (!running || it.dead) continue;
        const dx = it.x - pl.cx, dy = it.y - pl.cy;
        if (it.type === 'rock') {
          const dy2 = it.y - (pl.top + 75);
          if (dx * dx + dy2 * dy2 < (it.s + 38) ** 2) {
            it.dead = true; S.hearts--; S.combo = 0; S.hurt = 1; Audio.sfx.hit();
            burst(it.x, it.y, '#a59cb0', 14); floatText(it.x, it.y - 20, '好痛！', '#ff8a8a');
            if (S.hearts <= 0) { setTimeout(endGame, 400); running = false; }
          }
        } else if (dx * dx + dy * dy < 54 * 54) {
          it.dead = true;
          if (it.type === 'heart') { S.hearts = Math.min(3, S.hearts + 1); floatText(it.x, it.y, '+♥', '#ff9ab8'); burst(it.x, it.y, '#ff9ab8'); Audio.sfx.gold(); }
          else {
            S.combo++;
            const gain = (it.type === 'gold' ? 5 : 1) + (S.combo % 5 === 0 ? 3 : 0);
            S.score += gain; S.caught += it.type === 'gold' ? 3 : 1;
            floatText(it.x, it.y, '+' + gain + (S.combo % 5 === 0 ? ' 连击!' : ''), it.type === 'gold' ? '#ffe28a' : '#fff');
            burst(it.x, it.y, it.type === 'gold' ? '#ffcd4a' : '#e2363f');
            it.type === 'gold' ? Audio.sfx.gold() : Audio.sfx.catch(S.combo);
          }
        }
        if (it.y > H + 40) { it.dead = true; if (it.type === 'cherry' || it.type === 'gold') S.combo = 0; }
      }
      S.items = S.items.filter(it => !it.dead && it.y < H + 60);
      for (const p of S.parts) { x.globalAlpha = Math.max(0, p.life); x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28); x.fill(); }
      x.globalAlpha = 1;
      x.textAlign = 'center';
      for (const t of S.texts) { x.globalAlpha = Math.max(0, t.life); x.fillStyle = t.col; x.font = '22px "ZCOOL KuaiLe", sans-serif'; x.fillText(t.t, t.x, t.y); }
      x.globalAlpha = 1;
      if (running) { drawHUD(); if (S.t <= 0) endGame(); }
    }
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(cv);
  requestAnimationFrame(loop);
  updateJarStat();
})();

/* ---------- wish sky ---------- */
(() => {
  const sky = $('#wishSky'), tip = $('#wishTip');
  let wishes = store.get('wishes', null) || DEFAULT_WISHES.slice();
  function count() { $('#wishCount').textContent = `✦ 天上已经有 ${wishes.length} 颗愿望星`; }
  function addStar(w, fly) {
    const s = document.createElement('button');
    s.className = 'wstar'; s.textContent = '✦'; s.setAttribute('aria-label', w.t);
    const showTip = () => {
      tip.textContent = w.t; tip.style.left = s.style.left; tip.style.top = s.style.top; tip.classList.add('show');
    };
    s.addEventListener('mouseenter', showTip);
    s.addEventListener('mouseleave', () => tip.classList.remove('show'));
    s.addEventListener('click', () => { showTip(); Audio.sfx.pop(); });
    if (fly) {
      s.style.left = '50%'; s.style.top = '86%'; s.style.transform = 'scale(2.4)';
      sky.appendChild(s); void s.offsetWidth;
      s.classList.add('fly'); s.style.left = w.x + '%'; s.style.top = w.y + '%'; s.style.transform = '';
      setTimeout(() => { s.classList.remove('fly'); showTip(); setTimeout(() => tip.classList.remove('show'), 2400); }, 1850);
    } else {
      s.style.left = w.x + '%'; s.style.top = w.y + '%'; s.style.animationDelay = -rand(0, 3) + 's';
      sky.appendChild(s);
    }
  }
  wishes.forEach(w => addStar(w));
  count();
  $('#wishForm').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('#wishInput'), t = inp.value.trim();
    if (!t) { toast('先写下一个愿望吧 ✦'); inp.focus(); return; }
    const w = { t, x: Math.round(rand(6, 94)), y: Math.round(rand(8, 60)) };
    wishes.push(w); store.set('wishes', wishes); inp.value = '';
    addStar(w, true); count(); Audio.sfx.chime();
    const r = inp.getBoundingClientRect(); sparks(r.left + r.width / 2, r.top, 12, ['✦', '✧', '♥']);
  });
})();

})();
