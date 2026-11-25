(function () {
  'use strict';
  const D = window.KDATA, KS = window.KShared;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const main = $('#main'), nav = $('#nav'), toastEl = $('#toast');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- 课程索引 ----------
  const SEASON_ZH = ['第一季', '第二季', '第三季', '第四季'];
  const EPS = [];
  D.seasons.forEach((s, si) => s.episodes.forEach((e, i) => { e.season = s; e.sNo = si; e.no = i + 1; EPS.push(e); }));
  const EP = Object.fromEntries(EPS.map(e => [e.id, e]));
  const PACK = Object.fromEntries(D.packs.map(p => [p.id, p]));
  const epLabel = e => SEASON_ZH[e.sNo] + ' 第 ' + e.no + ' 集';
  const CHARS = {
    '서연': ['书妍', '#D9437A'], '민준': ['民俊', '#2456D3'], '하은': ['夏恩', '#C8690F'], '지호': ['志浩', '#12936C'],
    '엄마': ['妈妈', '#8A54D1'], '아빠': ['爸爸', '#5B6B82'], '팀장': ['组长', '#5B6B82'], '의사': ['医生', '#5B6B82'],
    '직원': ['店员', '#5B6B82'], '점원': ['店员', '#5B6B82'], '약사': ['药剂师', '#5B6B82'], '행인': ['路人', '#5B6B82'],
    '민지': ['民智', '#0E8FA8'], 'MC': ['主持人', '#5B6B82'], 'PD': ['导演', '#5B6B82'],
    '기자': ['记者', '#5B6B82'], '매니저': ['经纪人', '#5B6B82'], '배우': ['演员', '#B0245C'], '팬': ['粉丝', '#5B6B82']
  };

  // ---------- 逐词标注 ----------
  const PUNCT = /[.,!?…~"'“”‘’()\[\]]/g;
  const LEX = {};
  EPS.forEach(e => e.vocab.forEach((w, i) => { const k = w.id || w.ko; if (!LEX[k]) LEX[k] = { w: w, ep: e, i: i }; }));
  const parseGloss = str => str.split(' | ').map(t => t.split('+').map(x => {
    const f = x.split('/');
    return { ko: f[0], zh: f[1] || '', lemma: f[2] || '', key: f[2] || f[0], gram: /^（.*）$/.test(f[1] || '') };
  }));
  const LINE_G = {};
  EPS.forEach(e => {
    const g = (D.gloss || {})[e.id] || [];
    e.dialogue.forEach((l, i) => {
      if (!g[i]) return;
      const parsed = parseGloss(g[i]);
      if (parsed.length !== l.ko.split(' ').length) return;
      l.g = parsed; LINE_G[l.ko] = parsed;
    });
  });
  const lineHas = (l, key) => !!l.g && l.g.some(t => t.some(x => !x.gram && x.key === key));
  const shortZh = x => x.gram ? '<i>' + esc(x.zh.replace(/[（）]/g, '')) + '</i>' : esc(x.zh.replace(/（[^）]*）/g, '') || x.zh);
  // 歌曲的括号里是语法作用，不能省，改成灰字
  const songZh = x => x.gram ? '<i>' + esc(x.zh.replace(/[（）]/g, '')) + '</i>' : esc(x.zh).replace(/（([^）]*)）/g, ' <i>$1</i>');
  // 把一句台词渲染成一个个可以点的词。inter 为真时，每个词下面带中文
  function tokHtml(ko, g, o) {
    o = o || {};
    if (!g) return esc(ko);
    return ko.split(' ').map((t, i) => {
      const parts = g[i];
      const isNew = o.ep && parts.some(x => !x.gram && LEX[x.key] && LEX[x.key].ep === o.ep);
      const cls = 'tok' + (isNew ? ' new' : '') + (o.hi && parts.some(x => !x.gram && x.key === o.hi) ? ' hi' : '') + (o.inter ? ' ig' : '') + (o.click === false ? ' still' : '');
      const attr = o.click === false ? '' : ' data-t="' + i + '"';
      return o.inter ? '<span class="' + cls + '"' + attr + '><span class="ig-ko">' + esc(t) + '</span><span class="ig-zh">' + parts.map(o.song ? songZh : shortZh).join(' ') + '</span></span>'
        : '<span class="' + cls + '"' + attr + '>' + esc(t) + '</span>';
    }).join(' ');
  }
  // 点开一个词后显示的拆解：每一块的意思、原形、在哪一集学过
  function tokDetail(ko, g, i, ep) {
    const clean = ko.split(' ')[i].replace(PUNCT, ''), addable = [];
    const rows = g[i].map(x => {
      const lx = x.gram ? null : LEX[x.key];
      let extra = '';
      if (lx && lx.w.ko !== x.ko) extra += '<span class="tiny">原形 <span lang="ko">' + esc(lx.w.ko) + '</span>：' + esc(lx.w.zh) + '</span> ';
      else if (!lx && x.lemma && x.lemma !== x.ko && x.lemma.indexOf('(') < 0) extra += '<span class="tiny">原形 <span lang="ko">' + esc(x.lemma) + '</span></span> ';
      if (lx) {
        extra += lx.ep === ep ? '<span class="tag next">本集生词</span>' : '<a class="tag learned" href="#/e/' + lx.ep.id + '/3">' + epLabel(lx.ep) + '学过</a>';
        if (!S.cards['w:' + (lx.w.id || lx.w.ko)] && addable.indexOf(lx) < 0) addable.push(lx);
      }
      const say = lx ? KS.wordSay(lx.w) : (x.gram ? '' : x.ko);
      return '<div class="gpart' + (x.gram ? ' gram-part' : '') + '">' + (say ? pbtn(say, lx ? KS.vx(lx.i) : 'f') : '<span class="gdot"></span>') +
        '<div class="grow"><b lang="ko">' + esc(x.ko) + '</b>　' + esc(x.zh) + '　' + extra + '</div></div>';
    }).join('');
    return '<div class="gloss-box">' + (HANGUL.test(clean) ? '<div class="g-word">' + pbtn(clean, 'f') + '<b lang="ko">' + esc(clean) + '</b>' + (pronOf(clean) ? ' <span class="tiny">读作</span> ' + pronTag(clean) : ' <span class="tiny">读音和写法一样</span>') + '</div>' : '') +
      rows + '<div class="row gfoot">' +
      addable.map(lx => '<button class="btn sm" data-addw="' + esc(lx.w.id || lx.w.ko) + '">把 <span lang="ko">' + esc(lx.w.ko) + '</span> 加入复习</button>').join('') +
      '<a class="btn sm" target="_blank" rel="noopener" href="https://korean.dict.naver.com/kozhdict/#/search?query=' + encodeURIComponent(clean) + '">查 Naver 词典</a></div></div>';
  }
  const addWordByKey = key => { const lx = LEX[key]; return lx ? addCard(wordCard(lx.w, lx.i, epLabel(lx.ep))) : false; };

  // ---------- 进度存储 ----------
  const KEY = 'hangeoreum.v1';
  const DEF_SET = { rate: 1, veilZh: true, veilKo: false, reverse: false, inter: false };
  let S;
  function loadState() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { raw = {}; }
    S = Object.assign({ done: {}, cards: {}, srs: {}, log: {}, lab: {} }, raw);
    S.set = Object.assign({}, DEF_SET, raw.set);
  }
  loadState();
  const save = () => localStorage.setItem(KEY, JSON.stringify(S));
  const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const logAct = n => { const t = today(); S.log[t] = (S.log[t] || 0) + (n || 1); };

  function addCard(c, due) {
    if (S.cards[c.id]) return false;
    S.cards[c.id] = c;
    S.srs[c.id] = { due: due == null ? today() : due, ivl: 0, ease: 2.5, reps: 0, lapse: 0 };
    return true;
  }
  const wordCard = (w, i, src) => ({ id: 'w:' + (w.id || w.ko), kind: 'word', ko: w.ko, f: w.f || '', zh: w.zh, v: KS.vx(i), say: KS.wordSay(w), src: src });
  const lineCard = (l, src) => ({ id: 'l:' + l.ko, kind: 'line', ko: l.ko, zh: l.zh, v: l.v, src: src });
  const packCard = (x, i, p) => ({ id: 'w:' + x.ko, kind: 'word', ko: x.ko, zh: x.zh, v: KS.vx(i), say: x.say || x.ko, ex: x.ex || '', exzh: x.exzh || '', exSay: x.exSay || x.ex || '', exv: KS.vx(i + 1), src: p.zh });
  const dueIds = () => Object.keys(S.srs).filter(id => S.cards[id] && S.srs[id].due <= today());

  // 间隔重复：1 忘了，2 有点难，3 记得，4 太简单
  function schedule(r, s) {
    let ivl = s.ivl, ease = s.ease, reps = s.reps, lapse = s.lapse;
    if (r === 1) return { ivl: 0, ease: Math.max(1.3, ease - 0.2), reps: 0, lapse: lapse + 1 };
    if (r === 2) { ivl = reps === 0 ? 1 : Math.max(1, Math.round(ivl * 1.2)); ease = Math.max(1.3, ease - 0.15); }
    if (r === 3) ivl = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(ivl + 1, Math.round(ivl * ease));
    if (r === 4) { ivl = reps === 0 ? 3 : reps === 1 ? 6 : Math.max(ivl + 2, Math.round(ivl * ease * 1.3)); ease += 0.15; }
    return { ivl: ivl, ease: ease, reps: reps + 1, lapse: lapse };
  }
  const ivlLabel = d => d <= 0 ? '马上再来' : d === 1 ? '明天' : d < 30 ? d + ' 天后' : Math.round(d / 30) + ' 个月后';

  function streak() {
    let t = today(), n = 0;
    if (!S.log[t]) t--;
    while (S.log[t]) { n++; t--; }
    return n;
  }

  // ---------- 声音 ----------
  // 网上的静态版会先加载 audio-map.js（window.KSTATIC），没有本地服务，只能播放提前生成好的音频
  const STATIC = !!window.KSTATIC;
  const SERVER = !STATIC && location.protocol.indexOf('http') === 0;
  const AUDIO_MAP = STATIC ? window.KSTATIC.audio : null;
  // 同一句只要有任何一种声音的录音就用它（借用别处句子当例句时，声音参数可能不同）
  const staticUrl = (t, v) => { const k = AUDIO_MAP && (AUDIO_MAP[(v || 'f') + '|' + t] || AUDIO_MAP['f|' + t] || AUDIO_MAP['m|' + t] || AUDIO_MAP['f2|' + t] || AUDIO_MAP['m2|' + t] || AUDIO_MAP['m3|' + t] || AUDIO_MAP['f3|' + t]); return k ? 'audio/' + k + '.mp3' : ''; };
  let curAudio = null, curDone = null, token = 0, koVoice = null, warnedVoice = false;
  function loadVoices() { koVoice = speechSynthesis.getVoices().find(v => (v.lang || '').toLowerCase().indexOf('ko') === 0) || null; }
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

  function speak(t, r) {
    return new Promise(res => {
      if (!window.speechSynthesis) return res(false);
      if (!koVoice && !warnedVoice) { warnedVoice = true; toast(STATIC ? '这句没有提前录好的声音，你的浏览器也没有韩语语音，所以没法朗读。' : '浏览器没有韩语语音。双击“启动.bat”打开，就能用课程自带的声音。'); }
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'ko-KR'; u.rate = r; if (koVoice) u.voice = koVoice;
      u.onend = () => res(true); u.onerror = () => res(false);
      curDone = res;
      speechSynthesis.speak(u);
    });
  }
  function playOne(t, v, r) {
    r = r || S.set.rate;
    return new Promise(res => {
      curDone = res;
      const url = SERVER ? '/tts?v=' + encodeURIComponent(v || 'f') + '&t=' + encodeURIComponent(t) : staticUrl(t, v);
      if (!url) return speak(t, r).then(res);  // 静态版里没有这句的录音，就用浏览器自带的韩语语音
      const a = new Audio(url);
      a.playbackRate = r; a.preservesPitch = true;
      curAudio = a;
      let failed = false;
      a.onended = () => res(true);
      a.onerror = () => { if (failed || curAudio !== a) return; failed = true; curAudio = null; speak(t, r).then(res); };
      a.play().catch(err => { if (err && err.name === 'NotAllowedError') { toast('浏览器拦截了自动播放，请再点一次播放。'); stopAudio(); } });
    });
  }
  function playUrl(url) {
    return new Promise(res => {
      const a = new Audio(url); curAudio = a; curDone = res;
      a.onended = () => res(true); a.onerror = () => res(false);
      a.play().catch(() => res(false));
    });
  }
  function stopAudio() {
    token++;
    if (curAudio) { curAudio.onended = null; curAudio.onerror = null; curAudio.pause(); curAudio = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (curDone) { const d = curDone; curDone = null; d(false); }
    $$('.play.playing').forEach(b => b.classList.remove('playing'));
  }
  async function play(t, v, r, btn) {
    stopAudio();
    if (btn) btn.classList.add('playing');
    const ok = await playOne(t, v, r);
    if (btn) btn.classList.remove('playing');
    return ok;
  }
  async function playSeq(list, onStep) {
    stopAudio();
    const my = token;
    for (let i = 0; i < list.length; i++) {
      if (my !== token) return false;
      if (onStep) onStep(i);
      await playOne(list[i].t, list[i].v);
      if (my !== token) return false;
      await sleep(450);
    }
    if (onStep) onStep(-1);
    return true;
  }

  const ICON = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 1.8v12.4L14 8z"/></svg>';
  const pbtn = (t, v, cls) => '<button class="play ' + (cls || '') + '" data-say="' + esc(t) + '" data-v="' + (v || 'f') + '" title="播放" aria-label="播放">' + ICON + '</button>';
  const qbtn = (list, label) => '<button class="btn sm g-seq" data-seq="' + esc(JSON.stringify(list)) + '">▶ ' + esc(label) + '</button>';
  const sbtn = (t, v) => '<button class="play slow" data-say="' + esc(t) + '" data-v="' + (v || 'f') + '" data-slow="1" title="慢速播放" aria-label="慢速播放">慢</button>';

  // 播放一段歌曲原声，从 start 秒放到 end 秒
  function playClip(url, start, end, btn, rate) {
    stopAudio();
    if (btn) btn.classList.add('playing');
    return new Promise(res => {
      const a = new Audio(url);
      a.preload = 'auto'; a.preservesPitch = true;
      curAudio = a;
      let timer = 0, finished = false;
      const done = ok => { if (finished) return; finished = true; clearInterval(timer); if (btn) btn.classList.remove('playing'); res(ok); };
      curDone = done;
      a.addEventListener('loadedmetadata', () => { a.playbackRate = rate || 1; a.currentTime = start || 0; a.play().catch(() => done(false)); }, { once: true });
      a.onerror = () => done(false);
      a.onended = () => done(true);
      if (end) timer = setInterval(() => { if (a.currentTime >= end) { a.pause(); if (curAudio === a) curAudio = null; curDone = null; done(true); } }, 40);
    });
  }
  const cbtn = (url, s, e, cls) => '<button class="play ' + (cls || '') + '" data-clip="' + esc(url) + '" data-cs="' + s + '" data-ce="' + e + '" title="播放原曲这一句" aria-label="播放原曲这一句">' + ICON + '</button>';
  const playCard = (c, btn) => c.clip ? playClip(c.clip.url, c.clip.s, c.clip.e, btn) : play(c.say || c.ko, c.v, 0, btn);

  document.addEventListener('click', e => {
    const wj = e.target.closest('[data-wjump]');
    if (wj) {
      e.preventDefault(); e.stopPropagation();
      S.wf = Object.assign({ l: 'ㄱ', st: 'all', t: 'all' }, S.wf || {}, { q: wj.dataset.wjump, st: 'all', t: 'all' }); save();
      if (location.hash === '#/words') { viewWords(); setTimeout(() => { const r = $('.wb-row[data-w="' + CSS.escape(wj.dataset.wjump) + '"] .grow'); if (r) r.click(); }, 0); }
      else location.hash = '#/words';
      return;
    }
    const tb = e.target.closest('.term');
    const pop = $('#termPop');
    if (tb) {
      e.preventDefault();
      const d = (D.terms || {})[tb.dataset.term];
      if (!d) return;
      const box = pop || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'termPop', role: 'dialog' }));
      box.innerHTML = '<b>' + esc(tb.dataset.term) + '</b><p>' + esc(d.d) + '</p>' + (d.ex ? '<p class="tiny" lang="ko">' + esc(d.ex) + '</p>' : '') +
        (d.link ? '<a href="' + d.link + '">' + esc(d.lt || '去看讲解') + ' →</a>' : '');
      const r = tb.getBoundingClientRect(), w = Math.min(300, innerWidth - 24);
      box.style.width = w + 'px';
      box.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left)) + 'px';
      box.style.top = (r.bottom + scrollY + 6) + 'px';
      box.hidden = false;
      return;
    }
    if (pop && !pop.hidden && !e.target.closest('#termPop')) pop.hidden = true;
    if (pop && e.target.closest('#termPop a')) pop.hidden = true;
    const cb = e.target.closest('[data-clip]');
    if (cb) { e.preventDefault(); playClip(cb.dataset.clip, +cb.dataset.cs, +cb.dataset.ce, cb); return; }
    const sq = e.target.closest('[data-seq]');
    if (sq) {
      e.preventDefault();
      if (sq.classList.contains('playing')) { stopAudio(); return; }
      const list = JSON.parse(sq.dataset.seq), box = sq.closest('.g-part, .g-pair') || sq.parentNode;
      const btns = $$('.play[data-say]', box);
      playSeq(list, i => {
        btns.forEach(x => x.classList.remove('playing'));
        sq.classList.toggle('playing', i >= 0);
        if (i < 0) return;
        const same = btns.filter(x => x.dataset.say === list[i].t), n = list.slice(0, i).filter(c => c.t === list[i].t).length;
        const hit = same[n] || same[0]; if (hit) hit.classList.add('playing');
      });
      return;
    }
    const b = e.target.closest('[data-say]');
    if (b) { e.preventDefault(); play(b.dataset.say, b.dataset.v, b.dataset.slow ? 0.7 : 0, b); return; }
    const v = e.target.closest('.veil');
    if (v) v.classList.remove('veil');
  });

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  // ---------- 路由 ----------
  let viewKeys = null, leave = null;
  document.addEventListener('keydown', e => {
    if (!viewKeys || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    viewKeys(e);
  });
  const routes = [
    [/^#\/?$/, viewToday],
    [/^#\/learn$/, viewLearn],
    [/^#\/e\/(\w+)(?:\/(\d))?$/, viewEpisode],
    [/^#\/t\/(\w+)(?:\/(\d))?$/, viewTopic],
    [/^#\/b\/(\w+)(?:\/(\d))?$/, viewBasic],
    [/^#\/review$/, viewReview],
    [/^#\/words$/, viewWords],
    [/^#\/words\/today(?:\/(\d))?$/, viewWordsToday],
    [/^#\/packs$/, viewPacks],
    [/^#\/pack\/(\w+)$/, viewPack],
    [/^#\/rules$/, viewRules],
    [/^#\/grammar$/, viewGrammar],
    [/^#\/lab$/, viewLab],
    [/^#\/v\/([\w-]+)$/, viewVideo],
    [/^#\/cards$/, viewCards],
    [/^#\/songs$/, viewSongs],
    [/^#\/song\/([\w-]+)(?:\/(\d))?$/, viewSong],
    [/^#\/settings$/, viewSettings]
  ];
  let routeSeq = 0;
  function route() {
    routeSeq++;
    stopAudio();
    if (leave) { leave(); leave = null; }
    viewKeys = null; main.onclick = null; main.oninput = null; main.onchange = null;
    const h = location.hash || '#/';
    let hit = false;
    for (const [re, fn] of routes) {
      const m = h.match(re);
      if (m) { fn.apply(null, m.slice(1)); hit = true; break; }
    }
    if (!hit) viewToday();
    renderNav();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  function renderNav() {
    const h = location.hash || '#/';
    const due = dueIds().length;
    // 网上的静态版没有歌曲（要本地服务），精听工作台只能用自己的字幕文件
    const items = [['#/', '今天'], ['#/learn', '课程'], ['#/review', '复习', due], ['#/words', '单词本'], ['#/packs', '表达包']]
      .concat(STATIC ? [] : [['#/songs', '歌曲']])
      .concat([['#/grammar', '语法速查'], ['#/rules', '音变速查'], null, ['#/lab', '精听工作台'], ['#/cards', '我的卡片'], ['#/settings', '设置']]);
    const on = href => href === '#/' ? (h === '#/' || h === '#' || h === '') :
      href === '#/learn' ? (h === href || h.indexOf('#/e/') === 0 || h.indexOf('#/t/') === 0 || h.indexOf('#/b/') === 0) :
        href === '#/packs' ? (h === href || h.indexOf('#/pack/') === 0) :
          href === '#/words' ? (h === href || h.indexOf('#/words/') === 0) :
          href === '#/songs' ? (h === href || h.indexOf('#/song/') === 0) :
            href === '#/lab' ? (h === href || h.indexOf('#/v/') === 0) : h === href;
    nav.innerHTML = items.map(it => it ? '<a href="' + it[0] + '" class="' + (on(it[0]) ? 'on' : '') + '"' + (on(it[0]) ? ' aria-current="page"' : '') + '><span>' + it[1] + '</span>' +
      (it[2] ? '<span class="badge">' + it[2] + '</span>' : '') + '</a>' : '<div class="sep"></div>').join('');
    $('#rate').textContent = $('#rate2').textContent = S.set.rate + '×';
    // 手机底部导航：最常用的四项，其余放进“更多”
    const main4 = ['#/', '#/learn', '#/review', '#/lab'];
    const rest = items.filter(it => it && main4.indexOf(it[0]) < 0);
    const restOn = rest.some(it => on(it[0]));
    const ICONS = { '#/': '今', '#/learn': '课', '#/review': '复', '#/lab': '听' };
    $('#tabbar').innerHTML = items.filter(it => it && main4.indexOf(it[0]) >= 0).map(it =>
      '<a href="' + it[0] + '" class="' + (on(it[0]) ? 'on' : '') + '"><i>' + ICONS[it[0]] + '</i><span>' + (it[0] === '#/lab' ? '精听' : it[1]) + '</span>' + (it[2] ? '<b>' + it[2] + '</b>' : '') + '</a>').join('') +
      '<button type="button" id="moreBtn" class="' + (restOn ? 'on' : '') + '" aria-expanded="false"><i>⋯</i><span>更多</span></button>';
    $('#moreGrid').innerHTML = rest.map(it => '<a href="' + it[0] + '" class="' + (on(it[0]) ? 'on' : '') + '">' + it[1] + '</a>').join('');
  }
  const closeMore = () => { $('#more').hidden = true; const b = $('#moreBtn'); if (b) b.setAttribute('aria-expanded', 'false'); };
  document.addEventListener('click', e => {
    if (e.target.closest('#moreBtn')) { const m = $('#more'); m.hidden = !m.hidden; e.target.closest('#moreBtn').setAttribute('aria-expanded', String(!m.hidden)); return; }
    if (e.target.closest('#more') && (e.target.id === 'more' || e.target.closest('#moreGrid a'))) closeMore();
  });
  window.addEventListener('hashchange', closeMore);
  const RATES = [0.75, 0.9, 1, 1.15];
  $('#rate2').addEventListener('click', () => $('#rate').click());
  $('#rate').addEventListener('click', () => {
    S.set.rate = RATES[(RATES.indexOf(S.set.rate) + 1) % RATES.length] || 1; save(); renderNav();
    toast('播放语速：' + S.set.rate + '×');
  });

  const nextEp = () => EPS.find(e => !S.done[e.id]);

  // ---------- 今天 ----------
  function viewToday() {
    const due = dueIds().length, nx = nextEp(), t = today(), nb = nextBasic();
    const doneToday = EPS.some(e => S.done[e.id] && S.done[e.id].d === t);
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(t - i);
    const max = Math.max(1, ...days.map(d => S.log[d] || 0));
    const wd = ['日', '一', '二', '三', '四', '五', '六'];
    main.innerHTML = '<div class="wrap">' +
      '<div class="page-head"><div class="cap xl pop" lang="ko">오늘도 한 걸음</div>' +
      '<p class="lede">每天三件事：先复习，再学一集新课，最后用真实的韩剧片段练耳朵。每天三十分钟，比周末突击三小时更有用。</p></div>' +
      '<ol class="today-steps">' +
      (nb ? '<li><div><h3>入门：' + esc(nb.zh) + '</h3><p class="muted small">' + esc(nb.group.zh) + ' 第 ' + nb.no + ' 课 / 共 ' + nb.group.lessons.length + ' 课。没学过韩文字母，先学完入门再开始第一季。</p></div><a class="btn primary" href="#/b/' + nb.id + '">开始学习</a></li>' : '') +
      '<li class="' + (!due && Object.keys(S.cards).length ? 'done' : '') + '"><div><h3>复习卡片</h3><p class="muted small">' +
      (due ? '有 ' + due + ' 张卡片到期。先听声音，再想意思。' : (Object.keys(S.cards).length ? '今天的复习做完了。' : '学完第一集后，这里会出现要复习的卡片。')) + '</p></div>' +
      (due ? '<a class="btn primary" href="#/review">开始复习</a>' : Object.keys(S.cards).length ? '<span class="tag ok">完成</span>' : '<span></span>') + '</li>' +
      (nx ? '<li class="' + (doneToday ? 'done' : '') + '"><div><h3>新的一集：<span lang="ko">' + esc(nx.caption) + '</span></h3><p class="muted small">' + epLabel(nx) + '，' + esc(nx.title) + '。' +
        (doneToday ? '今天已经学过一集了，想多学也可以。' : '大约 20 分钟。') + '</p></div><a class="btn ' + (doneToday ? '' : 'primary') + '" href="#/e/' + nx.id + '">开始学习</a></li>'
        : '<li class="done"><div><h3>二十集全部学完了</h3><p class="muted small">接下来把时间多放在精听工作台上。</p></div><a class="btn" href="#/learn">回顾课程</a></li>') +
      (WORDS.length ? (() => { const ws = todaySet(); return '<li class="' + (!ws.length && S.wd.list.length ? 'done' : '') + '"><div><h3>背单词</h3><p class="muted small">' +
        (ws.length ? '今天 ' + ws.length + ' 个新词，从 <span lang="ko">' + esc(ws[0].ko) + '</span> 开始（' + wLetter(ws[0]) + ' 组）。' : '今天这组学完了。') + '</p></div>' +
        (ws.length ? '<a class="btn" href="#/words/today">开始</a>' : '<a class="btn" href="#/words">单词本</a>') + '</li>'; })() : '') +
      '<li><div><h3>精听真实片段</h3><p class="muted small">用你自己的韩剧或综艺片段，一句一句听十分钟。</p></div><a class="btn" href="#/lab">打开工作台</a></li>' +
      '</ol>' +
      '<div class="stats"><div><b>' + EPS.filter(e => S.done[e.id]).length + ' / ' + EPS.length + '</b>已学集数</div><div><b>' + Object.keys(S.cards).length + '</b>复习卡片</div><div><b>' + streak() + '</b>连续学习天数</div>' +
      '<div>最近七天<div class="week">' + days.map(d => { const n = S.log[d] || 0; const dt = new Date(d * 86400000); return '<span class="' + (n ? 'has' : '') + '" style="height:' + (n ? 12 + 42 * n / max : 6) + 'px" title="' + n + ' 次"><i>' + wd[dt.getUTCDay()] + '</i></span>'; }).join('') + '</div></div></div>' +
      '</div>';
  }

  // ---------- 课程目录 ----------
  function viewLearn() {
    const nx = nextEp();
    main.innerHTML = '<div class="wrap"><div class="page-head"><div class="cap lg pop" lang="ko">드라마로 배우는 한국어</div>' +
      '<p class="lede">每一集是一段原创的小剧场，人物和故事连贯下去。每集五步：盲听、逐句、词汇、语法、练习。按顺序学，后面的集会用到前面的内容。没学过韩文字母的话，先学最上面的入门。</p></div>' +
      BASICS.map(g => '<section class="season-block"><div class="kicker">入门</div><h2>' + esc(g.zh) + '</h2><p class="muted">' + esc(g.intro) + '</p><ol class="ep-list">' +
        g.lessons.map(l => '<li><a href="#/b/' + l.id + '"><span class="ep-no">' + l.no + '</span><span><span class="ep-ko" lang="ko">' + esc(l.ko) + '</span><br><span class="ep-zh">' + esc(l.zh) + '。' + esc(l.goal) + '</span></span>' +
          (S.done['b:' + l.id] ? '<span class="tag ok">已学</span>' : nextBasic() === l ? '<span class="tag next">下一课</span>' : '<span></span>') + '</a></li>').join('') +
        '</ol></section>').join('') +
      D.seasons.map((s, si) => '<section class="season-block"><div class="kicker">' + SEASON_ZH[si] + '</div><h2>' + esc(s.zh) + '</h2><p class="muted">' + esc(s.intro) + '</p><ol class="ep-list">' +
        s.episodes.map(e => '<li><a href="#/e/' + e.id + '"><span class="ep-no">' + e.no + '</span><span><span class="ep-ko" lang="ko">' + esc(e.caption) + '</span><br><span class="ep-zh">' + esc(e.title) + '。' + esc(e.goal) + '</span></span>' +
          (S.done[e.id] ? '<span class="tag ok">已学</span>' : nx === e ? '<span class="tag next">下一集</span>' : '<span></span>') + '</a></li>').join('') +
        '</ol></section>').join('') +
      topicBlock('场景词汇', '按场景记词', '吃的、星期月份、心情、恋爱、职场……按场景把常用词一次学完。每个主题有分组的词、实际读音、例句和一段小对话，不分先后，建议学完第一季第 4 集再开始。', TOPICS.filter(t => t.set !== 'star')) +
      topicBlock('场景词汇', '明星和娱乐圈', '追星、拍戏、偶像舞台、综艺录制、颁奖典礼、娱乐新闻。看韩剧韩综和刷粉丝圈时天天碰到的词，包括 최애、본방사수、열애설 这类流行说法。剧里的明星都是虚构的。', TOPICS.filter(t => t.set === 'star')) + '</div>';
  }
  function topicBlock(kick, h, p, list) {
    if (!list.length) return '';
    const no = t => TOPICS.indexOf(t) + 1;
    return '<section class="season-block"><div class="kicker">' + kick + '</div><h2>' + h + '</h2><p class="muted">' + p + '</p><ol class="ep-list">' +
      list.map(t => '<li><a href="#/t/' + t.id + '"><span class="ep-no">' + no(t) + '</span><span><span class="ep-ko" lang="ko">' + esc(t.ko) + '</span><br><span class="ep-zh">' + esc(t.zh) + '，' + topicWords(t).length + ' 个词</span></span>' +
        (S.done['t:' + t.id] ? '<span class="tag ok">已学</span>' : '<span></span>') + '</a></li>').join('') + '</ol></section>';
  }


  // ---------- 入门：四十音等基础课 ----------
  const BASICS = D.basics || [];
  const BLESSONS = [];
  BASICS.forEach(g => g.lessons.forEach((l, i) => { l.group = g; l.no = i + 1; BLESSONS.push(l); }));
  const BL = Object.fromEntries(BLESSONS.map(l => [l.id, l]));
  const nextBasic = () => BLESSONS.find(l => !S.done['b:' + l.id]);
  const isKoSyl = x => /[가-힣]/.test(x);

  // 拼字拆解：把一个韩文字拆成开头辅音、元音、收音，按真实的位置画出来
  const HJ = {
    L: 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split(''),
    V: 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'.split(''),
    T: ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
  };
  const hSplit = ch => {
    const c = ch.charCodeAt(0) - 0xAC00;
    if (c < 0 || c > 11171) return null;
    return { l: HJ.L[Math.floor(c / 588)], v: HJ.V[Math.floor((c % 588) / 28)], t: HJ.T[c % 28] };
  };
  const hJoin = (l, v, t) => String.fromCharCode(0xAC00 + (HJ.L.indexOf(l) * 21 + HJ.V.indexOf(v)) * 28 + HJ.T.indexOf(t || ''));
  function blockHtml(ch, opt) {
    const p = hSplit(ch);
    if (!p) return '';
    if (opt && opt.mini) {
      const d = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅣ'.indexOf(p.v) >= 0 ? 'hb-v' : 'ㅗㅛㅜㅠㅡ'.indexOf(p.v) >= 0 ? 'hb-h' : 'hb-m';
      return '<span class="hb-box hb-mini ' + d + (p.t ? ' has-t' : '') + '" title="' + ch + '"><span class="hb-l">' + p.l + '</span><span class="hb-vw">' + p.v + '</span>' + (p.t ? '<span class="hb-t">' + p.t + '</span>' : '') + '</span>';
    }
    const dir = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅣ'.indexOf(p.v) >= 0 ? 'hb-v' : 'ㅗㅛㅜㅠㅡ'.indexOf(p.v) >= 0 ? 'hb-h' : 'hb-m';
    return '<figure class="hb">' +
      '<div class="hb-box ' + dir + (p.t ? ' has-t' : '') + '" aria-hidden="true"><span class="hb-l">' + p.l + '</span><span class="hb-vw">' + p.v + '</span>' + (p.t ? '<span class="hb-t">' + p.t + '</span>' : '') + '</div>' +
      '<figcaption>' + pbtn(ch, 'f') + '<b lang="ko">' + ch + '</b><span class="hb-sum">' + p.l + ' + ' + p.v + (p.t ? ' + ' + p.t : '') + '</span>' + (opt && opt.note ? '<span class="tiny">' + esc(opt.note) + '</span>' : '') + '</figcaption></figure>';
  }
  // 拆字图：from + 字母 → to，两个字都画成方块
  const morphHtml = list => '<div class="mph-list">' + list.map(m => '<div class="mph">' + blockHtml(m.from) +
    '<span class="mph-op">+ <b class="' + (HJ.V.indexOf(m.add) >= 0 ? 'hb-vw' : 'hb-t') + '">' + esc(m.add) + '</b> →</span>' + blockHtml(m.to) +
    (m.note ? '<div class="mph-note" lang="ko">' + esc(m.note) + '</div>' : '') + '</div>').join('') + '</div>';
  // 拆句子：每块按角色上色，助词单独标出；下面一行按中文语序重排，颜色不变
  const ROLE = { topic: '话题', subj: '主语', obj: '宾语', place: '地点', time: '时间', verb: '动词·句尾', other: '其他' };
  const parseHtml = x => {
    const blk = (pt, zh) => '<span class="ps ps-' + pt[2] + '"><b lang="ko">' + (pt[3] && !zh ? esc(pt[0].slice(0, pt[0].length - pt[3].length)) + '<u>' + esc(pt[3]) + '</u>' : esc(zh ? pt[1] : pt[0])) + '</b>' +
      '<small>' + (zh ? '' : esc(pt[1]) + ' · ') + ROLE[pt[2]] + (pt[3] && !zh ? ' · 助词 ' + esc(pt[3]) : '') + '</small></span>';
    const order = x.zhOrder || x.parts.map((q, i) => i);
    return '<div class="psent"><div class="row">' + pbtn(x.ko, 'f') + sbtn(x.ko, 'f') + '<span class="small muted">' + esc(x.zh) + '</span></div>' +
      '<div class="ps-line"><span class="ps-tag">韩语</span>' + x.parts.map(q => blk(q)).join('') + '</div>' +
      '<div class="ps-line ps-zh"><span class="ps-tag">中文</span>' + order.map(i => blk(x.parts[i], true)).join('') + '</div></div>';
  };
  const wordBlocks = w => '<span class="sh-w">' + Array.from(w.replace(/[.?!,]/g, '')).map(ch => ch === ' ' ? '<span class="sh-gap"></span>' : blockHtml(ch, { mini: true })).join('') + '</span>';
  const shiftHtml = list => '<div class="sh-list">' + list.map(r => '<div class="sh">' +
    '<div class="sh-row"><span class="sh-k">写法</span>' + wordBlocks(r[0]) + '<span class="sh-arrow">→</span><span class="sh-k">读音</span>' + wordBlocks(r[1]) + '</div>' +
    '<div class="sh-foot">' + pbtn(r[0], 'f') + '<b lang="ko">' + esc(r[0]) + '</b> <span class="pron">[' + esc(r[1]) + ']</span><span class="muted small">' + esc(r[2]) + '</span>' +
    qbtn([{ t: r[0], v: 'f' }, { t: r[1], v: 'f' }], '写法、读音连着听') + '</div></div>').join('') + '</div>';
  const cellHtml = c => c && typeof c === 'object' ? '<span class="g-form">' + pbtn(c.ko, 'f') + '<b lang="ko">' + esc(c.ko) + '</b></span>' :
    /^\[[가-힣 ]+\]$/.test(c) ? '<span class="pron">' + esc(c) + '</span>' : esc(c);
  const TERMS = D.terms || {};
  const TERM_RE = Object.keys(TERMS).length ? new RegExp('(' + Object.keys(TERMS).sort((a, b) => b.length - a.length).join('|') + ')', 'g') : null;
  const termify = html => TERM_RE ? html.replace(TERM_RE, m => '<button type="button" class="term" data-term="' + m + '">' + m + '</button>') : html;
  const prTag = (ko, pr) => pr && pr !== ko.replace(/[.?!]/g, '') ? '<span class="pron">[' + esc(pr) + ']</span>' : '';

  function basicSec(sec, k0) {
    let h = '<section class="gram blesson"><h3>' + esc(sec.h) + '</h3><p class="g-core">' + esc(sec.p) + '</p>';
    if (sec.blocks) h += '<div class="hb-legend"><i class="hb-l">辅音</i><i class="hb-vw">元音</i><i class="hb-t">收音</i></div><div class="hb-list">' + sec.blocks.map(c => blockHtml(c)).join('') + '</div>';
    if (sec.letters) h += '<div class="g-table-wrap"><table class="g-table b-letters"><thead><tr><th>字母</th><th>听一听</th><th>怎么读</th><th>例词</th></tr></thead><tbody>' +
      sec.letters.map(r => '<tr><td class="b-jamo">' + r[0] + '</td><td><span class="g-form">' + pbtn(r[1], 'f') + '<b lang="ko">' + esc(r[1]) + '</b></span></td><td class="muted">' + esc(r[2]) + '</td>' +
        '<td><span class="g-form">' + pbtn(r[3], 'f') + '<b lang="ko">' + esc(r[3]) + '</b></span> <span class="muted small">' + esc(r[4]) + '</span></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="row" style="margin-top:10px">' + qbtn(sec.letters.map(r => ({ t: r[1], v: 'f' })), '按顺序听一遍') + '</div>';
    if (sec.sets) h += sec.sets.map(set => {
      const ko = set.filter(isKoSyl), note = set.filter(x => !isKoSyl(x)).join(' ');
      return '<div class="g-part b-set"><div class="b-set-row">' + ko.map(t => '<span class="g-form">' + pbtn(t, 'f') + '<b lang="ko">' + esc(t) + '</b></span>').join('<span class="g-arrow">·</span>') + '</div>' +
        '<div class="g-pf">' + qbtn(ko.map(t => ({ t: t, v: 'f' })), '连着听') + (note ? '<span class="small">' + esc(note) + '</span>' : '') + '</div></div>';
    }).join('');
    if (sec.rows) h += '<ul class="ex-list b-rows">' + sec.rows.map(r => '<li>' + pbtn(r[1], 'f') + sbtn(r[1], 'f') + '<div class="grow"><div class="ko-text" lang="ko">' + esc(r[1]) + ' ' + prTag(r[1], r[3]) + '</div>' +
      '<div class="zh-text">' + (r[0] ? '<b class="b-a">' + esc(r[0]) + '</b>　' : '') + esc(r[2]) + '</div></div></li>').join('') + '</ul>' +
      '<div class="row" style="margin-top:10px">' + qbtn(sec.rows.map(r => ({ t: r[1], v: 'f' })), '连着听这一节') + '</div>';
    if (sec.parse) h += sec.parse.map(parseHtml).join('');
    if (sec.table) h += '<div class="g-table-wrap"><table class="g-table b-table"><thead><tr>' + sec.table.head.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' +
      sec.table.rows.map(r => '<tr>' + r.map(c => '<td>' + cellHtml(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    if (sec.morph) h += morphHtml(sec.morph);
    if (sec.shift) h += shiftHtml(sec.shift);
    if (sec.grid) h += '<div id="hgrid"></div>';
    if (sec.tip) h += '<p class="note" style="margin-top:12px">' + esc(sec.tip) + '</p>';
    return h + '</section>';
  }
  // 拼读总表：点格子读这个字，点行头、列头连着读一整行、一整列
  function drawGrid(box, which) {
    const G = D.hangulGrid, vs = G[which];
    box.innerHTML = '<div class="toolbar"><div class="seg" id="gtab"><button data-w="basic" class="' + (which === 'basic' ? 'on' : '') + '">基本元音</button><button data-w="compound" class="' + (which === 'compound' ? 'on' : '') + '">复合元音</button></div>' +
      '<span class="grow tiny">点格子听这个字，点最左边的辅音或最上面的元音，整行、整列连着读。</span></div>' +
      '<div class="hg-wrap"><table class="hg"><thead><tr><th></th>' + vs.map(v => '<th><button class="hg-h" data-col="' + v + '">' + v + '</button></th>').join('') + '</tr></thead><tbody>' +
      G.cons.map(c => '<tr><th><button class="hg-h" data-row="' + c + '">' + c + '</button></th>' + vs.map(v => { const s = hJoin(c, v); return '<td><button class="hg-c" data-say="' + s + '" data-v="f" lang="ko">' + s + '</button></td>'; }).join('') + '</tr>').join('') +
      '</tbody></table></div>';
    $$('#gtab button', box).forEach(b => b.onclick = () => drawGrid(box, b.dataset.w));
    $$('.hg-h', box).forEach(b => b.onclick = () => {
      const cells = b.dataset.row ? $$('[data-say]', b.closest('tr')) : $$('.hg-c', box).filter(x => hSplit(x.dataset.say).v === b.dataset.col);
      $$('.hg-h.playing', box).forEach(x => x.classList.remove('playing'));
      b.classList.add('playing');
      playSeq(cells.map(x => ({ t: x.dataset.say, v: 'f' })), i => { cells.forEach((x, j) => x.classList.toggle('playing', j === i)); if (i < 0) b.classList.remove('playing'); });
    });
  }

  function viewBasic(id, step) {
    const l = BL[id];
    if (!l) { location.hash = '#/learn'; return; }
    step = Math.min(2, Math.max(1, +step || 1));
    const NAMES = ['讲解', '练习'], g = l.group;
    main.innerHTML = '<div class="wrap"><div class="ep-head"><div class="kicker"><a href="#/learn">课程</a>　入门 · ' + esc(g.zh) + ' 第 ' + l.no + ' 课</div>' +
      '<div class="cap lg pop" lang="ko">' + esc(l.ko) + '</div><h1>' + esc(l.zh) + '</h1><p class="muted">' + esc(l.goal) + '</p></div>' +
      '<div class="steps" role="tablist">' + NAMES.map((n, i) => '<button role="tab" aria-selected="' + (i + 1 === step) + '" class="' + (i + 1 === step ? 'on' : '') + '" data-step="' + (i + 1) + '"><b>' + (i + 1) + '</b>' + n + '</button>').join('') + '</div>' +
      '<div id="stepBody"></div></div>';
    $$('.steps button').forEach(b => b.onclick = () => { location.hash = '#/b/' + id + '/' + b.dataset.step; });
    const body = $('#stepBody');
    const prevL = BLESSONS[BLESSONS.indexOf(l) - 1];
    if (step === 1) {
      body.innerHTML = '<p class="tiny" style="margin-bottom:12px">每个韩文都能点播放。“连着听”按顺序读一组，方便对比。粉色方括号是实际读音，和写法不一样时才标。</p>' +
        l.secs.map(basicSec).join('') +
        '<div class="step-foot">' + (prevL ? '<a class="btn" href="#/b/' + prevL.id + '">上一课</a>' : '<span></span>') + '<a class="btn primary" href="#/b/' + id + '/2">下一步：练习</a></div>';
      const gb = $('#hgrid', body);
      if (gb) drawGrid(gb, 'basic');
      return;
    }
    basicPractice(l, body);
  }

  function basicPractice(l, body) {
    const LS = l.listen || [], N = Math.min(10, LS.length * 2), ORD = l.order || [], RQ = (l.readq || []).map(r => ({ w: r[0], zh: r[1], a: r[2], opts: shuffle(r.slice(2)) }));
    let qs = [];
    for (let i = 0; i < N; i++) { const set = LS[i % LS.length]; qs.push({ set: shuffle(set), t: set[Math.floor(Math.random() * set.length)] }); }
    qs = shuffle(qs);
    let score = 0;
    body.innerHTML = (qs.length ? '<section class="drill"><h3>听音选字</h3><p class="tiny">点播放听一遍（可以多听几遍），再选听到的是哪个。</p>' +
      qs.map((q, n) => '<div class="q" data-bq="' + n + '"><div class="row">' + pbtn(q.t, 'f') + sbtn(q.t, 'f') + '<span class="muted small">第 ' + (n + 1) + ' 题</span></div>' +
        '<div class="choices b-choices">' + q.set.map(x => '<button class="choice" lang="ko" data-x="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div><div class="verdict"></div></div>').join('') + '</section>' : '') +
      (RQ.length ? '<section class="drill"><h3>看写法，选实际读音</h3><p class="tiny">先自己想想这个词读出来是什么样，选完会播放。</p>' +
        RQ.map((q, n) => '<div class="q" data-br="' + n + '"><div class="qtext"><b lang="ko" class="rq-w">' + esc(q.w) + '</b> <span class="muted small">' + esc(q.zh) + '</span></div>' +
          '<div class="choices b-choices">' + q.opts.map(o => '<button class="choice" lang="ko" data-x="' + esc(o) + '">[' + esc(o) + ']</button>').join('') + '</div><div class="verdict"></div></div>').join('') + '</section>' : '') +
      (ORD.length ? '<section class="drill"><h3>排语序</h3><p class="tiny">按韩语的顺序点词块，组成和中文意思一样的句子。点上面已选的词块可以放回去。</p>' +
        ORD.map((o, n) => '<div class="q" data-bo="' + n + '"><div class="qtext">' + esc(o.zh) + '</div><div class="tiles answer"></div><div class="tiles pool">' +
          shuffle(o.chunks.map((c, i) => i)).map(i => '<button class="tile" lang="ko" data-i="' + i + '">' + esc(o.chunks[i]) + '</button>').join('') + '</div>' +
          '<div class="row" style="margin-top:8px"><button class="btn sm" data-ocheck>检查</button><button class="btn sm" data-oreset>重来</button></div><div class="verdict"></div></div>').join('') + '</section>' : '') +
      '<section class="drill"><h3>选一选</h3>' + l.quiz.map((q, n) => {
        const order = shuffle(q.opts.map((o, j) => j));
        return '<div class="q" data-bz="' + n + '"><div class="qtext">' + esc(q.q) + '</div><div class="choices">' +
          order.map(j => '<button class="choice" data-o="' + j + '"' + (isKoSyl(q.opts[j]) ? ' lang="ko"' : '') + '>' + esc(q.opts[j]) + '</button>').join('') + '</div><div class="verdict"></div></div>';
      }).join('') + '</section>' +
      '<div class="finish" id="finish"><button class="btn primary big" id="done">完成这一课</button></div>' +
      '<div class="step-foot"><a class="btn" href="#/b/' + l.id + '/1">上一步</a><span></span></div>';
    $$('[data-bq]', body).forEach(box => {
      const q = qs[+box.dataset.bq];
      $$('.choice', box).forEach(c => c.onclick = () => {
        const right = c.dataset.x === q.t;
        $$('.choice', box).forEach(x => { x.disabled = true; if (x.dataset.x === q.t) x.classList.add('right'); });
        if (!right) c.classList.add('wrong'); else score++;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (right ? '答对了。' : '不对，读的是 <b lang="ko">' + esc(q.t) + '</b>，你选的是 <b lang="ko">' + esc(c.dataset.x) + '</b>。') + ' ' +
          qbtn(right ? [{ t: q.t, v: 'f' }] : [{ t: q.t, v: 'f' }, { t: c.dataset.x, v: 'f' }], right ? '再听一遍' : '两个连着听');
      });
    });
    $$('[data-br]', body).forEach(box => {
      const q = RQ[+box.dataset.br];
      $$('.choice', box).forEach(c => c.onclick = () => {
        const right = c.dataset.x === q.a;
        $$('.choice', box).forEach(x => { x.disabled = true; if (x.dataset.x === q.a) x.classList.add('right'); });
        if (!right) c.classList.add('wrong'); else score++;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (right ? '答对了。' : '不对。') + '<b lang="ko">' + esc(q.w) + '</b> 读 <span class="pron">[' + esc(q.a) + ']</span>。' + qbtn([{ t: q.w, v: 'f' }], '再听一遍');
        play(q.w, 'f');
      });
    });
    $$('[data-bo]', body).forEach(box => {
      const o = ORD[+box.dataset.bo], ans = $('.answer', box), pool = $('.pool', box);
      let picked = [], done = false;
      const draw = () => {
        ans.innerHTML = picked.map(i => '<button class="tile" lang="ko" data-i="' + i + '">' + esc(o.chunks[i]) + '</button>').join('');
        $$('.tile', pool).forEach(t => t.classList.toggle('used', picked.indexOf(+t.dataset.i) >= 0));
      };
      pool.onclick = e => { const t = e.target.closest('.tile'); if (!t || done || t.classList.contains('used')) return; picked.push(+t.dataset.i); draw(); };
      ans.onclick = e => { const t = e.target.closest('.tile'); if (!t || done) return; picked = picked.filter(i => i !== +t.dataset.i); draw(); };
      $('[data-oreset]', box).onclick = () => { if (done) return; picked = []; draw(); };
      $('[data-ocheck]', box).onclick = () => {
        if (done) return;
        if (picked.length < o.chunks.length) { toast('还有词块没放进去。'); return; }
        const last = o.chunks.length - 1, exact = picked.every((i, k) => i === k), right = picked[last] === last;
        done = true; if (right) score++;
        const std = o.chunks.join(' ');
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (exact ? '完全正确。' : right ? '对了：动词在最后就行，助词已经标明了谁做什么。最常见的说法是：' : '不对，动词要放在最后。正确的是：') +
          (exact ? '' : '<b lang="ko">' + esc(std) + '</b>') + ' ' + qbtn([{ t: std, v: 'f' }], '听一遍');
        play(std, 'f');
      };
    });
    $$('[data-bz]', body).forEach(box => {
      const q = l.quiz[+box.dataset.bz];
      $$('.choice', box).forEach(c => c.onclick = () => {
        const right = +c.dataset.o === q.a;
        $$('.choice', box).forEach(x => { x.disabled = true; if (+x.dataset.o === q.a) x.classList.add('right'); });
        if (!right) c.classList.add('wrong'); else score++;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (right ? '答对了。' : '不对，答案是“' + esc(q.opts[q.a]) + '”。') + (q.why ? ' ' + esc(q.why) : '');
        if (q.say) play(q.say, 'f');
      });
    });
    $('#done').onclick = () => {
      const first = !S.done['b:' + l.id];
      S.done['b:' + l.id] = { d: today(), score: score };
      logAct(); save(); renderNav();
      const nx = nextBasic();
      $('#finish').innerHTML = '<div class="cap md pink pop" lang="ko">' + (first ? '완료!' : '복습 완료!') + '</div>' +
        '<p>答对了 ' + score + ' / ' + (qs.length + RQ.length + ORD.length + l.quiz.length) + ' 题。' + (score < (qs.length + RQ.length + ORD.length + l.quiz.length) * 0.7 ? '错得多的话，回到讲解里再看一遍、把“连着听”多放几遍。' : '') + '</p>' +
        '<div class="row" style="justify-content:center;margin-top:16px">' + (nx ? '<a class="btn primary" href="#/b/' + nx.id + '">下一课：' + esc(nx.zh) + '</a>' : '<a class="btn primary" href="#/e/s1e01">入门学完了，开始第一季</a>') + '<a class="btn" href="#/learn">回到课程</a></div>';
    };
  }

  // ---------- 场景词汇 ----------
  const TOPICS = D.topics || [];
  const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));
  const AUTO = window.KAUTO || { gloss: {}, pron: {} };
  const pronOf = t => (t && AUTO.pron[t]) || '';
  const pronTag = t => pronOf(t) ? '<span class="pron">[' + esc(pronOf(t)) + ']</span>' : '';
  const autoG = t => AUTO.gloss[t] ? convSong(AUTO.gloss[t], t) : null;
  const topicWords = t => t.groups.reduce((a, g) => a.concat(g.words), []);
  const topicCard = (t, w, i) => ({ id: 'w:' + (w.id || w.ko), kind: 'word', ko: w.ko, f: w.f || '', zh: w.zh, v: KS.vx(i), say: KS.wordSay(w),
    src: '场景词汇：' + t.zh, ex: w.ex || '', exzh: w.exzh || '', exSay: w.ex || '', exv: KS.vx(i + 1) });
  // 可以点词的一句韩语：data-gk 记住原文，点开后在它下面显示拆解
  const glossOf = text => LINE_G[text] || autoG(text);
  const glossLine = (text, cls, inter) => '<div class="ko-text ' + (cls || '') + '" lang="ko" data-gk="' + esc(text) + '">' +
    (glossOf(text) ? tokHtml(text, glossOf(text), { song: !LINE_G[text], inter: inter }) : esc(text)) + '</div>';
  function glossClick(e, srcName, findWord) {
    if (e.target.closest('.veil')) return false;
    const tk = e.target.closest('[data-gk] .tok[data-t]');
    if (tk) {
      const host = tk.closest('[data-gk]'), text = host.dataset.gk, g = glossOf(text);
      const was = tk.classList.contains('open');
      $$('.tok.open', host).forEach(x => x.classList.remove('open'));
      const nx = host.nextElementSibling;
      if (nx && nx.classList.contains('gloss-box')) nx.remove();
      if (!was && g) { tk.classList.add('open'); host.insertAdjacentHTML('afterend', songTokDetail(null, text, g, +tk.dataset.t, { noEdit: true })); }
      return true;
    }
    const ap = e.target.closest('.gloss-box [data-addp]');
    if (ap) {
      const host = ap.closest('.gloss-box').previousElementSibling, text = host.dataset.gk, g = glossOf(text);
      const [ti, pi] = ap.dataset.addp.split(':').map(Number), x = g[ti][pi];
      const hit = findWord && findWord(x);
      if (LEX[x.key]) addWordByKey(x.key);
      else if (hit) addCard(hit);
      else addCard(songWordCard({ title: srcName }, x, text, ''));
      save(); renderNav(); ap.disabled = true; ap.textContent = '已加入'; toast('已加入复习，今天就会出现。');
      return true;
    }
    return false;
  }


  // 带讲解的主题（数字）：第一步是讲解，每节一张可以播放的表
  function topicLesson(t, body, foot) {
    let k = 0;
    body.innerHTML = '<p class="tiny" style="margin-bottom:12px">每一行都能点播放。粉色方括号是实际读音，和写法不一样时才标。</p>' +
      t.lesson.map(sec => '<section class="gram tlesson"><h3>' + esc(sec.h) + '</h3><p class="g-desc" style="color:var(--ink)">' + esc(sec.p) + '</p>' +
        '<div class="g-table-wrap"><table class="g-table num-table"><tbody>' + sec.rows.map(r => {
          const i = k++;
          return '<tr><td>' + pbtn(r.ko, KS.vx(i)) + '</td><td class="num-a">' + esc(r.a) + '</td><td><b lang="ko">' + esc(r.ko) + '</b>' + (pronOf(r.ko) ? ' ' + pronTag(r.ko) : '') + '<span class="num-zh-m">' + esc(r.zh) + '</span></td><td class="muted num-zh">' + esc(r.zh) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="row" style="margin-top:10px"><button class="btn sm" data-seqsec>连续播放这一节</button></div>' +
        (sec.tip ? '<p class="note" style="margin-top:12px">' + esc(sec.tip) + '</p>' : '') + '</section>').join('') + foot(false, true);
    $$('[data-seqsec]', body).forEach(b => b.onclick = async () => {
      if (b.dataset.on) { stopAudio(); return; }
      const sec = b.closest('section'), btns = $$('.play:not(.slow)', sec);
      b.dataset.on = '1'; b.textContent = '停止';
      await playSeq(btns.map(x => ({ t: x.dataset.say, v: x.dataset.v })), i => btns.forEach((x, j) => x.classList.toggle('playing', j === i)));
      btns.forEach(x => x.classList.remove('playing'));
      delete b.dataset.on; b.textContent = '连续播放这一节';
    });
  }
  // 只比较答案里的数字：7:05、7点5分、7/5 都算对
  const numGroups = s => (String(s).replace(/[,，]/g, '').match(/\d+/g) || []).map(Number);


  // ---------- 单词本：课程里所有的词，按 가나다 分组，每天一组新词 ----------
  const WORDS = D.words || [];
  const WIDX = Object.fromEntries(WORDS.map((w, i) => [w.ko, i]));
  const WL = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split('');
  const W_TENSE = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
  const wLetter = w => { const p = hSplit(w.ko[0]); return p ? (W_TENSE[p.l] || p.l) : '其他'; };
  const W_VOW = [['아', 'ㅏㅐㅑㅒ'], ['어', 'ㅓㅔㅕㅖ'], ['오', 'ㅗㅘㅙㅚㅛ'], ['우', 'ㅜㅝㅞㅟㅠ'], ['으', 'ㅡㅢ'], ['이', 'ㅣ']];
  const wVowel = w => { const p = hSplit(w.ko[0]); const g = p && W_VOW.find(x => x[1].indexOf(p.v) >= 0); return g ? g[0] : ''; };
  const W_TYPE = { n: '名词等', v: '动词·形容词', x: '短语和表达' };
  // 记忆钩子：汉字词逐个音节对上汉字，外来词给原词，缩略语拆开，固有词给联想
  const MNEMO = D.mnemo || {};
  const MN_KIND = { hanja: '汉字词', loan: '外来词', split: '拆开看', native: '联想' };
  const MN_HOW = { parts: '拆开看', pair: '成对记', scene: '剧里那一幕', sound: '谐音' };
  function mnHtml(ko, opt) {
    const m = MNEMO[ko];
    if (!m) return '';
    opt = opt || {};
    if (m.kind === 'native') {
      if (!m.how || m.how === 'none') return '';
      let h = '<div class="mn mn-native mn-' + m.how + '"><div class="mn-top"><span class="mn-k">' + MN_HOW[m.how] + '</span>';
      if (m.how === 'pair') h += '<span class="mn-pair">' + m.pair.map(k => k === ko ? '<b lang="ko">' + esc(k) + '</b>' :
        (opt.plain ? '<span class="tag" lang="ko">' + esc(k) + '</span>' : '<button class="tag learned" data-wjump="' + esc(k) + '" lang="ko">' + esc(k) + '</button>')).join('') + '</span>' +
        qbtn(m.pair.map(k => ({ t: k, v: 'f' })), '连着听');
      h += '</div>';
      if (m.how === 'scene' && m.scene) {
        const sc = m.scene, who = (CHARS[sc.who] || [sc.who])[0];
        h += '<p class="mn-hook">' + esc(m.hook) + '：</p><div class="say mn-line">' + pbtn(sc.ko, sc.v) + '<div><div class="ko-text" lang="ko"><span class="tiny">' + esc(who) + '</span> ' + esc(sc.ko) + '</div><div class="zh-text">' + esc(sc.zh) + '</div>' +
          (opt.plain ? '' : '<a class="tiny" href="#/e/' + sc.ep + '/2">去这一集听 →</a>') + '</div></div>';
      } else if (m.hook) h += '<p class="mn-hook">' + esc(m.hook) + '</p>';
      if (m.sound) h += '<p class="mn-hook mn-sound"><span class="mn-k">谐音</span> ' + esc(m.sound) + '</p>';
      if (m.how === 'sound' || m.sound) h += '<p class="tiny">谐音只帮忙记，读音以粉色方括号为准。</p>';
      return h + '</div>';
    }
    let h = '<div class="mn mn-' + m.kind + '"><div class="mn-top"><span class="mn-k">' + (MN_KIND[m.kind] || '记忆') + '</span>';
    if (m.parts) h += '<span class="mn-hj">' + m.parts.map(p => '<span class="mn-syl"><b lang="ko">' + esc(p[0]) + '</b><i>' + esc(p[2]) + '</i></span>').join('') + '</span>' +
      (m.hj !== m.hs ? '<span class="tiny">繁体 ' + esc(m.hj) + '</span>' : '');
    if (m.loan) h += '<span class="mn-loan">' + esc(m.loan) + '</span>';
    if (m.split) h += '<span class="mn-split" lang="ko">' + esc(m.split) + '</span>';
    h += '</div>' + (m.hook ? '<p class="mn-hook">' + esc(m.hook) + '</p>' : '');
    const fam = (m.parts || []).filter(p => p[3] && p[3].length);
    if (fam.length) h += '<div class="mn-fam">' + fam.map(p => '<div><span class="tiny">同一个“' + esc(p[2]) + '”（<span lang="ko">' + esc(p[0]) + '</span>）：</span>' +
      p[3].map(k => opt.plain ? '<span class="tag" lang="ko">' + esc(k) + '</span>' : '<button class="tag learned" data-wjump="' + esc(k) + '" lang="ko">' + esc(k) + '</button>').join('') + '</div>').join('') + '</div>';
    return h + '</div>';
  }
  S.known = S.known || {};
  const wCardId = w => 'w:' + w.ko;
  function wStatus(w) {
    if (S.known[w.ko]) return 'known';
    const c = S.srs[wCardId(w)];
    if (!c) return 'new';
    return c.ivl >= 21 ? 'known' : 'learning';
  }
  const W_ST = { new: ['没学过', ''], learning: ['复习中', 'learned'], known: ['已掌握', 'ok'] };
  const wSrcLabel = s => /^s\de\d\d$/.test(s) && EP[s] ? [epLabel(EP[s]), '#/e/' + s + '/3'] :
    s.startsWith('t:') && TOPIC[s.slice(2)] ? ['场景 · ' + TOPIC[s.slice(2)].zh, '#/t/' + s.slice(2)] :
      s.startsWith('p:') ? ['表达包 · ' + ((D.packs.find(p => p.id === s.slice(2)) || {}).zh || ''), '#/pack/' + s.slice(2)] : [s, ''];
  const wbCard = w => ({ id: wCardId(w), kind: 'word', ko: w.ko, f: w.f || '', zh: w.zh, v: 'f', say: KS.wordSay(w), ex: w.ex || '', exzh: w.exzh || '', exSay: w.ex || '', exv: 'm', src: '单词本 · ' + wLetter(w) });
  const wPerDay = () => S.set.wpd || 20;
  // 今天这一组：一天之内固定，刷新不变；学完可以再来一组
  function todaySet(more) {
    const t = today();
    if (!S.wd || S.wd.day !== t) S.wd = { day: t, list: [], done: 0 };
    if (!S.wd.list.length || more) {
      const taken = new Set(S.wd.list);
      const add = WORDS.filter(w => wStatus(w) === 'new' && !taken.has(w.ko)).slice(0, wPerDay()).map(w => w.ko);
      S.wd.list = S.wd.list.concat(add);
      save();
    }
    return S.wd.list.slice(S.wd.done).map(k => WORDS[WIDX[k]]).filter(Boolean);
  }
  const wRow = w => {
    const st = wStatus(w);
    return '<li class="wb-row" data-w="' + esc(w.ko) + '">' + pbtn(KS.wordSay(w), 'f') +
      '<div class="grow"><div class="wb-head"><b lang="ko">' + esc(w.ko) + '</b>' + (pronOf(w.ko) ? ' ' + pronTag(w.ko) : '') +
      (w.f ? ' <span class="f" lang="ko">' + esc(w.f) + '</span>' : '') + '<span class="zh-text">' + esc(w.zh) + '</span>' +
      (MNEMO[w.ko] && MNEMO[w.ko].hs ? '<span class="mn-chip">' + esc(MNEMO[w.ko].hs) + '</span>' : MNEMO[w.ko] && MNEMO[w.ko].loan ? '<span class="mn-chip">' + esc(MNEMO[w.ko].loan) + '</span>' : '') + '</div>' +
      '<div class="wb-more" hidden></div></div><span class="tag ' + W_ST[st][1] + '">' + W_ST[st][0] + '</span></li>';
  };
  const wMore = w => mnHtml(w.ko) + (w.ex ? '<div class="say">' + pbtn(w.ex, 'm') + '<div class="grow">' + glossLine(w.ex, 'wb-ex', S.set.inter) + '<div class="tiny">点例句里的词，看意思、原形和读音。</div>' + (pronOf(w.ex) ? '<div class="tiny">读作 ' + pronTag(w.ex) + '</div>' : '') + '<div class="zh-text">' + esc(w.exzh || '') + '</div></div></div>' : '<p class="tiny">这一条本身就是一句常用台词。</p>') +
    '<div class="row wb-src"><span class="tiny">出现在：</span>' + w.src.map(sc => { const [lb, href] = wSrcLabel(sc); return href ? '<a class="tag learned" href="' + href + '">' + esc(lb) + '</a>' : '<span class="tag">' + esc(lb) + '</span>'; }).join('') + '</div>' +
    '<div class="row" style="margin-top:8px">' + (S.cards[wCardId(w)] ? '<span class="tiny">已经在复习里了。</span>' : '<button class="btn sm" data-wadd>加入复习</button>') +
    (S.known[w.ko] ? '<button class="btn sm" data-wunknow>取消“已经会了”</button>' : '<button class="btn sm" data-wknow>我已经会了</button>') + '</div>';

  function viewWords() {
    const f = Object.assign({ l: 'ㄱ', st: 'all', t: 'all', q: '' }, S.wf || {});
    const counts = {};
    WORDS.forEach(w => { const l = wLetter(w); counts[l] = counts[l] || [0, 0]; counts[l][1]++; if (wStatus(w) !== 'new') counts[l][0]++; });
    const learned = WORDS.filter(w => wStatus(w) !== 'new').length, left = WORDS.length - learned;
    const ts = todaySet(), set = S.wd;
    main.innerHTML = '<div class="wrap"><div class="page-head"><div class="cap lg pop" lang="ko">단어장</div>' +
      '<p class="lede">课程里出现过的所有词，共 ' + WORDS.length + ' 个，按 가나다 顺序排（韩语词典的“a-z”：看第一个字开头的辅音）。紧音 ㄲ ㄸ ㅃ ㅆ ㅉ 排在对应的平音组里。</p></div>' +
      '<section class="panel wb-today"><div class="row" style="justify-content:space-between"><div><h3>今天的新词</h3><p class="muted small">' +
      (ts.length ? '还有 ' + ts.length + ' 个，从 <b lang="ko">' + esc(ts[0].ko) + '</b> 开始（' + wLetter(ts[0]) + ' 组）。' : set.list.length ? '今天这组学完了。' : '所有的词都学过了。') +
      '已学 ' + learned + ' / ' + WORDS.length + (left ? '，每天 ' + wPerDay() + ' 个大约还要 ' + Math.ceil(left / wPerDay()) + ' 天' : '') + '。</p>' +
      '<div class="progress"><i style="width:' + (100 * learned / WORDS.length).toFixed(1) + '%"></i></div></div>' +
      '<div class="row">' + (ts.length ? '<a class="btn primary" href="#/words/today">开始</a>' : left ? '<button class="btn" id="wMore">再来一组</button>' : '') +
      '<span class="small muted">每天</span><div class="seg" id="wpd">' + [10, 20, 30].map(n => '<button data-n="' + n + '" class="' + (wPerDay() === n ? 'on' : '') + '">' + n + '</button>').join('') + '</div></div></div></section>' +
      '<div class="wb-letters" role="tablist">' + WL.concat(counts['其他'] ? ['其他'] : []).map(l => '<button data-l="' + l + '" class="' + (f.l === l && !f.q ? 'on' : '') + '"><b>' + l + '</b><small>' + (counts[l] || [0, 0])[0] + '/' + (counts[l] || [0, 0])[1] + '</small></button>').join('') + '</div>' +
      '<div class="toolbar"><input class="search" id="wq" placeholder="搜索韩语或中文，比如 사랑、吃" value="' + esc(f.q) + '">' +
      '<div class="seg" id="wst">' + [['all', '全部'], ['new', '没学过'], ['learning', '复习中'], ['known', '已掌握']].map(x => '<button data-v="' + x[0] + '" class="' + (f.st === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
      '<div class="seg" id="wt">' + [['all', '全部']].concat(Object.entries(W_TYPE)).map(x => '<button data-v="' + x[0] + '" class="' + (f.t === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
      '<button class="btn sm ' + (S.set.inter ? 'on' : '') + '" id="wvi">逐词对照</button><span class="grow tiny" id="wn"></span></div><div id="wlist"></div></div>';
    const draw = () => {
      S.wf = f; save();
      const q = f.q.trim().toLowerCase();
      const list = WORDS.filter(w => (q ? (w.ko.indexOf(q) >= 0 || w.zh.toLowerCase().indexOf(q) >= 0) : wLetter(w) === f.l) &&
        (f.st === 'all' || wStatus(w) === f.st) && (f.t === 'all' || w.t === f.t));
      $('#wn').textContent = (q ? '搜到 ' : f.l + ' 组 ') + list.length + ' 个';
      $$('.wb-letters button').forEach(b => b.classList.toggle('on', !q && b.dataset.l === f.l));
      let html = '';
      if (!q && f.l === 'ㅇ') {
        W_VOW.concat([['其他', '']]).forEach(([v]) => {
          const sub = list.filter(w => (wVowel(w) || '其他') === v);
          if (sub.length) html += '<h3 class="wb-sub">' + (v === '其他' ? '其他' : v + ' 开头') + '<span class="muted small">　' + sub.length + ' 个</span></h3><ul class="wb-list">' + sub.map(wRow).join('') + '</ul>';
        });
      } else html = list.length ? '<ul class="wb-list">' + list.map(wRow).join('') + '</ul>' : '';
      $('#wlist').innerHTML = html || '<div class="empty">没有符合条件的词。</div>';
    };
    $$('.wb-letters button').forEach(b => b.onclick = () => { f.l = b.dataset.l; f.q = ''; $('#wq').value = ''; draw(); });
    $('#wq').oninput = e => { f.q = e.target.value; draw(); };
    $('#wvi').onclick = e => { S.set.inter = !S.set.inter; save(); e.currentTarget.classList.toggle('on', S.set.inter); $$('.wb-row.open .wb-more').forEach(b => { b.innerHTML = wMore(WORDS[WIDX[b.closest('.wb-row').dataset.w]]); }); };
    $$('#wst button').forEach(b => b.onclick = () => { f.st = b.dataset.v; $$('#wst button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $$('#wt button').forEach(b => b.onclick = () => { f.t = b.dataset.v; $$('#wt button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $$('#wpd button').forEach(b => b.onclick = () => { S.set.wpd = +b.dataset.n; save(); viewWords(); });
    const mb = $('#wMore'); if (mb) mb.onclick = () => { todaySet(true); location.hash = '#/words/today'; };
    main.onclick = e => {
      if (e.target.closest('.play, a')) return;
      if (glossClick(e, '单词本')) return;
      const li = e.target.closest('.wb-row');
      if (!li) return;
      const w = WORDS[WIDX[li.dataset.w]], box = $('.wb-more', li);
      if (e.target.closest('[data-wadd]')) { addCard(wbCard(w)); save(); renderNav(); toast('已加入复习，今天就会出现。'); box.innerHTML = wMore(w); return; }
      if (e.target.closest('[data-wknow]')) { S.known[w.ko] = 1; save(); li.outerHTML = wRow(w); return; }
      if (e.target.closest('[data-wunknow]')) { delete S.known[w.ko]; save(); li.outerHTML = wRow(w); return; }
      if (e.target.closest('.wb-more')) return;
      if (box.hidden) { box.innerHTML = wMore(w); box.hidden = false; li.classList.add('open'); } else { box.hidden = true; li.classList.remove('open'); }
    };
    draw();
  }

  // 今天的新词：先看一遍，再做小测，做完进复习
  function viewWordsToday(step) {
    const list = todaySet();
    step = +step === 2 ? 2 : 1;
    if (!list.length) { location.hash = '#/words'; return; }
    const first = list[0], last = list[list.length - 1];
    main.innerHTML = '<div class="wrap"><div class="ep-head"><div class="kicker"><a href="#/words">单词本</a>　今天的新词</div>' +
      '<div class="cap lg pop" lang="ko">오늘의 단어</div><h1>' + list.length + ' 个新词：<span lang="ko">' + esc(first.ko) + '</span> ～ <span lang="ko">' + esc(last.ko) + '</span></h1>' +
      '<p class="muted">先把每个词听一遍、看看例句，再做小测。已经会的点“我已经会了”，就不用测了。</p></div>' +
      '<div class="steps" role="tablist">' + ['看一遍', '小测'].map((n, i) => '<button class="' + (i + 1 === step ? 'on' : '') + '" data-step="' + (i + 1) + '"><b>' + (i + 1) + '</b>' + n + '</button>').join('') + '</div><div id="stepBody"></div></div>';
    $$('.steps button').forEach(b => b.onclick = () => { location.hash = '#/words/today' + (b.dataset.step === '2' ? '/2' : ''); });
    const body = $('#stepBody');
    if (step === 1) {
      body.innerHTML = '<div class="toolbar"><button class="btn" id="seq">连续播放全部</button><button class="btn ' + (S.set.inter ? 'on' : '') + '" id="wvi">逐词对照</button><span class="grow tiny">每个词读两遍：原形，再加最常听到的变形。点例句前面的 ▶ 听整句，点例句里的词看意思和读音。</span></div>' +
        '<ul class="wb-list wb-learn">' + list.map(w => '<li class="wb-row open" data-w="' + esc(w.ko) + '">' + pbtn(KS.wordSay(w), 'f') + '<div class="grow"><div class="wb-head"><b lang="ko">' + esc(w.ko) + '</b>' + (pronOf(w.ko) ? ' ' + pronTag(w.ko) : '') +
          (w.f ? ' <span class="f" lang="ko">' + esc(w.f) + '</span>' : '') + '<span class="zh-text">' + esc(w.zh) + '</span><span class="tag">' + wLetter(w) + ' · ' + W_TYPE[w.t] + '</span></div><div class="wb-more">' + wMore(w) + '</div></div></li>').join('') + '</ul>' +
        '<div class="step-foot"><a class="btn" href="#/words">回单词本</a><a class="btn primary" href="#/words/today/2">下一步：小测</a></div>';
      $('#wvi').onclick = () => { S.set.inter = !S.set.inter; save(); viewWordsToday(1); };
      const sb = $('#seq');
      sb.onclick = async () => {
        if (sb.dataset.on) { stopAudio(); return; }
        sb.dataset.on = '1'; sb.textContent = '停止';
        const btns = $$('.wb-learn > li > .play', body);
        await playSeq(list.map(w => ({ t: KS.wordSay(w), v: 'f' })), i => btns.forEach((b, j) => b.classList.toggle('playing', j === i)));
        delete sb.dataset.on; sb.textContent = '连续播放全部';
      };
      main.onclick = e => {
        if (glossClick(e, '单词本')) return;
        const li = e.target.closest('.wb-row'); if (!li) return;
        const w = WORDS[WIDX[li.dataset.w]];
        if (e.target.closest('[data-wknow]')) { S.known[w.ko] = 1; save(); $('.wb-more', li).innerHTML = wMore(w); toast('标记为已经会了，小测里不出这个词。'); }
        if (e.target.closest('[data-wunknow]')) { delete S.known[w.ko]; save(); $('.wb-more', li).innerHTML = wMore(w); }
        if (e.target.closest('[data-wadd]')) { addCard(wbCard(w)); save(); renderNav(); $('.wb-more', li).innerHTML = wMore(w); }
      };
      return;
    }
    // 小测：听音选意思、看中文选韩语交替出；干扰项尽量选同类型的词
    const test = list.filter(w => !S.known[w.ko]);
    const others = (w, key) => { const same = WORDS.filter(x => x !== w && x.t === w.t && x[key] !== w[key]); return shuffle(same).slice(0, 3); };
    const qs = test.map((w, i) => ({ w: w, kind: i % 2 ? 'read' : 'listen', opts: shuffle([w].concat(others(w, i % 2 ? 'ko' : 'zh'))) }));
    let score = 0, answered = 0;
    body.innerHTML = (qs.length ? '<section class="drill"><h3>小测</h3><p class="tiny">单数题听音选意思，双数题看中文选韩语。</p>' + qs.map((q, n) => '<div class="q" data-wq="' + n + '">' +
      (q.kind === 'listen' ? '<div class="row">' + pbtn(KS.wordSay(q.w), 'f') + '<span class="muted small">第 ' + (n + 1) + ' 题：听音选意思</span></div>' : '<div class="qtext">' + esc(q.w.zh) + '<span class="muted small">　第 ' + (n + 1) + ' 题</span></div>') +
      '<div class="choices">' + q.opts.map((o, j) => '<button class="choice" data-o="' + j + '"' + (q.kind === 'read' ? ' lang="ko"' : '') + '>' + esc(q.kind === 'read' ? o.ko : o.zh) + '</button>').join('') + '</div><div class="verdict"></div></div>').join('') + '</section>' : '<p class="muted">这组词你都标成“已经会了”。</p>') +
      '<div class="finish" id="finish"><button class="btn primary big" id="done">完成今天这组</button><p class="tiny" style="margin-top:10px">完成后，这 ' + test.length + ' 个词进入复习，明天开始出现。</p></div>' +
      '<div class="step-foot"><a class="btn" href="#/words/today">上一步</a><span></span></div>';
    $$('[data-wq]', body).forEach(box => {
      const q = qs[+box.dataset.wq];
      $$('.choice', box).forEach(c => c.onclick = () => {
        const right = q.opts[+c.dataset.o] === q.w;
        $$('.choice', box).forEach(x => { x.disabled = true; if (q.opts[+x.dataset.o] === q.w) x.classList.add('right'); });
        if (!right) c.classList.add('wrong'); else score++;
        answered++;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (right ? '答对了。' : '不对。') + '<b lang="ko">' + esc(q.w.ko) + '</b>' + (pronOf(q.w.ko) ? ' ' + pronTag(q.w.ko) : '') + '：' + esc(q.w.zh) + '。' + (q.w.ex ? ' 例句：<span lang="ko">' + esc(q.w.ex) + '</span>' : '');
        if (q.kind === 'read') play(KS.wordSay(q.w), 'f');
      });
    });
    $('#done').onclick = () => {
      let n = 0;
      test.forEach(w => { if (addCard(wbCard(w), today() + 1)) n++; });
      S.wd.done = S.wd.list.length;
      logAct(); save(); renderNav();
      const left = WORDS.filter(w => wStatus(w) === 'new').length;
      $('#finish').innerHTML = '<div class="cap md pink pop" lang="ko">완료!</div><p>答对了 ' + score + ' / ' + qs.length + ' 题。' + (n ? '新加入 ' + n + ' 张复习卡片，明天开始出现。' : '') + '还剩 ' + left + ' 个词没学。</p>' +
        '<div class="row" style="justify-content:center;margin-top:16px">' + (left ? '<button class="btn" id="wMore2">再来一组</button>' : '') + '<a class="btn primary" href="#/words">回单词本</a></div>';
      const m2 = $('#wMore2'); if (m2) m2.onclick = () => { todaySet(true); location.hash = '#/words/today'; route(); };
    };
  }

  function viewTopic(id, step) {
    const t = TOPIC[id];
    if (!t) { location.hash = '#/learn'; return; }
    const TSTEPS = t.lesson ? ['讲解', '词汇', '对话', '练习'] : ['词汇', '对话', '练习'];
    const STEPFN = t.lesson ? [topicLesson, topicWordsStep, topicTalk, topicPractice] : [topicWordsStep, topicTalk, topicPractice];
    step = Math.min(TSTEPS.length, Math.max(1, +step || 1));
    const ws = topicWords(t), after = EP[t.after];
    main.innerHTML = '<div class="wrap"><div class="ep-head"><div class="kicker"><a href="#/learn">课程</a>　场景词汇</div>' +
      '<div class="cap lg pop" lang="ko">' + esc(t.ko) + '</div><h1>' + esc(t.zh) + '</h1><p class="muted">' + esc(t.intro) + '</p>' +
      '<p class="tiny">' + ws.length + ' 个词' + (after ? '。建议学完' + epLabel(after) + '「' + esc(after.title) + '」再学' : '') + '</p></div>' +
      '<div class="steps" role="tablist">' + TSTEPS.map((n, i) => '<button role="tab" aria-selected="' + (i + 1 === step) + '" class="' + (i + 1 === step ? 'on' : '') + '" data-step="' + (i + 1) + '"><b>' + (i + 1) + '</b>' + n + '</button>').join('') + '</div>' +
      '<div id="stepBody"></div></div>';
    $$('.steps button').forEach(b => b.onclick = () => { location.hash = '#/t/' + id + '/' + b.dataset.step; });
    const body = $('#stepBody');
    const foot = (prev, next) => '<div class="step-foot">' + (prev ? '<a class="btn" href="#/t/' + id + '/' + (step - 1) + '">上一步</a>' : '<span></span>') +
      (next ? '<a class="btn primary" href="#/t/' + id + '/' + (step + 1) + '">下一步：' + TSTEPS[step] + '</a>' : '') + '</div>';
    const findWord = x => { const k = ws.findIndex(w => w.ko === (x.lemma || x.ko) || w.f === x.ko); return k >= 0 ? topicCard(t, ws[k], k) : null; };
    main.onclick = e => { glossClick(e, '场景词汇：' + t.zh, findWord); };  // 不能把返回值交给 onclick：返回 false 会让链接点不动
    STEPFN[step - 1](t, body, foot);
  }

  function topicWordsStep(t, body, foot) {
    const ws = topicWords(t);
    let k = 0;
    const veil = S.set.veilZh ? ' veil' : '';
    body.innerHTML = '<div class="toolbar"><button class="btn" id="seq">连续播放全部</button>' +
      '<button class="btn ' + (S.set.veilZh ? 'on' : '') + '" id="vz">' + (S.set.veilZh ? '中文已遮住' : '遮住中文') + '</button>' +
      '<button class="btn ' + (S.set.inter ? 'on' : '') + '" id="vi">' + (S.set.inter ? '逐词对照已开' : '逐词对照') + '</button>' +
      '<span class="grow tiny">粉色方括号是实际读音，和写法不一样时才标。例句里的词可以点开看意思。学完点“练习”最后的“完成”，这些词会进入复习。</span></div>' +
      t.groups.map(g => '<section class="tgroup"><h3>' + esc(g.name) + '</h3><div class="words">' + g.words.map(w => {
        const i = k++;
        return '<div class="word">' + pbtn(KS.wordSay(w), KS.vx(i)) + '<div class="grow"><div class="ko-text" lang="ko">' + esc(w.ko) + ' ' + pronTag(w.ko) +
          (w.f && w.f !== w.ko ? '<span class="f">　' + esc(w.f) + '</span> ' + pronTag(w.f) : '') + '</div>' +
          '<div class="zh-text' + veil + '">' + esc(w.zh) + '</div>' + (w.n ? '<div class="note">' + esc(w.n) + '</div>' : '') +
          (w.ex ? '<div class="w-use">' + pbtn(w.ex, KS.vx(i + 1)) + '<div class="grow">' + glossLine(w.ex, 'w-line', S.set.inter) +
            (pronOf(w.ex) ? '<div class="tiny">读作 <span class="pron">[' + esc(pronOf(w.ex)) + ']</span></div>' : '') +
            '<div class="tiny' + veil + '">' + esc(w.exzh) + '</div></div></div>' : '') + '</div></div>';
      }).join('') + '</div></section>').join('') + foot(!!t.lesson, true);
    $('#vz').onclick = () => { S.set.veilZh = !S.set.veilZh; save(); stopAudio(); topicWordsStep(t, body, foot); };
    $('#vi').onclick = () => { S.set.inter = !S.set.inter; save(); stopAudio(); topicWordsStep(t, body, foot); };
    const seqBtn = $('#seq');
    seqBtn.onclick = async () => {
      if (seqBtn.dataset.on) { stopAudio(); return; }
      seqBtn.dataset.on = '1'; seqBtn.textContent = '停止';
      const btns = $$('.word > .play', body);
      await playSeq(ws.map((w, i) => ({ t: KS.wordSay(w), v: KS.vx(i) })), i => {
        btns.forEach((b, j) => b.classList.toggle('playing', j === i));
        if (i >= 0 && btns[i]) btns[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      btns.forEach(b => b.classList.remove('playing'));
      delete seqBtn.dataset.on; seqBtn.textContent = '连续播放全部';
    };
  }

  function topicTalk(t, body, foot) {
    const tk = t.talk;
    const render = () => {
      body.innerHTML = '<p class="scene">' + esc(tk.scene) + '</p>' +
        '<div class="toolbar" style="margin-top:18px"><button class="btn" id="seq">连续播放全部</button>' +
        '<button class="btn ' + (S.set.veilZh ? 'on' : '') + '" id="vz">' + (S.set.veilZh ? '中文已遮住' : '遮住中文') + '</button>' +
        '<button class="btn ' + (S.set.inter ? 'on' : '') + '" id="vi">' + (S.set.inter ? '逐词对照已开' : '逐词对照') + '</button>' +
        '<span class="grow tiny">点任意一个词看意思。蓝色下划线是这个主题的生词。</span></div>' +
        '<ol class="lines">' + tk.lines.map((l, i) => {
          const ch = CHARS[l.w] || [l.w, '#5B6B82'], saved = !!S.cards['l:' + l.ko];
          return '<li class="line" data-i="' + i + '"><div class="who" style="color:' + ch[1] + '" lang="ko">' + esc(l.w) + '<small>' + ch[0] + '</small></div>' +
            '<div><div class="say">' + pbtn(l.ko, l.v) + sbtn(l.ko, l.v) + '<div class="grow">' + glossLine(l.ko, '', S.set.inter) +
            (pronOf(l.ko) ? '<div class="tiny">读作 <span class="pron">[' + esc(pronOf(l.ko)) + ']</span></div>' : '') +
            '<div class="zh-text ' + (S.set.veilZh ? 'veil' : '') + '">' + esc(l.zh) + '</div>' + (l.n ? '<div class="note">' + esc(l.n) + '</div>' : '') + '</div></div>' +
            '<div class="line-tools"><button class="btn sm" data-keep="' + i + '"' + (saved ? ' disabled' : '') + '>' + (saved ? '已在复习里' : '收藏到复习') + '</button></div></div></li>';
        }).join('') + '</ol>' + foot(true, true);
      // 本主题的生词加蓝色下划线
      const keys = new Set(topicWords(t).map(w => w.ko));
      $$('.line [data-gk]', body).forEach(host => {
        const g = autoG(host.dataset.gk);
        if (!g) return;
        $$('.tok', host).forEach((el, ti) => { if (g[ti] && g[ti].some(x => !x.gram && (keys.has(x.lemma) || keys.has(x.ko)))) el.classList.add('new'); });
      });
      $('#vz').onclick = () => { S.set.veilZh = !S.set.veilZh; save(); stopAudio(); render(); };
      $('#vi').onclick = () => { S.set.inter = !S.set.inter; save(); stopAudio(); render(); };
      const seqBtn = $('#seq');
      seqBtn.onclick = async () => {
        if (seqBtn.dataset.on) { stopAudio(); return; }
        seqBtn.dataset.on = '1'; seqBtn.textContent = '停止';
        await playSeq(tk.lines.map(l => ({ t: l.ko, v: l.v })), i => $$('.line', body).forEach(li => li.classList.toggle('cur', +li.dataset.i === i)));
        $$('.line', body).forEach(li => li.classList.remove('cur'));
        delete seqBtn.dataset.on; seqBtn.textContent = '连续播放全部';
      };
    };
    render();
    const base = main.onclick;
    main.onclick = e => {
      if (base && base(e)) return;
      const kp = e.target.closest('[data-keep]');
      if (!kp) return;
      const l = tk.lines[+kp.dataset.keep];
      addCard({ id: 'l:' + l.ko, kind: 'line', ko: l.ko, zh: l.zh, v: l.v, src: '场景词汇：' + t.zh, g: AUTO.gloss[l.ko] ? autoG(l.ko) : undefined });
      save(); renderNav(); kp.disabled = true; kp.textContent = '已在复习里'; toast('已加入复习，今天就会出现。');
    };
  }

  function topicPractice(t, body, foot) {
    const ws = topicWords(t), idx = ws.map((w, i) => i);
    const pick = (n, f) => shuffle(idx.filter(i => !f || f(ws[i]))).slice(0, n);
    const opts = (i, key) => {
      const others = shuffle(idx.filter(j => j !== i && ws[j][key] !== ws[i][key])).slice(0, 3);
      return shuffle([i].concat(others));
    };
    const listen = pick(8).map(i => ({ i: i, o: opts(i, 'zh') }));
    const read = pick(6, w => !listen.some(q => ws[q.i] === w)).map(i => ({ i: i, o: opts(i, 'ko') }));
    const dict = pick(3, w => !/\s/.test(w.ko) && w.ko.length <= 5);
    let score = 0;
    body.innerHTML =
      '<section class="drill"><h3>听音选意思</h3><p class="tiny">先听，再选中文意思。</p>' + listen.map((q, n) => '<div class="q" data-lq="' + n + '"><div class="row">' + pbtn(KS.wordSay(ws[q.i]), KS.vx(q.i)) + '<span class="muted small">第 ' + (n + 1) + ' 题</span></div>' +
        '<div class="choices">' + q.o.map(j => '<button class="choice" data-o="' + j + '">' + esc(ws[j].zh) + '</button>').join('') + '</div><div class="verdict"></div></div>').join('') + '</section>' +
      '<section class="drill"><h3>看中文选韩语</h3>' + read.map((q, n) => '<div class="q" data-rq="' + n + '"><div class="qtext">' + esc(ws[q.i].zh) + '</div>' +
        '<div class="choices">' + q.o.map(j => '<button class="choice" lang="ko" data-o="' + j + '">' + esc(ws[j].ko) + '</button>').join('') + '</div><div class="verdict"></div></div>').join('') + '</section>' +
      '<section class="drill"><h3>听写</h3><p class="tiny">听到什么就打什么。需要电脑装了韩语输入法，没装可以跳过。</p>' + dict.map((i, n) => '<div class="q" data-dq="' + n + '"><div class="row">' + pbtn(ws[i].ko, KS.vx(i)) + sbtn(ws[i].ko, KS.vx(i)) + '</div>' +
        '<input class="dict-in" lang="ko" autocomplete="off" spellcheck="false" placeholder="在这里输入韩语"><div class="row" style="margin-top:10px"><button class="btn sm" data-check>检查</button></div><div class="diff"></div><div class="verdict"></div></div>').join('') + '</section>' +
      (t.numDrill ? '<section class="drill"><h3>听数字，写阿拉伯数字</h3><p class="tiny">听到的数字用阿拉伯数字写出来，比如 3:30、15000、6月10日。只看数字对不对，标点和单位随便写。</p>' +
        t.numDrill.map((d, n) => '<div class="q" data-nq="' + n + '"><div class="row">' + pbtn(d.ko, KS.vx(n)) + sbtn(d.ko, KS.vx(n)) + '<span class="muted small">第 ' + (n + 1) + ' 题</span></div>' +
          '<div class="row" style="margin-top:8px"><input class="dict-in num-in" inputmode="decimal" autocomplete="off" placeholder="写数字"><button class="btn sm" data-ncheck>检查</button></div><div class="verdict"></div></div>').join('') + '</section>' : '') +
      (t.quiz ? '<section class="drill"><h3>选一选</h3>' + t.quiz.map((q, n) => {
        const order = shuffle(q.opts.map((o, j) => j)), isKo = s => /[가-힣]/.test(s);
        return '<div class="q" data-tq="' + n + '"><div class="qtext">' + esc(q.q) + '</div><div class="choices">' +
          order.map(j => '<button class="choice" data-o="' + j + '"' + (isKo(q.opts[j]) ? ' lang="ko"' : '') + '>' + esc(q.opts[j]) + '</button>').join('') + '</div><div class="verdict"></div></div>';
      }).join('') + '</section>' : '') +
      '<div class="finish" id="finish"><button class="btn primary big" id="done">完成这个主题</button><p class="tiny" style="margin-top:10px">完成后，这 ' + ws.length + ' 个词会进入复习，明天开始出现。</p></div>' + foot(true, false);
    const answer = (box, q, key) => {
      $$('.choice', box).forEach(c => c.onclick = () => {
        const right = +c.dataset.o === q.i, w = ws[q.i];
        $$('.choice', box).forEach(x => { x.disabled = true; if (+x.dataset.o === q.i) x.classList.add('right'); });
        if (!right) c.classList.add('wrong'); else score++;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (right ? '答对了。' : '不对。') + '<span lang="ko">' + esc(w.ko) + '</span>' + (pronOf(w.ko) ? ' ' + pronTag(w.ko) : '') + '：' + esc(w.zh) + '。' + (w.ex ? '例句：<span lang="ko">' + esc(w.ex) + '</span>，' + esc(w.exzh) : '');
        if (key === 'ko') play(KS.wordSay(w), KS.vx(q.i));
      });
    };
    $$('[data-nq]', body).forEach(box => {
      const d = t.numDrill[+box.dataset.nq], inp = $('input', box);
      const go = () => {
        if (!inp.value.trim()) { inp.focus(); return; }
        const right = numGroups(inp.value).join(',') === numGroups(d.a).join(',');
        if (right && !box.dataset.ok) { score++; box.dataset.ok = '1'; }
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (right ? '对了。' : '不对，答案是 ' + esc(d.a) + '。') + ' <span lang="ko">' + esc(d.ko) + '</span>' + (pronOf(d.ko) ? ' ' + pronTag(d.ko) : '');
      };
      $('[data-ncheck]', box).onclick = go;
      inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    });
    $$('[data-tq]', body).forEach(box => {
      const q = t.quiz[+box.dataset.tq];
      $$('.choice', box).forEach(c => c.onclick = () => {
        const right = +c.dataset.o === q.a;
        $$('.choice', box).forEach(x => { x.disabled = true; if (+x.dataset.o === q.a) x.classList.add('right'); });
        if (!right) c.classList.add('wrong'); else score++;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (right ? '答对了。' : '不对，答案是“' + esc(q.opts[q.a]) + '”。') + (q.why ? ' ' + esc(q.why) : '') +
          (q.say ? ' <span lang="ko">' + esc(q.say) + '</span>' + (pronOf(q.say) ? ' ' + pronTag(q.say) : '') : '');
        if (q.say) play(q.say, 'f');
      });
    });
    $$('[data-lq]', body).forEach(box => answer(box, listen[+box.dataset.lq], 'zh'));
    $$('[data-rq]', body).forEach(box => answer(box, read[+box.dataset.rq], 'ko'));
    $$('[data-dq]', body).forEach(box => {
      const w = ws[dict[+box.dataset.dq]], inp = $('input', box);
      const go = () => {
        if (!inp.value.trim()) { inp.focus(); return; }
        const r = diff(w.ko, inp.value);
        $('.diff', box).innerHTML = r.html;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (r.exact ? 'good' : 'bad');
        v.innerHTML = (r.exact ? '完全正确。' : '红色波浪线是漏掉或写错的字。') + ' 答案：<span lang="ko">' + esc(w.ko) + '</span>' + (pronOf(w.ko) ? ' ' + pronTag(w.ko) : '') + '，' + esc(w.zh);
        if (r.exact) score++;
      };
      $('[data-check]', box).onclick = go;
      inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    });
    $('#done').onclick = () => {
      let n = 0;
      const due = today() + 1;
      ws.forEach((w, i) => { if (addCard(topicCard(t, w, i), due)) n++; });
      const first = !S.done['t:' + t.id];
      S.done['t:' + t.id] = { d: today(), score: score };
      logAct(); save(); renderNav();
      const nx = TOPICS.find(x => !S.done['t:' + x.id]);
      $('#finish').innerHTML = '<div class="cap md pink pop" lang="ko">' + (first ? '완료!' : '복습 완료!') + '</div>' +
        '<p>答对了 ' + score + ' / ' + (listen.length + read.length + dict.length + (t.numDrill || []).length + (t.quiz || []).length) + ' 题。' + (n ? '新加入 ' + n + ' 张复习卡片，明天开始出现。' : '这些词之前已经在复习里了。') + '</p>' +
        '<div class="row" style="justify-content:center;margin-top:16px">' + (nx ? '<a class="btn primary" href="#/t/' + nx.id + '">下一个主题：' + esc(nx.zh) + '</a>' : '') + '<a class="btn" href="#/learn">回到课程</a></div>';
    };
  }


  // ---------- 单集 ----------
  const STEP_NAMES = ['盲听', '逐句', '词汇', '语法', '练习'];
  function viewEpisode(id, step) {
    const ep = EP[id];
    if (!ep) { location.hash = '#/learn'; return; }
    step = Math.min(5, Math.max(1, +step || 1));
    main.innerHTML = '<div class="wrap"><div class="ep-head"><div class="kicker"><a href="#/learn">课程</a>　' + epLabel(ep) + '</div>' +
      '<div class="cap lg pop" lang="ko">' + esc(ep.caption) + '</div><h1>' + esc(ep.title) + '</h1><p class="muted">' + esc(ep.goal) + '</p></div>' +
      '<div class="steps" role="tablist">' + STEP_NAMES.map((n, i) => '<button role="tab" aria-selected="' + (i + 1 === step) + '" class="' + (i + 1 === step ? 'on' : '') + '" data-step="' + (i + 1) + '"><b>' + (i + 1) + '</b>' + n + '</button>').join('') + '</div>' +
      '<div id="stepBody"></div></div>';
    $$('.steps button').forEach(b => b.onclick = () => { location.hash = '#/e/' + id + '/' + b.dataset.step; });
    const body = $('#stepBody');
    const foot = (prev, next) => '<div class="step-foot">' + (prev ? '<a class="btn" href="#/e/' + id + '/' + (step - 1) + '">上一步</a>' : '<span></span>') +
      (next ? '<a class="btn primary" href="#/e/' + id + '/' + (step + 1) + '">下一步：' + STEP_NAMES[step] + '</a>' : '') + '</div>';
    [stepListen, stepLines, stepWords, stepGrammar, stepPractice][step - 1](ep, body, foot);
  }

  function stepListen(ep, body, foot) {
    const g = ep.gist, order = shuffle(g.opts.map((o, i) => i));
    body.innerHTML = '<p class="scene">' + esc(ep.scene) + '</p>' +
      '<div class="listen-box"><button class="play huge" id="playAll" aria-label="播放整段对话">' + ICON + '</button>' +
      '<div><h3>先不看文字，听完整段对话</h3><p class="now" id="now">听不懂没关系，抓住几个熟悉的词就行。可以多听几遍。</p></div></div>' +
      '<div class="panel"><h3>' + esc(g.q) + '</h3><div class="choices">' + order.map(i => '<button class="choice" data-i="' + i + '">' + esc(g.opts[i]) + '</button>').join('') + '</div><div class="verdict" id="gv"></div></div>' +
      foot(false, true);
    const btn = $('#playAll'), now = $('#now');
    let playing = false;
    btn.onclick = async () => {
      if (playing) { stopAudio(); return; }
      playing = true;
      const run = playSeq(ep.dialogue.map(l => ({ t: l.ko, v: l.v })), i => { if (i >= 0) now.textContent = '第 ' + (i + 1) + ' 句，共 ' + ep.dialogue.length + ' 句'; });
      btn.classList.add('playing');
      const ok = await run;
      playing = false; btn.classList.remove('playing');
      now.textContent = ok ? '听完了。回答下面的问题，再进入下一步。' : '已停止。';
    };
    $$('.choice', body).forEach(c => c.onclick = () => {
      const i = +c.dataset.i;
      $$('.choice', body).forEach(x => { x.disabled = true; if (+x.dataset.i === g.a) x.classList.add('right'); });
      const gv = $('#gv');
      if (i === g.a) { gv.className = 'verdict good'; gv.textContent = '答对了。'; }
      else { c.classList.add('wrong'); gv.className = 'verdict bad'; gv.textContent = '正确答案是“' + g.opts[g.a] + '”。逐句听的时候再留意一下。'; }
    });
  }

  function stepLines(ep, body, foot) {
    const src = epLabel(ep);
    const recs = {};
    let recorder = null;
    const render = () => {
      body.innerHTML = '<div class="toolbar"><button class="btn" id="seq">连续播放全部</button>' +
        '<button class="btn ' + (S.set.veilKo ? 'on' : '') + '" id="vk">' + (S.set.veilKo ? '韩文已遮住' : '遮住韩文') + '</button>' +
        '<button class="btn ' + (S.set.veilZh ? 'on' : '') + '" id="vz">' + (S.set.veilZh ? '中文已遮住' : '遮住中文') + '</button>' +
        '<button class="btn ' + (S.set.inter ? 'on' : '') + '" id="vi">' + (S.set.inter ? '逐词对照已开' : '逐词对照') + '</button>' +
        '<span class="grow tiny">点任意一个词，看它的意思和原形。带蓝色下划线的是本集生词。</span></div>' +
        '<ol class="lines">' + ep.dialogue.map((l, i) => {
          const ch = CHARS[l.w] || [l.w, '#5B6B82'];
          const saved = !!S.cards['l:' + l.ko];
          return '<li class="line" data-i="' + i + '"><div class="who" style="color:' + ch[1] + '" lang="ko">' + esc(l.w) + '<small>' + ch[0] + '</small></div>' +
            '<div><div class="say">' + pbtn(l.ko, l.v) + sbtn(l.ko, l.v) + '<div class="grow"><div class="ko-text ' + (S.set.veilKo ? 'veil' : '') + '" lang="ko">' + tokHtml(l.ko, l.g, { ep: ep, inter: S.set.inter }) + '</div>' +
            '<div class="zh-text ' + (S.set.veilZh ? 'veil' : '') + '">' + esc(l.zh) + '</div>' + (l.n ? '<div class="note">' + esc(l.n) + '</div>' : '') + '</div></div>' +
            '<div class="line-tools"><button class="btn sm" data-rec="' + i + '">跟读录音</button><button class="btn sm" data-cmp="' + i + '"' + (recs[i] ? '' : ' hidden') + '>对比回放</button>' +
            '<button class="btn sm" data-keep="' + i + '"' + (saved ? ' disabled' : '') + '>' + (saved ? '已在复习里' : '收藏到复习') + '</button></div></div></li>';
        }).join('') + '</ol>' + foot(true, true);
      $('#vk').onclick = () => { S.set.veilKo = !S.set.veilKo; save(); stopAudio(); render(); };
      $('#vz').onclick = () => { S.set.veilZh = !S.set.veilZh; save(); stopAudio(); render(); };
      $('#vi').onclick = () => { S.set.inter = !S.set.inter; save(); stopAudio(); render(); };
      const seqBtn = $('#seq');
      seqBtn.onclick = async () => {
        if (seqBtn.dataset.on) { stopAudio(); return; }
        seqBtn.dataset.on = '1'; seqBtn.textContent = '停止';
        await playSeq(ep.dialogue.map(l => ({ t: l.ko, v: l.v })), i => {
          $$('.line', body).forEach(li => li.classList.toggle('cur', +li.dataset.i === i));
          const li = $('.line[data-i="' + i + '"]', body);
          if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        $$('.line', body).forEach(li => li.classList.remove('cur'));
        delete seqBtn.dataset.on; seqBtn.textContent = '连续播放全部';
      };
    };
    render();
    main.onclick = async e => {
      if (e.target.closest('.veil')) return;
      const tk = e.target.closest('.tok[data-t]');
      if (tk) {
        const li = tk.closest('.line'), l = ep.dialogue[+li.dataset.i], was = tk.classList.contains('open');
        $$('.tok.open', li).forEach(x => x.classList.remove('open'));
        const old = $('.gloss-box', li); if (old) old.remove();
        if (was || !l.g) return;
        tk.classList.add('open');
        $('.ko-text', li).insertAdjacentHTML('afterend', tokDetail(l.ko, l.g, +tk.dataset.t, ep));
        return;
      }
      const aw = e.target.closest('[data-addw]');
      if (aw) {
        addWordByKey(aw.dataset.addw); save(); renderNav();
        aw.disabled = true; aw.textContent = '已加入复习'; toast('已加入复习，今天就会出现。');
        return;
      }
      const keep = e.target.closest('[data-keep]'), rec = e.target.closest('[data-rec]'), cmp = e.target.closest('[data-cmp]');
      if (keep) {
        const l = ep.dialogue[+keep.dataset.keep];
        addCard(lineCard(l, src)); save();
        keep.disabled = true; keep.textContent = '已在复习里'; toast('已加入复习，今天就会出现。'); renderNav();
      } else if (rec) {
        const i = +rec.dataset.rec;
        if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
        if (!navigator.mediaDevices || !window.MediaRecorder) { toast('这个浏览器不支持录音。请用 Edge 或 Chrome，并通过“启动.bat”打开。'); return; }
        let stream;
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
        catch (err) { toast('没有拿到麦克风权限。在地址栏左侧允许使用麦克风后再试。'); return; }
        stopAudio();
        const chunks = [];
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = ev => chunks.push(ev.data);
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          if (recs[i]) URL.revokeObjectURL(recs[i]);
          recs[i] = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
          recorder = null;
          rec.textContent = '重新录'; rec.classList.remove('rec');
          const c = $('[data-cmp="' + i + '"]', body); if (c) c.hidden = false;
          const l = ep.dialogue[i];
          await playOne(l.ko, l.v); await sleep(300); await playUrl(recs[i]);
        };
        recorder.start();
        rec.textContent = '停止录音'; rec.classList.add('rec');
      } else if (cmp) {
        const i = +cmp.dataset.cmp, l = ep.dialogue[i];
        stopAudio(); const my = token;
        await playOne(l.ko, l.v); if (my !== token) return;
        await sleep(300); if (my !== token) return;
        await playUrl(recs[i]);
      }
    };
    leave = () => { if (recorder && recorder.state === 'recording') recorder.stop(); Object.values(recs).forEach(u => URL.revokeObjectURL(u)); };
  }

  // 词汇卡下面那句：先找本集台词，找不到再找本集语法例句
  function wordUse(ep, w) {
    const key = w.id || w.ko;
    const k = ep.dialogue.findIndex(l => lineHas(l, key));
    if (k >= 0) {
      const l = ep.dialogue[k];
      return '<div class="w-use">' + pbtn(l.ko, l.v) + '<div><span class="tiny">台词第 ' + (k + 1) + ' 句</span><div class="w-line" lang="ko">' + tokHtml(l.ko, l.g, { hi: key, click: false }) + '</div></div></div>';
    }
    // 在没有逐词标注的例句里找这个词：名词只认“原词加助词”，动词认常用形和词干
    const PARTICLES = ['', '은', '는', '이', '가', '을', '를', '에', '에서', '도', '만', '랑', '이랑', '하고', '한테', '부터', '까지', '요', '야', '이야', '이에요', '예요', '이었어', '였어', '의', '으로', '로', '이네', '네', '이지', '지'];
    const multi = /\s/.test(w.ko), isVerb = !multi && /다$/.test(w.ko);
    const stems = [];
    if (isVerb) {
      const st = w.ko.slice(0, -1);
      if (w.f) stems.push(w.f);
      if (/하$/.test(st) && st.length > 1) stems.push(st.slice(0, -1));
      stems.push(st);
    }
    const hit = (t, loose) => isVerb ? stems.some(s => s && t.indexOf(s) === 0 && (s.length > 1 || loose)) : PARTICLES.some(p => t === w.ko + p);
    const inEx = (ex, loose) => multi ? ex.ko.indexOf(w.ko) >= 0 || (!!w.f && ex.ko.indexOf(w.f) >= 0) : ex.ko.split(' ').some(t => hit(t.replace(PUNCT, ''), loose));
    const exUse = (x, label) => '<div class="w-use">' + pbtn(x.ko, 'f') + '<div><span class="tiny">' + label + '</span><div class="w-line" lang="ko">' + esc(x.ko) + '</div><div class="tiny">' + esc(x.zh) + '</div></div></div>';
    const findEx = (e, loose) => { for (const g of e.grammar) { const x = g.examples.find(ex => inEx(ex, loose)); if (x) return x; } return null; };
    const own = findEx(ep, true);
    if (own) return exUse(own, '语法例句');
    // 本集找不到，就去别的集找：先找台词，再找语法例句
    for (const e of EPS) {
      if (e === ep) continue;
      const l = e.dialogue.find(d => lineHas(d, key));
      if (l) return '<div class="w-use">' + pbtn(l.ko, l.v) + '<div><span class="tiny">' + epLabel(e) + '的台词</span><div class="w-line" lang="ko">' + tokHtml(l.ko, l.g, { hi: key, click: false }) + '</div><div class="tiny">' + esc(l.zh) + '</div></div></div>';
    }
    for (const e of EPS) { if (e === ep) continue; const x = findEx(e, false); if (x) return exUse(x, epLabel(e) + '的例句'); }
    return '';
  }

  function stepWords(ep, body, foot) {
    body.innerHTML = '<div class="toolbar"><button class="btn" id="seq">连续播放全部</button>' +
      '<button class="btn ' + (S.set.veilZh ? 'on' : '') + '" id="vz">' + (S.set.veilZh ? '中文已遮住' : '遮住中文') + '</button>' +
      '<span class="grow tiny">蓝色是口语里最常听到的变形。完成这一集后，这些词会自动进入复习。</span></div>' +
      '<div class="words">' + ep.vocab.map((w, i) => '<div class="word">' + pbtn(KS.wordSay(w), KS.vx(i)) + '<div class="grow"><div class="ko-text" lang="ko">' + esc(w.ko) +
        (w.f && w.f !== w.ko ? ' <span class="f">' + esc(w.f) + '</span>' : '') + '</div><div class="zh-text ' + (S.set.veilZh ? 'veil' : '') + '">' + esc(w.zh) + '</div>' + wordUse(ep, w) + '</div></div>').join('') + '</div>' + foot(true, true);
    $('#vz').onclick = () => { S.set.veilZh = !S.set.veilZh; save(); stopAudio(); stepWords(ep, body, foot); };
    const seqBtn = $('#seq');
    seqBtn.onclick = async () => {
      if (seqBtn.dataset.on) { stopAudio(); return; }
      seqBtn.dataset.on = '1'; seqBtn.textContent = '停止';
      const btns = $$('.word .play', body);
      await playSeq(ep.vocab.map((w, i) => ({ t: KS.wordSay(w), v: KS.vx(i) })), i => btns.forEach((b, k) => b.classList.toggle('playing', k === i)));
      btns.forEach(b => b.classList.remove('playing'));
      delete seqBtn.dataset.on; seqBtn.textContent = '连续播放全部';
    };
  }

  // ---------- 语法讲解：单集的“语法”步骤和“语法速查”共用 ----------
  const GX = D.gx || {};
  function gramHtml(ep, gi) {
    const g = ep.grammar[gi], x = (GX[ep.id] || [])[gi] || {};
    const hitRe = x.hit ? new RegExp(x.hit) : null;
    const hits = hitRe ? ep.dialogue.filter(l => hitRe.test(l.ko)) : [];
    const exLine = (ko, zh, v, extra) => '<li>' + pbtn(ko, v) + sbtn(ko, v) + '<div class="grow">' + glossLine(ko, '', S.set.inter) +
      (pronOf(ko) ? '<div class="tiny">读作 <span class="pron">[' + esc(pronOf(ko)) + ']</span></div>' : '') +
      '<div class="zh-text">' + esc(zh) + (extra || '') + '</div></div></li>';
    const NUM = '①②③④⑤⑥', T = termify;
    const formHtml = (t, v) => '<span class="g-form">' + pbtn(t, v) + '<b lang="ko">' + esc(t) + '</b>' + (pronOf(t) ? pronTag(t) : '') + '</span>';
    const partsHtml = !x.parts ? '' : '<h4>分：' + (x.steps && x.parts.length > 1 ? '规则都一样，按样子分成 ' + x.parts.length + ' 组例子' : x.parts.length + ' 种情况') + '</h4>' + x.parts.map((pt, pi) => {
      const seq = []; pt.rows.forEach(r => { if (r[0]) seq.push({ t: r[0], v: 'f' }); seq.push({ t: r[1], v: 'm' }); });
      return '<div class="g-part"><div class="g-rule"><span class="g-n">' + NUM[pi] + '</span><div class="grow"><b>' + T(esc(pt.name)) + '</b>' + (pt.rule ? '<div class="small muted">' + T(esc(pt.rule)) + '</div>' : '') + '</div>' + qbtn(seq, '听这组') + '</div>' +
        '<ul class="g-rows">' + pt.rows.map(r => '<li>' + (r[0] ? formHtml(r[0], 'f') + '<span class="g-arrow">→</span>' : '') + formHtml(r[1], 'm') + '<span class="zh-text">' + esc(r[2]) + '</span></li>').join('') + '</ul></div>';
    }).join('');
    const d = x.diff;
    const diffHtml = !d ? '' : '<div class="g-diff"><h4>' + esc(d.t) + '：有什么不一样</h4><p class="g-tip">' + T(esc(d.tip)) + '</p>' +
      d.pairs.map(pr => '<div class="g-pair">' + pr.slice(0, 2).map((c, k) => '<div class="g-pl' + (c.bad ? ' bad' : '') + '">' + pbtn(c.ko, KS.vx(k)) + '<div class="grow"><div class="ko-text" lang="ko">' + (c.bad ? '<s>' + esc(c.ko) + '</s> <span class="g-x">错</span>' : esc(c.ko)) + (pronOf(c.ko) ? ' ' + pronTag(c.ko) : '') + '</div><div class="zh-text">' + esc(c.zh) + '</div></div></div>').join('') +
        '<div class="g-pf">' + qbtn(pr.slice(0, 2).map((c, k) => ({ t: c.ko, v: KS.vx(k) })), '连着听') + (pr[2] ? '<span class="small">' + esc(pr[2]) + '</span>' : '') + '</div></div>').join('') +
      (d.choose ? '<div class="g-choose"><b>怎么选</b><ul>' + d.choose.map(c => '<li>' + T(esc(c)) + '</li>').join('') + '</ul></div>' : '') + '</div>';
    if (x.sum) return '<section class="gram g-new" id="g-' + ep.id + '-' + gi + '">' +
      '<div class="g-top"><h3 lang="ko">' + esc(g.name) + '</h3>' +
      (x.say ? '<span class="g-say">' + pbtn(x.say, 'f') + sbtn(x.say, 'f') + '<span lang="ko">' + esc(x.say) + '</span>' + (pronOf(x.say) ? ' ' + pronTag(x.say) : '') + '</span>' : '') + '</div>' +
      '<div class="g-sum"><div class="g-sum-k">总</div><div class="grow"><p>' + T(esc(x.sum)) + '</p>' +
      (x.steps ? '<div class="g-steps"><b>' + (x.steps.length > 1 ? '规则只有一条，分 ' + x.steps.length + ' 步：' : '规则：') + '</b><ol>' + x.steps.map(st => '<li>' + T(esc(st.replace(/^第\s*\d+\s*步[：:]\s*/, ''))) + '</li>').join('') + '</ol></div>' : '') +
      (x.parts && x.parts.length > 1 && !x.steps ? '<p class="g-sum-list">' + x.parts.map((pt, pi) => '<span>' + NUM[pi] + ' ' + esc(pt.name) + '</span>').join('') + '</p>' : '') + '</div></div>' +
      (x.morph ? '<h4>看字怎么变</h4><p class="tiny">蓝色是开头的辅音，黄色是元音，粉色是收音（写在底下的辅音）。点 ▶ 听变化前后。</p>' + morphHtml(x.morph) : '') +
      partsHtml + diffHtml +
      '<h4>例句</h4><ul class="ex-list">' + g.examples.map((e, k) => exLine(e.ko, e.zh, KS.vx(k))).join('') + '</ul>' +
      (hits.length ? '<h4>本集台词里</h4><ul class="ex-list g-hits">' + hits.map(l => exLine(l.ko, l.zh, l.v,
        '　<span class="tiny" lang="ko">' + esc(l.w) + '</span> <a class="tiny" href="#/e/' + ep.id + '/2">去逐句里听</a>')).join('') + '</ul>' : '') +
      quizHtml(ep, gi, x) + '</section>';
    return '<section class="gram" id="g-' + ep.id + '-' + gi + '">' +
      '<div class="g-top"><h3 lang="ko">' + esc(g.name) + '</h3>' +
      (x.say ? '<span class="g-say">' + pbtn(x.say, 'f') + sbtn(x.say, 'f') + '<span lang="ko">' + esc(x.say) + '</span>' + (pronOf(x.say) ? ' ' + pronTag(x.say) : '') + '</span>' : '') + '</div>' +
      (x.core ? '<p class="g-core">' + termify(esc(x.core)) + '</p>' : '') +
      '<p class="g-desc">' + termify(esc(g.desc)) + '</p>' +
      (g.points ? '<ul class="points">' + g.points.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' : '') +
      (x.table ? '<h4>怎么变</h4><div class="g-table-wrap"><table class="g-table"><thead><tr><th></th><th>原来</th><th>怎么变</th><th>结果和实际读音</th><th>意思</th></tr></thead><tbody>' +
        x.table.map((r, k) => '<tr><td>' + pbtn(r[2], KS.vx(k)) + '</td><td lang="ko">' + esc(r[0]) + '</td><td class="muted">' + esc(r[1]) + '</td>' +
          '<td><b lang="ko">' + esc(r[2]) + '</b>' + (pronOf(r[2]) ? ' ' + pronTag(r[2]) : '') + '</td><td>' + esc(r[3]) + '</td></tr>').join('') + '</tbody></table></div>' : '') +
      (x.cmp ? '<h4>' + esc(x.cmp.t) + '</h4><ul class="ex-list g-cmp">' + x.cmp.rows.map((c, k) => exLine(c.ko, c.zh, KS.vx(k))).join('') + '</ul>' : '') +
      '<h4>例句</h4><ul class="ex-list">' + g.examples.map((e, k) => exLine(e.ko, e.zh, KS.vx(k))).join('') + '</ul>' +
      (hits.length ? '<h4>本集台词里</h4><ul class="ex-list g-hits">' + hits.map(l => exLine(l.ko, l.zh, l.v,
        '　<span class="tiny" lang="ko">' + esc(l.w) + '</span> <a class="tiny" href="#/e/' + ep.id + '/2">去逐句里听</a>')).join('') + '</ul>' : '') +
      quizHtml(ep, gi, x) +
      '</section>';
  }
  function quizHtml(ep, gi, x) {
    return x.quiz ? '<h4>试一试</h4>' + x.quiz.map((q, k) => {
      const order = shuffle(q.opts.map((o, j) => j)), isKo = s => /[가-힣]/.test(s);
      return '<div class="q g-q" data-gq="' + ep.id + ':' + gi + ':' + k + '"><div class="qtext"' + (isKo(q.q) ? ' lang="ko"' : '') + '>' + esc(q.q) + '</div>' +
        '<div class="choices">' + order.map(j => '<button class="choice" data-o="' + j + '"' + (isKo(q.opts[j]) ? ' lang="ko"' : '') + '>' + esc(q.opts[j]) + '</button>').join('') + '</div><div class="verdict"></div></div>';
    }).join('') : '';
  }
  // 语法小题和点词：返回 true 表示处理了这次点击
  function gramClick(e) {
    const c = e.target.closest('.g-q .choice');
    if (c && !c.disabled) {
      const box = c.closest('.g-q'), [eid, gi, k] = box.dataset.gq.split(':'), q = GX[eid][+gi].quiz[+k];
      const right = +c.dataset.o === q.a;
      $$('.choice', box).forEach(x => { x.disabled = true; if (+x.dataset.o === q.a) x.classList.add('right'); });
      if (!right) c.classList.add('wrong');
      const v = $('.verdict', box);
      v.className = 'verdict ' + (right ? 'good' : 'bad');
      const say = q.say || (/[가-힣]/.test(q.q) && q.q.indexOf('___') >= 0 ? q.q.replace('___', q.opts[q.a]) : '');
      v.innerHTML = (right ? '答对了。' : '不对，答案是“' + esc(q.opts[q.a]) + '”。') + (q.zh ? '意思是：' + esc(q.zh.replace(/[。.]$/, '')) + '。' : '') + (q.why ? ' ' + esc(q.why) : '') +
        (say && pronOf(say) ? ' 读作 <span class="pron">[' + esc(pronOf(say)) + ']</span>' : '');
      if (say) play(say, 'f');
      return true;
    }
    return glossClick(e, '语法例句');
  }

  function stepGrammar(ep, body, foot) {
    body.innerHTML = '<div class="toolbar"><button class="btn ' + (S.set.inter ? 'on' : '') + '" id="vi">' + (S.set.inter ? '逐词对照已开' : '逐词对照') + '</button>' +
      '<span class="grow tiny">粉色方括号是实际读音，和写法不一样时才标。“慢”按钮放慢播放。例句里的词可以点开看意思。每个语法点最后有两道小题。</span></div>' +
      ep.grammar.map((g, gi) => gramHtml(ep, gi)).join('') + foot(true, true);
    $('#vi').onclick = () => { S.set.inter = !S.set.inter; save(); stopAudio(); stepGrammar(ep, body, foot); };
    main.onclick = e => { gramClick(e); };
  }

  // ---------- 语法速查 ----------
  function viewGrammar() {
    let q = '';
    main.innerHTML = '<div class="wrap"><div class="page-head"><div class="cap lg pop" lang="ko">문법 노트</div>' +
      '<p class="lede">两季课程里的全部语法点。可以按名字、中文意思或韩语搜索，点开就是完整讲解：变形表、读音、例句和小题。</p></div>' +
      '<div class="toolbar"><input class="search" id="gq" placeholder="搜索，比如 거야、因为、过去" aria-label="搜索语法"><span class="grow tiny" id="gn"></span>' +
      '<button class="btn sm ' + (S.set.inter ? 'on' : '') + '" id="vi">逐词对照</button></div><div id="glist"></div></div>';
    const all = [];
    EPS.forEach(ep => ep.grammar.forEach((g, gi) => {
      const x = (GX[ep.id] || [])[gi] || {};
      all.push({ ep: ep, gi: gi, text: [g.name, g.desc, x.core || '', x.sum || '', (x.parts || []).map(p => p.name + ' ' + p.rows.map(r => r.join(' ')).join(' ')).join(' '), x.diff ? x.diff.t + x.diff.tip : '', (x.table || []).map(r => r.join(' ')).join(' '), g.examples.map(e => e.ko + e.zh).join(' ')].join(' ').toLowerCase() });
    }));
    const draw = () => {
      const rows = all.filter(r => !q || r.text.indexOf(q.toLowerCase()) >= 0);
      $('#gn').textContent = (q ? '找到 ' : '共 ') + rows.length + ' 个语法点';
      let last = null;
      $('#glist').innerHTML = rows.length ? rows.map(r => {
        const head = r.ep !== last ? '<h3 class="g-ep"><a href="#/e/' + r.ep.id + '/4">' + epLabel(r.ep) + '</a>　<span lang="ko">' + esc(r.ep.caption) + '</span>　<span class="muted">' + esc(r.ep.title) + '</span></h3>' : '';
        last = r.ep;
        const x = (GX[r.ep.id] || [])[r.gi] || {};
        return head + '<details class="g-item" data-k="' + r.ep.id + ':' + r.gi + '"><summary><b lang="ko">' + esc(r.ep.grammar[r.gi].name) + '</b><span class="muted small">　' + esc(x.sum || x.core || r.ep.grammar[r.gi].desc).slice(0, 60) + '…</span></summary><div class="g-body"></div></details>';
      }).join('') : '<div class="empty">没有找到。换个说法试试，比如只搜一两个字。</div>';
    };
    $('#gq').oninput = e => { q = e.target.value.trim(); draw(); };
    $('#vi').onclick = e => { S.set.inter = !S.set.inter; save(); e.currentTarget.classList.toggle('on', S.set.inter); $$('.g-item[open] .g-body').forEach(b => { const [id, gi] = b.parentNode.dataset.k.split(':'); b.innerHTML = gramHtml(EP[id], +gi); }); };
    $('#glist').addEventListener('toggle', e => {
      const d = e.target;
      if (!d.classList || !d.classList.contains('g-item') || !d.open) return;
      const b = $('.g-body', d);
      if (!b.innerHTML) { const [id, gi] = d.dataset.k.split(':'); b.innerHTML = gramHtml(EP[id], +gi); }
    }, true);
    main.onclick = e => { gramClick(e); };
    draw();
  }

  const normKo = s => s.replace(/[\s.,!?~…"'“”‘’·\-]/g, '');
  function diff(target, input) {
    const a = Array.from(normKo(target)), b = Array.from(normKo(input)), n = a.length, m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0, j = 0, out = '';
    while (i < n && j < m) {
      if (a[i] === b[j]) { out += '<span class="ok">' + esc(a[i]) + '</span>'; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out += '<span class="miss">' + esc(a[i]) + '</span>'; i++; }
      else { out += '<span class="extra">' + esc(b[j]) + '</span>'; j++; }
    }
    while (i < n) out += '<span class="miss">' + esc(a[i++]) + '</span>';
    while (j < m) out += '<span class="extra">' + esc(b[j++]) + '</span>';
    return { html: out, exact: dp[0][0] === n && n === m };
  }

  function stepPractice(ep, body, foot) {
    const score = { quiz: 0, order: 0 };
    const pool = ep.dialogue.filter(l => { const k = l.ko.split(' ').length; return k >= 3 && k <= 9; });
    const orderLines = shuffle(pool).slice(0, 3);
    const rest = ep.dialogue.filter(l => orderLines.indexOf(l) < 0 && normKo(l.ko).length >= 4 && normKo(l.ko).length <= 16);
    const dictLines = shuffle(rest).slice(0, 2);
    const quiz = ep.quiz.map(q => ({ q: q, order: shuffle(q.opts.map((o, i) => i)) }));
    const isKo = s => /[가-힣]/.test(s);

    body.innerHTML =
      '<section class="drill"><h3>选择题</h3><p class="tiny">考的是这一集的语法。</p>' + quiz.map((it, qi) => '<div class="q" data-q="' + qi + '"><div class="qtext"' + (isKo(it.q.q) ? ' lang="ko"' : '') + '>' + esc(it.q.q) + '</div>' +
        '<div class="choices">' + it.order.map(i => '<button class="choice" data-o="' + i + '"' + (isKo(it.q.opts[i]) ? ' lang="ko"' : '') + '>' + esc(it.q.opts[i]) + '</button>').join('') + '</div><div class="verdict"></div></div>').join('') + '</section>' +
      '<section class="drill"><h3>听音排句</h3><p class="tiny">听一句台词，按听到的顺序点词块。点上面的词块可以放回去。</p>' + orderLines.map((l, li) => {
        const chunks = l.ko.split(' ');
        let sh = shuffle(chunks.map((c, i) => i));
        for (let k = 0; k < 8 && sh.every((v, i) => v === i); k++) sh = shuffle(sh);
        return '<div class="q" data-ord="' + li + '"><div class="row">' + pbtn(l.ko, l.v) + sbtn(l.ko, l.v) + '<span class="muted small">第 ' + (li + 1) + ' 句</span></div>' +
          '<div class="tiles answer" aria-label="你的答案"></div><div class="tiles pool">' + sh.map(i => '<button class="tile" lang="ko" data-c="' + i + '">' + esc(chunks[i]) + '</button>').join('') + '</div>' +
          '<div class="row" style="margin-top:10px"><button class="btn sm" data-reset>重来</button><button class="btn sm" data-show>看答案</button></div><div class="verdict"></div></div>';
      }).join('') + '</section>' +
      (dictLines.length ? '<section class="drill"><h3>听写</h3><p class="tiny">把听到的韩语打出来，空格和标点不算分。需要电脑装了韩语输入法：设置，时间和语言，语言和区域，添加韩语。没装可以跳过。</p>' +
        dictLines.map((l, di) => '<div class="q" data-dict="' + di + '"><div class="row">' + pbtn(l.ko, l.v) + sbtn(l.ko, l.v) + '</div>' +
          '<input class="dict-in" lang="ko" autocomplete="off" spellcheck="false" placeholder="在这里输入韩语"><div class="row" style="margin-top:10px"><button class="btn sm" data-check>检查</button></div><div class="diff"></div><div class="verdict"></div></div>').join('') + '</section>' : '') +
      '<div class="finish" id="finish"><button class="btn primary big" id="done">完成这一集</button><p class="tiny" style="margin-top:10px">完成后，这一集的单词和台词会进入复习，明天开始出现。</p></div>' +
      foot(true, false);

    // 选择题
    $$('[data-q]', body).forEach(box => {
      const it = quiz[+box.dataset.q];
      $$('.choice', box).forEach(c => c.onclick = () => {
        const o = +c.dataset.o, right = o === it.q.a;
        $$('.choice', box).forEach(x => { x.disabled = true; if (+x.dataset.o === it.q.a) x.classList.add('right'); });
        if (!right) c.classList.add('wrong'); else score.quiz++;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (right ? '答对了。' : '不对。') + (it.q.zh ? '意思是：' + esc(it.q.zh.replace(/[。.]$/, '')) + '。' : '') + (it.q.why ? ' ' + esc(it.q.why) : '');
        if (it.q.say) play(it.q.say, 'f');
        else if (isKo(it.q.q) && it.q.q.indexOf('___') >= 0) play(it.q.q.replace('___', it.q.opts[it.q.a]), 'f');
      });
    });

    // 排句
    $$('[data-ord]', body).forEach(box => {
      const l = orderLines[+box.dataset.ord], chunks = l.ko.split(' ');
      const ans = $('.answer', box), poolEl = $('.pool', box), v = $('.verdict', box);
      let picked = [], finished = false;
      const check = () => {
        if (picked.length < chunks.length) return;
        const ok = picked.map(i => chunks[i]).join(' ') === l.ko;
        finished = ok;
        v.className = 'verdict ' + (ok ? 'good' : 'bad');
        v.innerHTML = ok ? '对了。意思是：' + esc(l.zh) : '顺序不对，点“重来”再试一次。';
        if (ok) { score.order++; play(l.ko, l.v); }
      };
      const draw = () => {
        ans.innerHTML = picked.map((c, k) => '<button class="tile" lang="ko" data-k="' + k + '">' + esc(chunks[c]) + '</button>').join('');
        $$('.tile', poolEl).forEach(t => t.classList.toggle('used', picked.indexOf(+t.dataset.c) >= 0));
      };
      poolEl.onclick = e => { const t = e.target.closest('.tile'); if (!t || finished || t.classList.contains('used')) return; picked.push(+t.dataset.c); draw(); check(); };
      ans.onclick = e => { const t = e.target.closest('.tile'); if (!t || finished) return; picked.splice(+t.dataset.k, 1); v.textContent = ''; draw(); };
      $('[data-reset]', box).onclick = () => { if (finished) return; picked = []; v.textContent = ''; draw(); };
      $('[data-show]', box).onclick = () => { finished = true; picked = chunks.map((c, i) => i); draw(); v.className = 'verdict'; v.innerHTML = '答案：<span lang="ko">' + esc(l.ko) + '</span>。' + esc(l.zh); };
    });

    // 听写
    $$('[data-dict]', body).forEach(box => {
      const l = dictLines[+box.dataset.dict], inp = $('input', box);
      const go = () => {
        if (!inp.value.trim()) { inp.focus(); return; }
        const r = diff(l.ko, inp.value);
        $('.diff', box).innerHTML = r.html;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (r.exact ? 'good' : 'bad');
        v.innerHTML = (r.exact ? '完全正确。' : '红色波浪线是漏掉或写错的字，灰色删除线是多写的。') + ' 原句：<span lang="ko">' + esc(l.ko) + '</span>，' + esc(l.zh);
      };
      $('[data-check]', box).onclick = go;
      inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    });

    $('#done').onclick = () => {
      const src = epLabel(ep), due = today() + 1;
      let n = 0;
      ep.vocab.forEach((w, i) => { if (addCard(wordCard(w, i, src), due)) n++; });
      ep.dialogue.forEach(l => { if (addCard(lineCard(l, src), due)) n++; });
      const first = !S.done[ep.id];
      S.done[ep.id] = { d: today(), quiz: score.quiz, order: score.order };
      logAct(); save(); renderNav();
      const nx = nextEp();
      $('#finish').innerHTML = '<div class="cap md pink pop" lang="ko">' + (first ? '완료!' : '복습 완료!') + '</div>' +
        '<p>选择题对了 ' + score.quiz + ' / ' + quiz.length + '，排句对了 ' + score.order + ' / ' + orderLines.length + '。' +
        (n ? '新加入 ' + n + ' 张复习卡片，明天开始出现。' : '这一集的卡片之前已经加过了。') + '</p>' +
        '<div class="row" style="justify-content:center;margin-top:16px">' + (nx ? '<a class="btn primary" href="#/e/' + nx.id + '">下一集：<span lang="ko">' + esc(nx.caption) + '</span></a>' : '') + '<a class="btn" href="#/">回到今天</a></div>';
    };
  }

  // ---------- 复习 ----------
  function viewReview() {
    let queue = shuffle(dueIds()), idx = 0, revealed = false, total = queue.length, doneN = 0;
    const draw = () => {
      if (!queue.length) {
        main.innerHTML = '<div class="wrap"><div class="empty"><div class="cap lg pop" lang="ko">' + (total ? '다 했다!' : '쉬는 시간') + '</div>' +
          '<p>' + (total ? '这一轮复习完成了，一共 ' + doneN + ' 次。明天再来。' : '现在没有到期的卡片。') + '</p>' +
          '<div class="row" style="justify-content:center;margin-top:20px">' + (nextEp() ? '<a class="btn primary" href="#/e/' + nextEp().id + '">学新的一集</a>' : '') + '<a class="btn" href="#/packs">从表达包加卡片</a></div></div></div>';
        renderNav();
        return;
      }
      const id = queue[0], c = S.cards[id], s = S.srs[id], rev = S.set.reverse;
      const pct = total ? Math.round(100 * doneN / (doneN + queue.length)) : 0;
      main.innerHTML = '<div class="wrap"><div class="review">' +
        '<div class="row" style="justify-content:space-between;margin-bottom:12px"><span class="muted small">还剩 ' + queue.length + ' 张</span>' +
        '<div class="seg" role="group" aria-label="复习方式"><button data-mode="0" class="' + (rev ? '' : 'on') + '">听音想意思</button><button data-mode="1" class="' + (rev ? 'on' : '') + '">看中文想韩语</button></div></div>' +
        '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
        '<div class="flash">' +
        (!revealed ? (rev ? '<div class="zh-text" style="font-size:26px">' + esc(c.zh || '（还没有中文意思）') + '</div><p class="tiny">想一想韩语怎么说，再看答案。</p>'
          : (c.clip ? cbtn(c.clip.url, c.clip.s, c.clip.e, 'huge') : pbtn(c.say || c.ko, c.v, 'huge')) + '<p class="tiny">先只听，想想是什么意思。可以多听几遍。</p>')
          : (c.clip ? '<div class="row" style="justify-content:center">' + cbtn(c.clip.url, c.clip.s, c.clip.e) + pbtn(c.ko, 'f', 'sm-play') + '<span class="tiny">念一遍</span></div>' : pbtn(c.say || c.ko, c.v)) +
          '<div class="ko-text" lang="ko">' + (LINE_G[c.ko] || c.g ? tokHtml(c.ko, LINE_G[c.ko] || c.g, { inter: true, click: false, song: !LINE_G[c.ko] }) : esc(c.ko)) + (c.f && c.f !== c.ko ? ' <span class="f">' + esc(c.f) + '</span>' : '') + '</div>' +
          '<div class="zh-text">' + esc(c.zh || '（还没有中文意思，可以在“我的卡片”里补上）') + '</div>' +
          (c.kind === 'word' && MNEMO[c.ko] ? mnHtml(c.ko, { plain: true }) : '') +
          (c.ex ? '<div class="ex">' + pbtn(c.exSay || c.ex, c.exv || 'm') + '<span><span lang="ko">' + esc(c.ex) + '</span>　' + esc(c.exzh) + '</span></div>' : '') +
          '<div class="src">' + esc(c.src || '') + '</div>') +
        '</div>' +
        (!revealed ? '<div style="margin-top:16px"><button class="btn primary big" id="reveal">显示答案</button></div>'
          : '<div class="rates">' + [['忘了', 1], ['有点难', 2], ['记得', 3], ['太简单', 4]].map(r => '<button class="r' + r[1] + '" data-r="' + r[1] + '">' + r[0] + '<small>' + ivlLabel(schedule(r[1], s).ivl) + '</small></button>').join('') + '</div>') +
        '<div class="keys"><kbd>空格</kbd> 显示答案　<kbd>1</kbd> 到 <kbd>4</kbd> 打分　<kbd>R</kbd> 重听</div>' +
        '</div></div>';
      if (!revealed && !rev) setTimeout(() => playCard(c, $('.flash .play')), 150);
      if (revealed && rev) playCard(c, $('.flash .play'));
      const rb = $('#reveal'); if (rb) rb.onclick = reveal;
      $$('[data-r]').forEach(b => b.onclick = () => rate(+b.dataset.r));
      $$('[data-mode]').forEach(b => b.onclick = () => { S.set.reverse = b.dataset.mode === '1'; save(); revealed = false; draw(); });
    };
    const reveal = () => { if (revealed || !queue.length) return; revealed = true; draw(); };
    const rate = r => {
      const id = queue.shift(), ns = schedule(r, S.srs[id]);
      ns.due = today() + ns.ivl;
      S.srs[id] = ns;
      if (r === 1) queue.push(id);
      doneN++; logAct(); save(); revealed = false; stopAudio(); draw(); renderNav();
    };
    viewKeys = e => {
      if (!queue.length) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); }
      else if (revealed && /^[1-4]$/.test(e.key)) rate(+e.key);
      else if (e.key === 'r' || e.key === 'R') playCard(S.cards[queue[0]], $('.flash .play'));
    };
    draw();
  }

  // ---------- 表达包 ----------
  function viewPacks() {
    main.innerHTML = '<div class="wrap"><div class="page-head"><div class="cap lg pop" lang="ko">자주 듣는 말</div>' +
      '<p class="lede">韩剧和综艺里反复出现、课文里不一定讲到的说法。挑你想记的加进复习，也可以整包加入。</p></div>' +
      '<ul class="pack-list">' + D.packs.map(p => {
        const added = p.items.filter(x => S.cards['w:' + x.ko]).length;
        return '<li><a href="#/pack/' + p.id + '"><div class="ep-ko" lang="ko">' + esc(p.ko) + '</div><h3 style="margin:4px 0 6px">' + esc(p.zh) + '</h3><p class="muted small">' + p.items.length + ' 个表达' + (added ? '，已加入 ' + added + ' 个' : '') + '</p></a></li>';
      }).join('') +
      '<li><a href="#/rules"><div class="ep-ko" lang="ko">발음 규칙</div><h3 style="margin:4px 0 6px">音变速查</h3><p class="muted small">写法和读音不一样的七条规则</p></a></li>' +
      '</ul></div>';
  }
  function viewPack(id) {
    const p = PACK[id];
    if (!p) { location.hash = '#/packs'; return; }
    const draw = () => {
      const left = p.items.filter(x => !S.cards['w:' + x.ko]).length;
      main.innerHTML = '<div class="wrap"><div class="page-head"><div class="kicker"><a href="#/packs">表达包</a></div><div class="cap lg pop" lang="ko">' + esc(p.ko) + '</div>' +
        '<h1 style="margin-top:12px;font-size:22px">' + esc(p.zh) + '</h1><p class="lede">' + esc(p.intro) + '</p></div>' +
        '<div class="toolbar"><button class="btn primary" id="all"' + (left ? '' : ' disabled') + '>' + (left ? '全部加入复习（' + left + ' 个）' : '已全部加入复习') + '</button>' +
        '<button class="btn ' + (S.set.veilZh ? 'on' : '') + '" id="vz">' + (S.set.veilZh ? '中文已遮住' : '遮住中文') + '</button></div>' +
        '<ul class="pack-items">' + p.items.map((x, i) => {
          const has = !!S.cards['w:' + x.ko];
          return '<li>' + pbtn(x.say || x.ko, KS.vx(i)) + '<div><div class="ko-text" lang="ko">' + esc(x.ko) + '</div><div class="zh-text ' + (S.set.veilZh ? 'veil' : '') + '">' + esc(x.zh) + '</div>' +
            (x.ex ? '<div class="ex">' + pbtn(x.exSay || x.ex, KS.vx(i + 1)) + '<span><span class="ko" lang="ko">' + esc(x.ex) + '</span>　<span class="' + (S.set.veilZh ? 'veil' : '') + '">' + esc(x.exzh) + '</span></span></div>' : '') +
            '</div><button class="btn sm" data-add="' + i + '"' + (has ? ' disabled' : '') + '>' + (has ? '已加入' : '加入复习') + '</button></li>';
        }).join('') + '</ul></div>';
      $('#all').onclick = () => { let n = 0; p.items.forEach((x, i) => { if (addCard(packCard(x, i, p))) n++; }); save(); renderNav(); toast('加入了 ' + n + ' 张卡片，今天就能复习。'); draw(); };
      $('#vz').onclick = () => { S.set.veilZh = !S.set.veilZh; save(); draw(); };
    };
    draw();
    main.onclick = e => {
      const b = e.target.closest('[data-add]');
      if (!b) return;
      const i = +b.dataset.add;
      addCard(packCard(p.items[i], i, p)); save(); renderNav();
      b.disabled = true; b.textContent = '已加入';
      const all = $('#all'), left = p.items.filter(x => !S.cards['w:' + x.ko]).length;
      all.textContent = left ? '全部加入复习（' + left + ' 个）' : '已全部加入复习'; all.disabled = !left;
    };
  }

  function viewRules() {
    main.innerHTML = '<div class="wrap"><div class="page-head"><div class="cap lg pop" lang="ko">발음 규칙</div><h1 style="margin-top:12px;font-size:22px">音变速查</h1><p class="hint" style="margin-top:12px">这里是速查表。从零开始系统学，看<a href="#/b/p1">入门 · 发音规则</a>七课：每条规则都有写法和读音的方块对照、连着听和练习。</p>' +
      '<p class="lede">韩语按字写，说的时候却连成一串，声音会变。学过的词在剧里听不出来，多半是因为音变。不用背规则名，每个例子听三遍，让耳朵记住真实的声音。方括号里是实际读音。</p></div>' +
      D.rules.map(r => '<section class="gram"><h3>' + esc(r.name) + ' <span class="muted" lang="ko" style="font-weight:400">' + esc(r.ko) + '</span></h3><p>' + esc(r.desc) + '</p>' +
        '<ul class="ex-list">' + r.examples.map((x, i) => '<li>' + pbtn(x.ko, KS.vx(i)) + sbtn(x.ko, KS.vx(i)) + '<div><div class="ko-text" lang="ko">' + esc(x.ko) + '<span class="pron">' + esc(x.pron) + '</span></div><div class="zh-text">' + esc(x.zh) + '</div></div></li>').join('') + '</ul></section>').join('') +
      '</div>';
  }

  // ---------- 我的卡片 ----------
  function viewCards() {
    let q = '', kind = 'all';
    const KINDS = [['all', '全部'], ['word', '单词'], ['line', '台词'], ['clip', '片段']];
    const draw = () => {
      const t = today();
      const ids = Object.keys(S.cards).filter(id => {
        const c = S.cards[id];
        if (kind !== 'all' && c.kind !== kind) return false;
        return !q || (c.ko + ' ' + (c.zh || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0;
      }).sort((a, b) => S.srs[a].due - S.srs[b].due);
      const list = $('#cardList');
      if (!ids.length) { list.innerHTML = '<div class="empty">' + (Object.keys(S.cards).length ? '没有找到符合条件的卡片。' : '还没有卡片。学完一集、收藏台词，或者从表达包加入，卡片就会出现在这里。') + '</div>'; return; }
      list.innerHTML = '<table class="table"><thead><tr><th></th><th>韩语</th><th>意思</th><th>来源</th><th>下次复习</th><th></th></tr></thead><tbody>' +
        ids.slice(0, 600).map(id => {
          const c = S.cards[id], d = S.srs[id].due - t;
          return '<tr><td>' + pbtn(c.say || c.ko, c.v) + '</td><td><span class="ko-text" lang="ko">' + esc(c.ko) + '</span>' + (c.f && c.f !== c.ko ? ' <span class="muted small" lang="ko">' + esc(c.f) + '</span>' : '') + '</td>' +
            '<td>' + esc(c.zh || '') + '</td><td class="tiny">' + esc(c.src || '') + '</td><td class="small">' + (d <= 0 ? '今天' : d + ' 天后') + '</td>' +
            '<td style="white-space:nowrap"><button class="btn sm" data-edit="' + esc(id) + '">改意思</button> <button class="btn sm" data-del="' + esc(id) + '">删除</button></td></tr>';
        }).join('') + '</tbody></table>' + (ids.length > 600 ? '<p class="tiny" style="margin-top:8px">只显示前 600 张，用搜索缩小范围。</p>' : '');
    };
    main.innerHTML = '<div class="wrap"><div class="page-head"><h1>我的卡片</h1><p class="lede">所有进入复习的单词、台词和工作台里收藏的片段。共 ' + Object.keys(S.cards).length + ' 张。</p></div>' +
      '<div class="toolbar"><input class="search" id="q" placeholder="搜索韩语或中文" aria-label="搜索卡片"><div class="seg" role="group" aria-label="卡片类型">' + KINDS.map(k => '<button data-kind="' + k[0] + '" class="' + (k[0] === kind ? 'on' : '') + '">' + k[1] + '</button>').join('') + '</div></div>' +
      '<div id="cardList"></div></div>';
    $('#q').oninput = e => { q = e.target.value.trim(); draw(); };
    $$('[data-kind]').forEach(b => b.onclick = () => { kind = b.dataset.kind; $$('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    main.onclick = e => {
      const del = e.target.closest('[data-del]'), ed = e.target.closest('[data-edit]');
      if (del) {
        const c = S.cards[del.dataset.del];
        if (!confirm('从复习里删除“' + c.ko + '”？')) return;
        delete S.cards[del.dataset.del]; delete S.srs[del.dataset.del]; save(); renderNav(); draw();
      } else if (ed) {
        const c = S.cards[ed.dataset.edit];
        const v = prompt('“' + c.ko + '”的中文意思：', c.zh || '');
        if (v != null) { c.zh = v.trim(); save(); draw(); }
      }
    };
    draw();
  }

  // ---------- 精听工作台 ----------
  const lab = { media: null, cues: [], name: '', cur: 0, loop: false, auto: true, speed: 1, sub: 'show', time: 0, stopAt: null };
  const fmt = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), x = Math.floor(s % 60); return m + ':' + String(x).padStart(2, '0'); };
  const toSec = s => { const p = s.replace(',', '.').split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
  function parseSubs(text) {
    const out = [];
    text.replace(/^﻿/, '').replace(/\r/g, '').split(/\n\s*\n/).forEach(b => {
      const lines = b.split('\n'), k = lines.findIndex(l => l.indexOf('-->') >= 0);
      if (k < 0) return;
      const m = lines[k].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
      if (!m) return;
      const t = lines.slice(k + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
      if (t) out.push({ start: toSec(m[1]), end: toSec(m[2]), ko: t, zh: '' });
    });
    return out.sort((a, b) => a.start - b.start);
  }
  async function readText(file, fallback) {
    const buf = await file.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch (e) { return new TextDecoder(fallback).decode(buf); }
  }
  const hangulRatio = t => { const h = (t.match(/[가-힣]/g) || []).length, c = (t.match(/[一-鿿]/g) || []).length; return h / Math.max(1, h + c); };
  function alignZh(zhCues) {
    lab.cues.forEach(c => {
      let best = null, bo = 0;
      zhCues.forEach(z => { const o = Math.min(c.end, z.end) - Math.max(c.start, z.start); if (o > bo) { bo = o; best = z; } });
      c.zh = best ? best.ko : '';
    });
  }
  const isMedia = f => /^(video|audio)\//.test(f.type) || /\.(mp4|m4v|webm|mkv|mov|mp3|m4a|aac|wav|ogg)$/i.test(f.name);
  const isSub = f => /\.(srt|vtt)$/i.test(f.name);

  function setMedia(f) {
    if (lab.media) URL.revokeObjectURL(lab.media.url);
    lab.media = { url: URL.createObjectURL(f), name: f.name, audio: /^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|ogg)$/i.test(f.name) };
    lab.time = 0;
  }
  async function setSub(f, as) {
    const text = await readText(f, as === 'zh' ? 'gbk' : 'euc-kr');
    let kind = as;
    if (!kind) kind = hangulRatio(text) >= 0.5 ? 'ko' : 'zh';
    if (kind === 'ko' && hangulRatio(text) < 0.5) {
      // 用户选错了文件，按内容自动纠正
      const t2 = await readText(f, 'gbk');
      kind = hangulRatio(t2) >= 0.5 ? 'ko' : 'zh';
      if (kind === 'zh') { const cues = parseSubs(t2); if (!lab.cues.length) { toast('这个字幕看起来是中文的，请再选韩语字幕。'); lab.pendingZh = cues; return; } alignZh(cues); toast('已当作中文字幕载入。'); return; }
    }
    const cues = parseSubs(text);
    if (!cues.length) { toast('没有从“' + f.name + '”里读出字幕。请确认是 .srt 或 .vtt 格式。'); return; }
    if (kind === 'zh') {
      if (!lab.cues.length) { lab.pendingZh = cues; toast('已读入中文字幕，再选一份韩语字幕。'); return; }
      alignZh(cues); toast('中文字幕已对齐到 ' + lab.cues.filter(c => c.zh).length + ' 句。');
    } else {
      lab.cues = cues; lab.name = f.name; lab.cur = Math.min(S.lab[f.name] || 0, cues.length - 1);
      if (lab.pendingZh) { alignZh(lab.pendingZh); lab.pendingZh = null; }
    }
  }
  async function takeFiles(files, as) {
    for (const f of files) {
      if (isMedia(f) && as !== 'ko' && as !== 'zh') setMedia(f);
      else if (isSub(f) || as === 'ko' || as === 'zh') await setSub(f, as);
      else toast('不认识“' + f.name + '”。视频用 mp4 或 webm，字幕用 srt 或 vtt。');
    }
    labPlayer();
  }

  // ---------- 视频库：上传视频，自动识别成字幕 ----------
  const uploads = {};  // 正在上传的文件，切换页面不会中断
  let upChain = Promise.resolve(), labPoll = 0;
  const fmtDur = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ' 小时 ' + m + ' 分' : m ? m + ' 分 ' + (s % 60) + ' 秒' : s + ' 秒'; };
  const isVideoFile = f => /^(video|audio)\//.test(f.type) || /\.(mp4|m4v|webm|mkv|mov|avi|flv|ts|m2ts|wmv|mpg|mpeg|3gp|mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(f.name);
  function uploadOne(f) {
    return new Promise(async resolve => {
      let v;
      try { v = await api('POST', '/api/videos', { name: f.name, size: f.size }); }
      catch (err) { toast('“' + f.name + '”没能导入：' + err.message); return resolve(); }
      uploads[v.id] = { loaded: 0, total: f.size, name: f.name };
      const x = new XMLHttpRequest();
      x.open('PUT', '/api/videos/' + v.id + '/file');
      x.upload.onprogress = e => { if (uploads[v.id]) uploads[v.id].loaded = e.loaded; };
      x.onload = () => { delete uploads[v.id]; if (x.status !== 200) toast('“' + f.name + '”上传失败：' + x.responseText.slice(0, 200)); resolve(); };
      x.onerror = () => { delete uploads[v.id]; toast('“' + f.name + '”上传中断了。'); resolve(); };
      x.send(f);
    });
  }
  function queueUploads(files) {
    const ok = files.filter(f => {
      if (/\.ncm$/i.test(f.name)) { toast('.ncm 是网易云的加密格式，用不了。'); return false; }
      if (!isVideoFile(f)) { toast('不认识“' + f.name + '”。请用 mp4、mkv、webm 等视频，或 mp3、m4a 等音频。'); return false; }
      return true;
    });
    ok.forEach(f => { upChain = upChain.then(() => uploadOne(f)); });
    if (ok.length) toast('开始上传 ' + ok.length + ' 个文件。上传完成前不要刷新或关闭这个页面，切到别的页面没关系。');
    return ok.length;
  }
  function videoState(v) {
    const up = uploads[v.id];
    if (up) return { text: '上传中 ' + Math.floor(100 * up.loaded / Math.max(1, up.total)) + '%', active: true };
    if (v.status === 'uploading') return { text: '等待上传', active: true };
    if (v.status === 'queued') return { text: v.queuePos > 0 ? '排队等待识别，前面还有 ' + (v.queuePos - 1) + ' 个' : '排队等待识别', active: true };
    if (v.status === 'running') return { text: '识别中 ' + Math.floor(100 * (v.progress || 0)) + '%', active: true };
    if (v.status === 'error') return { text: '出错了', bad: true };
    return { text: v.cues + ' 句' + (v.llm ? '，校对中 ' + v.llm.done + ' / ' + v.llm.total : v.zh ? '，已翻译 ' + v.zh + ' 句' : ''), active: !!v.llm, done: true };
  }

  function viewLab() {
    if (lab.cues.length && !lab.vid) return labPlayer();
    labHome();
  }

  async function labHome() {
    if (leave) { leave(); leave = null; }
    viewKeys = null; main.onclick = null;
    clearTimeout(labPoll);
    const my = routeSeq;
    main.innerHTML = '<div class="wrap"><div class="page-head"><div class="cap lg pop" lang="ko">한 문장씩</div>' +
      '<p class="lede">把韩剧或综艺视频拖进来。没有字幕也可以：程序会在本机自动识别出带时间的韩语字幕，再逐词拆开，然后就能一句一句地听。</p></div>' +
      (SERVER ? '<div class="drop" id="vDrop"><h3>把视频拖到这里，自动识别字幕</h3><p class="muted small">可以一次拖好几集，会排队识别。mp4、mkv、webm、mov 都可以，纯音频也行。</p>' +
        '<div class="file-row"><label class="btn primary">选择视频<input type="file" id="vPick" multiple accept="video/*,audio/*,.mkv,.flv,.ts,.m2ts,.wmv"></label></div></div>' +
        '<div class="row asr-row" id="asrRow"></div>' +
        '<h2 style="margin:28px 0 10px">我的视频</h2><div id="vList"><p class="muted">正在读取…</p></div>'
        : '<div class="hint">' + (STATIC ? '网上版不能上传视频自动识别字幕，这个功能要在自己电脑上用。下面可以用你自己的视频和字幕文件练习，文件只在你的浏览器里打开，不会上传。' : '自动识别字幕需要本地服务。请双击“启动.bat”打开这个页面。下面仍然可以用自己的字幕文件练习。') + '</div>') +
      '<details class="panel" style="margin-top:28px"' + (SERVER ? '' : ' open') + '><summary><b>已经有字幕文件？</b><span class="muted small">　视频和 .srt 字幕一起拖进来，不上传，不识别</span></summary>' +
      '<div class="drop" id="drop" style="margin-top:14px"><h3>把视频和字幕文件拖到这里</h3><p class="muted small">可以一次拖多个。程序会按内容分辨韩语字幕和中文字幕。</p>' +
      '<div class="file-row"><label class="btn">选择视频或音频<input type="file" id="fMedia" accept="video/*,audio/*,.mkv"></label>' +
      '<label class="btn primary">选择韩语字幕<input type="file" id="fKo" accept=".srt,.vtt"></label>' +
      '<label class="btn">选择中文字幕（可选）<input type="file" id="fZh" accept=".srt,.vtt"></label></div>' +
      (lab.media && !lab.vid ? '<p class="tiny" style="margin-top:12px">已载入视频：' + esc(lab.media.name) + '。还需要一份韩语字幕。</p>' : '') + '</div>' +
      '<h3 style="margin-top:18px">只有文字？</h3><p class="muted small">直接粘贴一段韩语，每行一句。没有视频时会用合成语音朗读。</p>' +
      '<textarea class="paste" id="paste" lang="ko" placeholder="오늘 뭐 했어?&#10;그냥 집에서 드라마 봤어."></textarea><div class="row" style="margin-top:10px"><button class="btn" id="usePaste">用这段文字练习</button></div></details>' +
      '<section class="hint" style="margin-top:20px"><b>怎么选素材</b><br>先从生活类综艺和家庭剧、职场剧开始，语速适中，日常词多。每次挑三到五分钟的一段反复听，比整集看完有用得多。先开着字幕听懂，再遮住韩文听写，最后全遮只靠耳朵。</section></div>';
    if (lab.vid) { lab.vid = null; lab.cues = []; lab.media = null; }
    $('#fMedia').onchange = e => takeFiles(Array.from(e.target.files));
    $('#fKo').onchange = e => takeFiles(Array.from(e.target.files), 'ko');
    $('#fZh').onchange = e => takeFiles(Array.from(e.target.files), 'zh');
    const drop = $('#drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); takeFiles(Array.from(e.dataTransfer.files)); };
    $('#usePaste').onclick = () => {
      const lines = $('#paste').value.split('\n').map(s => s.trim()).filter(Boolean);
      if (!lines.length) { toast('先粘贴一些韩语文字。'); return; }
      if (lab.media) { URL.revokeObjectURL(lab.media.url); lab.media = null; }
      lab.cues = lines.map(t => ({ start: null, end: null, ko: t, zh: '' }));
      lab.name = '粘贴的文本'; lab.cur = 0;
      labPlayer();
    };
    if (!SERVER) return;
    const vDrop = $('#vDrop');
    vDrop.ondragover = e => { e.preventDefault(); vDrop.classList.add('over'); };
    vDrop.ondragleave = () => vDrop.classList.remove('over');
    vDrop.ondrop = e => { e.preventDefault(); vDrop.classList.remove('over'); if (queueUploads(Array.from(e.dataTransfer.files))) setTimeout(refresh, 400); };
    $('#vPick').onchange = e => { if (queueUploads(Array.from(e.target.files))) setTimeout(refresh, 400); e.target.value = ''; };
    const drawAsr = st => {
      const row = $('#asrRow'); if (!row) return;
      if (!st.installed) { row.innerHTML = '<span class="unk small">没有安装语音识别工具。请在命令行运行：python -m pip install faster-whisper</span>'; return; }
      row.innerHTML = '<span class="small muted">识别模型</span><select id="asrModel">' + st.models.map(m => '<option value="' + m.id + '"' + (m.id === st.model ? ' selected' : '') + '>' + esc(m.label) + (m.have ? '' : '，需下载' + m.size) + '</option>').join('') + '</select>' +
        '<span class="small muted">运行在</span><select id="asrDev">' + [['auto', '自动（有显卡就用显卡）'], ['cuda', '只用显卡'], ['cpu', '只用 CPU']].map(d => '<option value="' + d[0] + '"' + (d[0] === st.device ? ' selected' : '') + '>' + d[1] + '</option>').join('') + '</select>' +
        (st.deviceNote ? '<span class="tiny">上次用的是' + esc(st.deviceNote) + '</span>' : '');
      row.onchange = async () => { try { drawAsr(await api('POST', '/api/asr/config', { model: $('#asrModel').value, device: $('#asrDev').value })); toast('已保存，下一个视频开始生效。'); } catch (err) { toast(err.message); } };
    };
    api('GET', '/api/asr/status').then(drawAsr).catch(() => {});
    const refresh = async () => {
      clearTimeout(labPoll);
      if (my !== routeSeq) return;
      let list;
      try { list = await api('GET', '/api/videos'); } catch (err) { return; }
      if (my !== routeSeq || !$('#vList')) return;
      Object.keys(uploads).forEach(id => { if (!list.some(v => v.id === id)) list.unshift({ id: id, title: uploads[id].name, status: 'uploading', created: 0 }); });
      let active = false;
      $('#vList').innerHTML = list.length ? '<ol class="ep-list">' + list.map((v, i) => {
        const st = videoState(v); active = active || st.active;
        return '<li><a href="#/v/' + v.id + '"><span class="ep-no">' + (i + 1) + '</span><span><span class="v-title">' + esc(v.title) + '</span><br>' +
          '<span class="ep-zh">' + (v.duration ? fmtDur(v.duration) : '') + (v.audioOnly ? '，纯音频' : '') + (v.status === 'error' ? '<span class="unk">　' + esc((v.error || '').slice(0, 80)) + '</span>' : '') + '</span></span>' +
          '<span class="tag ' + (st.bad ? 'bad' : st.done ? 'ok' : 'next') + '">' + st.text + '</span></a></li>';
      }).join('') + '</ol>' : '<div class="empty" style="padding:24px">还没有视频。把第一集拖到上面。</div>';
      if (active) labPoll = setTimeout(refresh, 2000);
    };
    refresh();
    leave = () => clearTimeout(labPoll);
  }

  async function viewVideo(id) {
    if (!SERVER) { location.hash = '#/lab'; return; }
    const my = routeSeq;
    clearTimeout(labPoll);
    main.innerHTML = '<div class="wrap"><p class="muted">正在读取视频…</p></div>';
    const tick = async () => {
      if (my !== routeSeq) return;
      let v;
      try { v = await api('GET', '/api/videos/' + id); }
      catch (err) { if (my === routeSeq) main.innerHTML = '<div class="wrap"><div class="empty">' + esc(err.message) + '。<a href="#/lab">回到视频库</a></div></div>'; return; }
      if (my !== routeSeq) return;
      if (v.status === 'done') { openVideo(v); return; }
      const up = uploads[id], st = videoState(v);
      const pct = up ? Math.floor(100 * up.loaded / Math.max(1, up.total)) : Math.floor(100 * (v.progress || 0));
      main.innerHTML = '<div class="wrap"><div class="kicker"><a href="#/lab">精听工作台</a></div><h1 style="font-size:22px;margin:6px 0 20px">' + esc(v.title) + '</h1>' +
        '<div class="panel"><h3>' + st.text + '</h3>' +
        (v.status === 'error' ? '<p class="unk" style="margin-top:8px">' + esc(v.error) + '</p><div class="row" style="margin-top:14px"><button class="btn primary" id="vRetry">重新识别</button><button class="btn" id="vDel">删除</button></div>'
          : '<div class="progress" style="margin-top:12px"><i style="width:' + pct + '%"></i></div><p class="muted small">' + esc(up ? '正在上传。上传完成前不要刷新或关闭页面。' : v.stage || '') + '</p>' +
          '<p class="tiny" style="margin-top:8px">识别在本机后台进行，可以切到别的页面，回来会接着显示进度。' + (v.duration ? '视频长 ' + fmtDur(v.duration) + '。' : '') + '</p>' +
          '<div class="row" style="margin-top:14px"><button class="btn sm" id="vDel">取消并删除</button></div>') + '</div></div>';
      const r = $('#vRetry'); if (r) r.onclick = async () => { try { await api('POST', '/api/videos/' + id + '/retry', {}); tick(); } catch (err) { toast(err.message); } };
      $('#vDel').onclick = async () => { if (!confirm('删除“' + v.title + '”？视频文件和识别结果都会删掉。')) return; await api('DELETE', '/api/videos/' + id); location.hash = '#/lab'; };
      if (v.status !== 'error') labPoll = setTimeout(tick, 1500);
    };
    tick();
    leave = () => clearTimeout(labPoll);
  }

  function openVideo(v) {
    const keepPos = lab.vid === v.id;
    lab.vid = v.id; lab.video = v; lab.name = v.title;
    // 有大模型逐词标注就用它，没有就用离线拆词
    lab.cues = (v.cues || []).map(c => {
      const lg = c.lg ? convSong(c.lg, c.ko) : null;
      return { start: c.s, end: c.e, ko: c.ko, zh: c.zh || '', note: c.note || '', g: lg || (c.g ? convSong(c.g, c.ko) : null), lg: !!lg, fixed: !!c.fixed, edited: !!c.edited };
    });
    lab.media = v.play ? { url: '/videos/' + v.id + '/' + encodeURIComponent(v.play), name: v.name, audio: v.audioOnly } : null;
    if (!keepPos) { lab.cur = Math.min(S.lab['v:' + v.id] || 0, Math.max(0, lab.cues.length - 1)); lab.time = lab.cues[lab.cur] ? lab.cues[lab.cur].start : 0; }
    if (!lab.cues.length) {
      main.innerHTML = '<div class="wrap"><div class="kicker"><a href="#/lab">精听工作台</a></div><div class="empty">“' + esc(v.title) + '”里没有识别出韩语说话的声音。<br><button class="btn" id="vDel" style="margin-top:14px">删除</button></div></div>';
      $('#vDel').onclick = async () => { await api('DELETE', '/api/videos/' + v.id); location.hash = '#/lab'; };
      return;
    }
    labPlayer();
  }

  function labPlayer() {
    if (leave) { leave(); leave = null; }
    viewKeys = null; main.onclick = null;
    clearTimeout(labPoll);
    if (!lab.cues.length) return labHome();
    const cue = lab.cues[lab.cur] || lab.cues[0];
    const veilKo = lab.sub !== 'show', veilZh = lab.sub === 'none';
    const V = lab.vid ? lab.video : null, posKey = V ? 'v:' + V.id : lab.name;
    const words = c => c.g ? tokHtml(c.ko, c.g, { inter: S.set.inter, song: true }) : esc(c.ko).split(' ').map(w => '<span class="w" data-w="' + w + '">' + w + '</span>').join(' ');
    const zhN = lab.cues.filter(c => c.zh).length, lgN = lab.cues.filter(c => c.lg).length;
    main.innerHTML = '<div class="wide"><div class="row" style="justify-content:space-between;margin-bottom:12px"><div><div class="kicker">' + (V ? '<a href="#/lab">精听工作台</a>' : '精听工作台') + '</div><h1 style="font-size:20px">' + esc(lab.name) + '</h1>' +
      (V ? '<div class="tiny">' + fmtDur(V.duration) + '，' + lab.cues.length + ' 句，' + esc(V.model || '') + ' 识别' + (V.device ? '（' + esc(V.device.split('（')[0]) + '）' : '') + '</div>' : '') + '</div>' +
      '<div class="row">' + (V ? '' : '<span class="tiny">' + lab.cues.length + ' 句</span>') +
      (V ? '<a class="btn sm" href="/api/videos/' + V.id + '/srt?lang=ko">导出韩语字幕</a>' + (zhN ? '<a class="btn sm" href="/api/videos/' + V.id + '/srt?lang=both">导出双语字幕</a>' : '') + '<button class="btn sm" id="vDel">删除</button>' : '') +
      '<button class="btn sm" id="swap">' + (V ? '回到视频库' : '换文件') + '</button></div></div>' +
      (V ? '<div class="song-status" style="margin:0 0 16px"><div><b>大模型精标</b>　<span id="vLlmState">' + (lgN ? '已精标 ' + lgN + ' / ' + lab.cues.length + ' 句' : zhN ? '已翻译 ' + zhN + ' 句，还没有逐词标注' : '还没有精标') + '</span>　<span id="vLlmBtns"></span> <a class="small" href="#/settings">接口设置</a></div><div id="vLlmMsg" class="small" hidden></div>' +
        (V.playNote ? '<div class="unk small">' + esc(V.playNote) + '</div>' : '') + '</div>' : '') +
      '<div class="lab' + (S.set.labBig && lab.media ? ' big' : '') + '"><div class="lab-left">' +
      '<div class="stage' + (S.set.labMirror && lab.media ? ' mirror' : '') + '">' + (lab.media ? '<video id="vid" src="' + lab.media.url + '" preload="auto" playsinline></video>' : '<div class="noplay">没有导入视频。点句子会用合成语音朗读，适合练字幕文本或剧本。</div>') + '</div>' +
      (lab.media ? '<div class="lab-seek"><button class="play" id="vplay" aria-label="播放或暂停">' + ICON + '</button><span class="tiny" id="vtime">0:00 / 0:00</span>' +
        '<div class="seek-wrap"><div class="seek-cues" id="vcues"></div><input type="range" class="seek" id="vseek" min="0" max="1" step="0.1" value="0" aria-label="视频进度，可以拖动"></div></div>' : '') +
      '<div class="sub-box" id="subBox"></div>' +
      '<div class="lab-ctrl"><button class="btn" id="prev">上一句</button><button class="btn primary" id="again">重播这句</button><button class="btn" id="next">下一句</button>' +
      '<button class="btn ' + (lab.loop ? 'on' : '') + '" id="loop">循环本句</button><button class="btn ' + (lab.auto ? 'on' : '') + '" id="auto">逐句暂停</button><button class="btn" id="keep">收藏这句</button></div>' +
      '<div class="lab-ctrl"><span class="small muted">语速</span><div class="seg" id="speed">' + [0.6, 0.75, 0.9, 1].map(r => '<button data-s="' + r + '" class="' + (lab.speed === r ? 'on' : '') + '">' + r + '×</button>').join('') + '</div>' +
      '<span class="small muted" style="margin-left:8px">字幕</span><div class="seg" id="subm">' + [['show', '显示'], ['ko', '遮韩文'], ['none', '全遮']].map(m => '<button data-m="' + m[0] + '" class="' + (lab.sub === m[0] ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div>' +
      (lab.cues.some(c => c.g) ? '<button class="btn sm ' + (S.set.inter ? 'on' : '') + '" id="vi">逐词对照</button>' : '') +
      (lab.media ? '<button class="btn sm ' + (S.set.labBig ? 'on' : '') + '" id="vbig">大画面</button>' +
        '<button class="btn sm ' + (S.set.labMirror ? 'on' : '') + '" id="vmir" title="左右翻转画面（M）">镜像</button>' : '') + '</div>' +
      '<p class="keys" style="margin-top:12px"><kbd>空格</kbd> 播放或暂停　<kbd>←</kbd> <kbd>→</kbd> 上一句、下一句　' + (lab.media ? '<kbd>Shift</kbd>+<kbd>←</kbd> <kbd>→</kbd> 后退、前进 5 秒　' : '') + '　<kbd>R</kbd> 重播　<kbd>L</kbd> 循环　<kbd>H</kbd> 切换字幕　<kbd>S</kbd> 收藏' + (lab.media ? '　<kbd>M</kbd> 镜像' : '') + '。' +
      (lab.cues.some(c => c.g) ? '点字幕里的词看意思和原形。' : '点字幕里的词会打开 Naver 韩中词典。') + (V ? '识别错的句子点“改这句”修改。' : '') + '</p>' +
      '</div><ol class="cues" id="cues">' + lab.cues.map((c, i) => '<li class="cue' + (i === lab.cur ? ' cur' : '') + (S.cards['c:' + c.ko] ? ' saved' : '') + '" data-i="' + i + '">' +
        '<button class="play" data-play="' + i + '" aria-label="播放这句">' + ICON + '</button><div><div class="t">' + (c.start != null ? fmt(c.start) : '第 ' + (i + 1) + ' 句') + '</div>' +
        '<div class="ko-text' + (veilKo ? ' veil' : '') + '" lang="ko">' + words(c) + '</div>' + (c.zh ? '<div class="zh-text' + (veilZh ? ' veil' : '') + '">' + esc(c.zh) + '</div>' : '') +
        (c.note ? '<div class="note">' + esc(c.note) + '</div>' : '') +
        (V ? '<div class="cue-tools"><button class="btn sm" data-editc="' + i + '">改这句</button>' + (c.edited ? '<span class="tiny">你改过</span>' : c.fixed ? '<span class="tiny">大模型校对过</span>' : '') + '</div>' : '') + '</div></li>').join('') + '</ol></div></div>';

    const vid = $('#vid'), subBox = $('#subBox'), list = $('#cues');
    let raf = 0;
    const showSub = () => {
      const c = lab.cues[lab.cur];
      subBox.innerHTML = c ? '<div class="ko-text' + (veilKo ? ' veil' : '') + '" lang="ko">' + esc(c.ko) + '</div>' + (c.zh ? '<div class="zh-text' + (veilZh ? ' veil' : '') + '">' + esc(c.zh) + '</div>' : '') +
        '<div class="tiny" style="margin-top:6px">第 ' + (lab.cur + 1) + ' / ' + lab.cues.length + ' 句' + (S.cards['c:' + c.ko] ? '，已收藏' : '') + '</div>' : '';
    };
    const mark = (scroll) => {
      $$('.cue', list).forEach(li => li.classList.toggle('cur', +li.dataset.i === lab.cur));
      const li = $('.cue[data-i="' + lab.cur + '"]', list);
      if (scroll && li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      showSub(); S.lab[posKey] = lab.cur; save();
    };
    const setCur = (i, scroll) => { if (i === lab.cur) return; lab.cur = i; mark(scroll); };

    const playCue = async (i) => {
      i = Math.max(0, Math.min(lab.cues.length - 1, i));
      lab.cur = i; mark(true);
      const c = lab.cues[i];
      if (vid) {
        stopAudio();
        vid.playbackRate = lab.speed;
        vid.currentTime = c.start;
        lab.stopAt = (lab.auto || lab.loop) ? c.end : null;
        vid.play().catch(() => {});
      } else {
        const my = token + 1;
        await play(c.ko, 'f', lab.speed, $('[data-play="' + i + '"]', list));
        if (lab.loop && token === my && lab.cur === i && location.hash === '#/lab') { await sleep(500); if (token === my) playCue(i); }
      }
    };
    const tick = () => { raf = requestAnimationFrame(tick); check(); };
    // 动画帧在后台标签页会暂停，所以 timeupdate 也做一次同样的检查
    const check = () => {
      if (!vid || vid.paused) return;
      const t = vid.currentTime;
      lab.time = t;
      if (lab.stopAt != null && t >= lab.stopAt) {
        if (lab.loop) { vid.currentTime = lab.cues[lab.cur].start; return; }
        vid.pause(); lab.stopAt = null; return;
      }
      if (lab.stopAt == null) {
        const k = lab.cues.findIndex(c => t >= c.start && t < c.end);
        if (k >= 0) setCur(k, true);
      }
    };
    // 进度条：拖到哪里就从哪里播，字幕和右边的句子跟着跳到那一句
    const seek = $('#vseek'), vtime = $('#vtime'), vplay = $('#vplay');
    let dragging = false;
    const cueAt = t => { let k = -1; lab.cues.forEach((c, i) => { if (c.start != null && c.start <= t) k = i; }); return k; };
    const showTime = t => { if (vtime) vtime.textContent = fmt(t) + ' / ' + fmt(vid && vid.duration ? vid.duration : 0); };
    const syncSeek = () => {
      if (!vid || !seek) return;
      if (!dragging) seek.value = vid.currentTime;
      showTime(dragging ? +seek.value : vid.currentTime);
      vplay.classList.toggle('playing', !vid.paused);
    };
    const jumpTo = t => {
      if (!vid) return;
      t = Math.max(0, Math.min(vid.duration || t, t));
      lab.stopAt = null;
      vid.currentTime = t; lab.time = t;
      const k = cueAt(t);
      if (k >= 0) setCur(k, true);
      syncSeek();
    };
    if (vid && seek) {
      vid.addEventListener('loadedmetadata', () => {
        seek.max = vid.duration || 1;
        // 在进度条上标出每句话的位置
        const d = vid.duration || 1;
        $('#vcues').innerHTML = lab.cues.filter(c => c.start != null).map(c => '<i style="left:' + (100 * c.start / d).toFixed(2) + '%;width:' + Math.max(0.15, 100 * (c.end - c.start) / d).toFixed(2) + '%"></i>').join('');
        syncSeek();
      });
      vid.addEventListener('timeupdate', syncSeek);
      vid.addEventListener('play', syncSeek);
      vid.addEventListener('pause', syncSeek);
      seek.oninput = () => { dragging = true; showTime(+seek.value); };
      seek.onchange = () => { dragging = false; jumpTo(+seek.value); };
      vplay.onclick = () => { if (vid.paused) { lab.stopAt = null; vid.playbackRate = lab.speed; vid.play().catch(() => {}); } else vid.pause(); };
      vid.onclick = () => vplay.click();
    }
    if (vid) {
      vid.addEventListener('loadedmetadata', () => { if (lab.time) vid.currentTime = lab.time; }, { once: true });
      vid.addEventListener('error', () => toast('浏览器播不了这个视频格式。换成 mp4 试试，或者只用字幕练习。'));
      vid.addEventListener('timeupdate', check);
      raf = requestAnimationFrame(tick);
    }
    const toggle = () => {
      if (!vid) return playCue(lab.cur);
      if (vid.paused) { if (lab.auto) playCue(lab.cur); else { lab.stopAt = null; vid.playbackRate = lab.speed; vid.play(); } }
      else vid.pause();
    };
    const keep = () => {
      const c = lab.cues[lab.cur];
      if (S.cards['c:' + c.ko]) { toast('这句已经收藏过了。'); return; }
      addCard({ id: 'c:' + c.ko, kind: 'clip', ko: c.ko, zh: c.zh || '', v: 'f', src: lab.name + (c.start != null ? ' ' + fmt(c.start) : ''),
        g: c.g || undefined, clip: V && lab.media && c.start != null ? { url: lab.media.url, s: c.start, e: c.end } : undefined });
      save(); renderNav();
      const li = $('.cue[data-i="' + lab.cur + '"]', list); if (li) li.classList.add('saved');
      showSub(); toast(c.zh ? '已收藏到复习。' : '已收藏。可以在“我的卡片”里补上中文意思。');
    };
    $('#prev').onclick = () => playCue(lab.cur - 1);
    $('#next').onclick = () => playCue(lab.cur + 1);
    $('#again').onclick = () => playCue(lab.cur);
    $('#keep').onclick = keep;
    $('#loop').onclick = e => { lab.loop = !lab.loop; e.currentTarget.classList.toggle('on', lab.loop); if (vid && !vid.paused) lab.stopAt = lab.loop || lab.auto ? lab.cues[lab.cur].end : null; };
    $('#auto').onclick = e => { lab.auto = !lab.auto; e.currentTarget.classList.toggle('on', lab.auto); if (vid && !vid.paused && !lab.loop) lab.stopAt = lab.auto ? lab.cues[lab.cur].end : null; };
    $('#speed').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; lab.speed = +b.dataset.s; if (vid) vid.playbackRate = lab.speed; $$('#speed button').forEach(x => x.classList.toggle('on', x === b)); };
    const SUBS = ['show', 'ko', 'none'];
    const setSubMode = m => { lab.sub = m; lab.time = vid ? vid.currentTime : 0; viewLab(); };
    $('#subm').onclick = e => { const b = e.target.closest('[data-m]'); if (b) setSubMode(b.dataset.m); };
    $('#swap').onclick = () => {
      if (vid) vid.pause();
      if (V) { location.hash = '#/lab'; return; }
      lab.cues = []; lab.time = 0; labHome();
    };
    const vi = $('#vi'); if (vi) vi.onclick = () => { S.set.inter = !S.set.inter; save(); lab.time = vid ? vid.currentTime : 0; labPlayer(); };
    const vmir = $('#vmir');
    const setMirror = on => { S.set.labMirror = on; save(); if (vmir) vmir.classList.toggle('on', on); const st = $('.stage'); if (st) st.classList.toggle('mirror', on); };
    if (vmir) vmir.onclick = () => setMirror(!S.set.labMirror);
    const vbig = $('#vbig'); if (vbig) vbig.onclick = () => { S.set.labBig = !S.set.labBig; save(); vbig.classList.toggle('on', S.set.labBig); $('.lab').classList.toggle('big', S.set.labBig); if (S.set.labBig) $('.lab').scrollIntoView({ block: 'start' }); };
    if (V) {
      $('#vDel').onclick = async () => {
        if (!confirm('删除“' + V.title + '”？视频文件和识别结果都会删掉，已加入复习的卡片会保留。')) return;
        try { await api('DELETE', '/api/videos/' + V.id); toast('已删除。'); location.hash = '#/lab'; } catch (err) { toast(err.message); }
      };
      // 大模型校对翻译在服务端后台跑，这里只显示进度
      const my = routeSeq, onPage = () => my === routeSeq && lab.vid === V.id && !!$('#vLlmState');
      const drawLlm = job => {
        if (!onPage()) return;
        const st = $('#vLlmState'), bt = $('#vLlmBtns'), msg = $('#vLlmMsg'), zh = lab.cues.filter(c => c.zh).length, lg = lab.cues.filter(c => c.lg).length;
        if (job.state === 'running') {
          st.textContent = '进行中：已完成 ' + job.done + ' / ' + job.total + ' 句' + (job.note ? '，' + job.note : '') + '。可以切到别的页面，不会中断。';
          bt.innerHTML = '<button class="btn sm" id="vLlmStop">停止</button>';
        } else {
          st.textContent = lg ? '已精标 ' + lg + ' / ' + lab.cues.length + ' 句' : zh ? '已翻译 ' + zh + ' 句，还没有逐词标注' : '还没有精标';
          const left = lab.cues.filter(c => !c.zh || !c.lg).length;
          bt.innerHTML = (left ? '<button class="btn sm primary" id="vLlmRun">' + (lg ? '精标剩下的 ' + left + ' 句' : zh ? '补上逐词标注' : '校对、翻译并逐词标注') + '</button> ' : '') +
            (lg ? '<button class="btn sm" id="vLlmAll">全部重新精标</button>' : '');
        }
        let text = '', bad = false;
        if (job.state === 'done') { text = '上次完成：精标了 ' + job.ok + ' 句' + (job.fixed ? '，' + job.fixed + ' 个词和原句对不上，已用离线拆词代替' : '') + '。' + (job.error ? job.error : ''); bad = !!job.error; }
        else if (job.state === 'error') { text = '出错停下了：' + job.error + ' 做完的句子已经保存，点按钮会接着做。'; bad = true; }
        else if (job.state === 'cancelled') text = '已停止。做完的 ' + job.ok + ' 句已经保存。';
        msg.hidden = !text; msg.textContent = text; msg.classList.toggle('unk', bad);
      };
      const poll = async wasRunning => {
        if (!onPage()) return;
        let job;
        try { job = await api('GET', '/api/videos/' + V.id + '/llm/status'); } catch (err) { return; }
        if (!onPage()) return;
        if (wasRunning && job.state !== 'running') {
          try { const v2 = await api('GET', '/api/videos/' + V.id); if (!onPage()) return; lab.time = vid ? vid.currentTime : 0; if (vid && !vid.paused) { drawLlm(job); $('#vLlmBtns').innerHTML = '<button class="btn sm primary" id="vLlmShow">显示结果</button>'; lab.pending = v2; return; } openVideo(v2); } catch (err) { }
          return;
        }
        drawLlm(job);
        if (job.state === 'running') labPoll = setTimeout(() => poll(true), 2000);
      };
      $('.song-status').onclick = async e => {
        const id = e.target.id;
        if (id === 'vLlmRun' || id === 'vLlmAll') {
          if (id === 'vLlmAll' && !confirm('重新精标全部 ' + lab.cues.length + ' 句？已有的翻译和标注会被覆盖，你改过的句子文字不会被改动。')) return;
          try {
            const cfg = await api('GET', '/api/llm/config');
            if (!cfg.base || !cfg.model) { toast('先在设置里填好大模型接口。'); location.hash = '#/settings'; return; }
            drawLlm(await api('POST', '/api/videos/' + V.id + '/llm/start', { all: id === 'vLlmAll' }));
            clearTimeout(labPoll); labPoll = setTimeout(() => poll(true), 1500);
          } catch (err) { toast('没能开始：' + err.message); }
        } else if (id === 'vLlmStop') { e.target.disabled = true; try { drawLlm(await api('POST', '/api/videos/' + V.id + '/llm/cancel', {})); } catch (err) { toast(err.message); } }
        else if (id === 'vLlmShow' && lab.pending) { lab.time = vid ? vid.currentTime : 0; const p = lab.pending; lab.pending = null; openVideo(p); }
      };
      poll(false);
    }
    list.onclick = async e => {
      if (e.target.closest('.veil')) return;
      const tk = e.target.closest('.tok[data-t]');
      if (tk) {
        const li = tk.closest('.cue'), c = lab.cues[+li.dataset.i];
        const was = tk.classList.contains('open');
        $$('.tok.open', list).forEach(x => x.classList.remove('open'));
        $$('.gloss-box', list).forEach(x => x.remove());
        if (!was && c.g) { tk.classList.add('open'); $('.ko-text', li).insertAdjacentHTML('afterend', songTokDetail(null, c.ko, c.g, +tk.dataset.t, { noEdit: true, src: c.lg ? 'llm' : 'kiwi' })); }
        return;
      }
      const ap = e.target.closest('[data-addp]');
      if (ap) {
        const li = ap.closest('.cue'), c = lab.cues[+li.dataset.i], [ti, pi] = ap.dataset.addp.split(':').map(Number), x = c.g[ti][pi];
        if (LEX[x.key]) addWordByKey(x.key); else addCard(songWordCard({ title: lab.name }, x, c.ko, c.zh));
        save(); renderNav(); ap.disabled = true; ap.textContent = '已加入'; toast('已加入复习，今天就会出现。');
        return;
      }
      const ed = e.target.closest('[data-editc]');
      if (ed) {
        const i = +ed.dataset.editc, c = lab.cues[i];
        const t = prompt('把这句改成（只改文字，时间不变）：', c.ko);
        if (t == null || !t.trim() || t.trim() === c.ko) return;
        try {
          const r = await api('POST', '/api/videos/' + V.id + '/edit', { i: i, ko: t.trim() });
          Object.assign(c, { ko: r.ko, g: r.g ? convSong(r.g, r.ko) : null, edited: true });
          lab.time = vid ? vid.currentTime : 0; labPlayer(); toast('已保存。');
        } catch (err) { toast('保存失败：' + err.message); }
        return;
      }
      if (e.target.closest('.gloss-box, .cue-tools, a')) return;
      const w = e.target.closest('[data-w]');
      if (w && !e.target.closest('.veil')) {
        const word = w.dataset.w.replace(/[.,!?~…"'“”‘’()\[\]]/g, '');
        if (word) window.open('https://korean.dict.naver.com/kozhdict/#/search?query=' + encodeURIComponent(word), '_blank', 'noopener');
        return;
      }
      if (e.target.closest('.veil')) return;
      const li = e.target.closest('.cue');
      if (li) playCue(+li.dataset.i);
    };
    viewKeys = e => {
      const k = e.key;
      if (k === ' ') { e.preventDefault(); toggle(); }
      else if (e.shiftKey && vid && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); jumpTo(vid.currentTime + (k === 'ArrowLeft' ? -5 : 5)); }
      else if (k === 'ArrowLeft') { e.preventDefault(); playCue(lab.cur - 1); }
      else if (k === 'ArrowRight') { e.preventDefault(); playCue(lab.cur + 1); }
      else if (k === 'r' || k === 'R' || k === 'ArrowDown') { e.preventDefault(); playCue(lab.cur); }
      else if (k === 'l' || k === 'L') $('#loop').click();
      else if (k === 'h' || k === 'H') setSubMode(SUBS[(SUBS.indexOf(lab.sub) + 1) % 3]);
      else if (k === 's' || k === 'S') keep();
      else if ((k === 'm' || k === 'M') && lab.media) setMirror(!S.set.labMirror);
    };
    leave = () => { cancelAnimationFrame(raf); clearTimeout(labPoll); if (vid) { lab.time = vid.currentTime; vid.pause(); } };
    showSub();
    const li = $('.cue[data-i="' + lab.cur + '"]', list); if (li) li.scrollIntoView({ block: 'nearest' });
  }

  // 常用大模型服务：名称、接口格式、地址、模型名示例（以服务商控制台为准）
  const LLM_PRESETS = [
    ['DeepSeek', 'openai', 'https://api.deepseek.com/v1', 'deepseek-chat'],
    ['通义千问', 'openai', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'qwen-plus'],
    ['Kimi', 'openai', 'https://api.moonshot.cn/v1', '控制台里的模型名'],
    ['智谱 GLM', 'openai', 'https://open.bigmodel.cn/api/paas/v4', 'glm-4-plus'],
    ['OpenAI', 'openai', 'https://api.openai.com/v1', '控制台里的模型名'],
    ['Anthropic', 'anthropic', 'https://api.anthropic.com', '控制台里的模型名'],
    ['本机 Ollama', 'openai', 'http://localhost:11434/v1', '已下载的模型名']
  ];

  // ---------- 设置 ----------
  function viewSettings() {
    main.innerHTML = '<div class="wrap"><div class="page-head"><h1>设置</h1></div><div class="panel">' +
      '<div class="set-row"><div><h3>播放语速</h3><p class="muted small">课程音频的默认语速。侧边栏底部也能切换。</p></div><div class="seg" id="rates">' + RATES.map(r => '<button data-r="' + r + '" class="' + (S.set.rate === r ? 'on' : '') + '">' + r + '×</button>').join('') + '</div></div>' +
      '<div class="set-row"><div><h3>默认遮住中文</h3><p class="muted small">逐句、词汇和表达包页面先只显示韩文，点一下才看意思。</p></div><button class="btn ' + (S.set.veilZh ? 'on' : '') + '" id="vz">' + (S.set.veilZh ? '已开启' : '已关闭') + '</button></div>' +
      '<div class="set-row"><div><h3>声音来源</h3><p class="muted small" id="audioState">正在检查…</p></div></div>' +
      '<div class="set-row"><div><h3>备份进度</h3><p class="muted small">进度保存在这个浏览器里。换电脑或换浏览器前先导出，到新地方再导入。</p></div><div class="row"><button class="btn" id="exp">导出</button><label class="btn">导入<input type="file" id="imp" accept=".json" hidden></label></div></div>' +
      '<div class="set-row"><div><h3>清空进度</h3><p class="muted small">删除所有学习记录和复习卡片，不能恢复。</p></div><button class="btn" id="reset">清空</button></div>' +
      '</div>' +
      '<div class="panel" style="margin-top:20px" id="llmPanel"><h3>大模型精标接口</h3>' +
      '<p class="muted small" style="margin-top:4px">歌曲导入后，可以让大模型逐词精标并翻译整句。支持 OpenAI 格式和 Anthropic 格式的接口，国内大多数模型都提供 OpenAI 兼容接口。设置只保存在本机程序文件夹的 config 里。</p>' +
      '<div class="row" style="margin:14px 0 4px"><span class="small muted">快速填写：</span>' + LLM_PRESETS.map((p, i) => '<button class="btn sm" data-preset="' + i + '">' + p[0] + '</button>').join('') + '</div>' +
      '<p class="tiny">快速填写只填接口格式和地址，模型名以服务商控制台里显示的为准。</p>' +
      '<div class="form">' +
      '<label><span>接口格式</span><select id="lType"><option value="openai">OpenAI 兼容（/chat/completions）</option><option value="anthropic">Anthropic 兼容（/v1/messages）</option></select></label>' +
      '<label><span>接口地址</span><input id="lBase" placeholder="例如 https://api.deepseek.com/v1"></label>' +
      '<label><span>模型名</span><input id="lModel" placeholder="例如 deepseek-chat"></label>' +
      '<label><span>API Key</span><input id="lKey" type="password" autocomplete="off" placeholder="填写 API Key"></label>' +
      '<label><span>每批句数</span><input id="lBatch" type="number" min="1" max="30"></label>' +
      '<label><span>最多输出</span><input id="lMax" type="number" min="1000" max="64000" step="1000"></label>' +
      '<label><span>思考模式</span><select id="lThink"><option value="off">关闭思考（推荐，更快更省）</option><option value="auto">按模型默认</option></select></label>' +
      '<label><span>额外参数</span><input id="lExtra" spellcheck="false" placeholder="可选，JSON 格式，例如 {&quot;top_p&quot;: 0.9}"></label>' +
      '</div>' +
      '<div class="row" style="margin-top:14px"><button class="btn primary" id="lSave">保存</button><button class="btn" id="lTest">测试连接</button><button class="btn" id="lClear">删除已保存的 Key</button></div>' +
      '<p class="small" id="lMsg" style="margin-top:10px"></p>' +
      '<p class="tiny">精标用的提示词在程序文件夹的 prompts/song_gloss.md 里，可以直接修改，下次精标时生效。“最多输出”是每次请求允许模型输出的长度。DeepSeek 等模型会先思考再回答，思考也算在输出长度里，所以默认关闭思考：精标会快很多，也更省钱。如果关了思考效果不好，可以改成“按模型默认”，程序会在输出不够时自动把每批拆小。额外参数会原样加进请求里，用来填某家接口特有的设置。</p>' +
      '</div>' +
      '</div>';
    $('#rates').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; S.set.rate = +b.dataset.r; save(); renderNav(); $$('#rates button').forEach(x => x.classList.toggle('on', x === b)); };
    $('#vz').onclick = e => { S.set.veilZh = !S.set.veilZh; save(); e.currentTarget.classList.toggle('on', S.set.veilZh); e.currentTarget.textContent = S.set.veilZh ? '已开启' : '已关闭'; };
    const st = $('#audioState');
    if (STATIC) st.textContent = '网上版：课程、词汇和语法的声音都是提前生成好的多角色语音，第一次播放某句时会从网上下载。';
    else if (!SERVER) st.textContent = '现在是直接打开的网页文件，声音用浏览器自带的韩语语音' + (koVoice ? '（' + koVoice.name + '）' : '，但没找到韩语语音') + '。双击“启动.bat”打开，能用课程自带的多角色声音。';
    else fetch('/ping').then(r => { st.textContent = r.ok ? '本地服务已连接。课程和工作台里的韩语都用多角色合成语音，第一次播放某句时需要联网生成，之后离线也能听。' : '本地服务没有响应。'; }).catch(() => { st.textContent = '本地服务没有响应。请重新双击“启动.bat”。'; });
    $('#exp').onclick = () => {
      const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
      const a = document.createElement('a'); const d = new Date();
      a.href = URL.createObjectURL(blob); a.download = '한걸음-进度-' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + '.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $('#imp').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!data || typeof data.cards !== 'object' || typeof data.srs !== 'object') throw new Error('bad');
        if (!confirm('导入会覆盖现在的进度。继续吗？')) return;
        localStorage.setItem(KEY, JSON.stringify(data)); loadState(); toast('已导入 ' + Object.keys(S.cards).length + ' 张卡片。'); route();
      } catch (err) { toast('这个文件不是 한걸음 的进度备份。'); }
    };
    $('#reset').onclick = () => {
      if (!confirm('确定清空所有进度和卡片？')) return;
      if (!confirm('再确认一次：清空后不能恢复。')) return;
      localStorage.removeItem(KEY); loadState(); toast('进度已清空。'); location.hash = '#/';
    };
    if (SERVER) {
      const msg = $('#lMsg');
      const fill = c => {
        $('#lType').value = c.type || 'openai'; $('#lBase').value = c.base || ''; $('#lModel').value = c.model || '';
        $('#lBatch').value = c.batch || 8; $('#lMax').value = c.maxTokens || 8000;
        $('#lThink').value = c.thinking || 'off'; $('#lExtra').value = c.extra || '';
        $('#lKey').value = ''; $('#lKey').placeholder = c.hasKey ? '已保存' + (c.keyTail ? '，结尾是 ' + c.keyTail : '') + '。要换就重新填写' : '填写 API Key';
      };
      api('GET', '/api/llm/config').then(fill).catch(err => { msg.textContent = '读取设置失败：' + err.message; });
      $('#llmPanel').onclick = e => {
        const b = e.target.closest('[data-preset]');
        if (!b) return;
        const p = LLM_PRESETS[+b.dataset.preset];
        $('#lType').value = p[1]; $('#lBase').value = p[2]; $('#lModel').placeholder = '例如 ' + p[3];
        if (!$('#lModel').value) $('#lModel').value = p[3];
        msg.textContent = '已填好' + p[0] + '的地址。确认模型名后点“保存”。';
      };
      const collect = () => ({ type: $('#lType').value, base: $('#lBase').value.trim(), model: $('#lModel').value.trim(), key: $('#lKey').value.trim(), batch: +$('#lBatch').value || 8, maxTokens: +$('#lMax').value || 8000, thinking: $('#lThink').value, extra: $('#lExtra').value.trim() });
      $('#lSave').onclick = async () => {
        const c = collect();
        if (!c.base || !c.model) { msg.textContent = '接口地址和模型名都要填。'; return; }
        try { fill(await api('POST', '/api/llm/config', c)); msg.textContent = '已保存。可以点“测试连接”试一下。'; } catch (err) { msg.textContent = '保存失败：' + err.message; }
      };
      $('#lTest').onclick = async e => {
        const btn = e.currentTarget;
        btn.disabled = true; msg.textContent = '正在连接…';
        try {
          const c = collect();
          if (c.base && c.model) fill(await api('POST', '/api/llm/config', c));
          const r = await api('POST', '/api/llm/test', {});
          msg.textContent = '连接成功。' + r.model + ' 用 ' + r.seconds + ' 秒回复：' + r.reply;
        } catch (err) { msg.textContent = '连接失败：' + err.message; }
        btn.disabled = false;
      };
      $('#lClear').onclick = async () => {
        if (!confirm('删除已保存的 API Key？')) return;
        try { fill(await api('POST', '/api/llm/config', { clearKey: true })); msg.textContent = '已删除 Key。'; } catch (err) { msg.textContent = err.message; }
      };
    } else {
      if (STATIC) $('#llmPanel').remove();
      else $('#llmPanel').innerHTML = '<h3>大模型精标接口</h3><p class="muted small">这项设置需要本地服务。请双击“启动.bat”打开这个页面后再设置。</p>';
    }
  }

  // ---------- 歌曲 ----------
  const songCache = {};
  let llmPoll = 0;
  const HANGUL = /[가-힣]/;
  async function api(method, url, body, raw) {
    const opt = { method: method, headers: {} };
    if (raw) opt.body = raw;
    else if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    const r = await fetch(url, opt);
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = { error: text }; }
    if (!r.ok) throw new Error((data && data.error) || ('请求失败：' + r.status));
    return data;
  }
  function needServer() {
    if (SERVER) return false;
    main.innerHTML = '<div class="wrap"><div class="empty"><div class="cap lg" lang="ko">노래</div><p>' +
      (STATIC ? '歌曲学习要在自己电脑上用：需要本地服务来拆词和播放你的音乐。网上版只包含课程、词汇和语法。' : '歌曲功能要用本地服务。请双击“启动.bat”打开这个页面。') + '</p></div></div>';
    return true;
  }
  function parseLrc(text) {
    const out = [];
    text.replace(/^﻿/, '').replace(/\r/g, '').split('\n').forEach(raw => {
      const line = raw.trim();
      if (!line || line.charAt(0) === '{') return;  // 网易云的制作人员信息是 JSON 行
      const times = [];
      let rest = line, m;
      while ((m = rest.match(/^\[(\d+):(\d+(?:\.\d+)?)\]/))) { times.push(+m[1] * 60 + +m[2]); rest = rest.slice(m[0].length); }
      if (!times.length) return;
      const ko = rest.replace(/\s+/g, ' ').trim();
      if (!ko || /^(作词|作曲|编曲|制作人|词|曲|演唱)\s*[:：]/.test(ko)) return;
      times.forEach(t => out.push({ t: Math.round(t * 1000) / 1000, ko: ko }));
    });
    return out.sort((a, b) => a.t - b.t);
  }
  const plainLines = text => text.replace(/\r/g, '').split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).map(ko => ({ t: null, ko: ko }));
  function nameParts(fname) {
    const base = fname.replace(/\.[^.]+$/, '');
    const k = base.indexOf(' - ');
    return k > 0 ? { artist: base.slice(0, k).trim(), title: base.slice(k + 3).trim() } : { artist: '', title: base.trim() };
  }
  const songUnique = song => { const seen = {}; return song.lines.map(l => l.ko).filter(t => !seen[t] && HANGUL.test(t) && (seen[t] = 1)); };
  const songSrc = song => {
    const pick = (S.set.songSrc || {})[song.id];
    const hasLlm = Object.keys(song.gloss.llm || {}).length > 0;
    return pick === 'kiwi' || !hasLlm ? 'kiwi' : 'llm';
  };
  function convSong(tokens, ko) {
    if (!tokens || tokens.length !== ko.split(' ').length) return null;
    return tokens.map(t => t.map(p => {
      const key = p.lemma || p.ko;
      let zh = p.zh || '';
      const unknown = !zh || zh.charAt(0) === '？';
      if (unknown && !p.gram && LEX[key]) zh = LEX[key].w.zh + (p.gz || '');
      return { ko: p.ko, zh: zh || '？', lemma: p.lemma || '', key: key, gram: !!p.gram, unk: !zh || zh.charAt(0) === '？', edited: !!p.edited };
    }));
  }
  function songGloss(song, ko) {
    const llm = (song.gloss.llm || {})[ko], src = songSrc(song);
    const useLlm = src === 'llm' && llm;
    const g = useLlm ? convSong(llm.tokens, ko) : convSong((song.gloss.kiwi || {})[ko], ko);
    return { g: g, zh: llm ? llm.zh : '', note: llm ? llm.note : '', src: useLlm ? 'llm' : 'kiwi' };
  }
  const audioUrl = song => song.audio ? '/songs/' + song.id + '/' + song.audio : '';
  function lineEnd(song, i, dur) {
    const t = song.lines[i].t;
    for (let k = i + 1; k < song.lines.length; k++) if (song.lines[k].t != null && song.lines[k].t > t) return song.lines[k].t;
    return dur ? Math.min(dur, t + 8) : t + 6;
  }
  const contentZh = x => x.zh.replace(/（[^）]*）/g, '') || x.zh;
  function songWordCard(song, x, line, lineZh) {
    return { id: 'w:' + x.key, kind: 'word', ko: x.lemma || x.ko, zh: contentZh(x), v: 'f', say: x.lemma || x.ko, src: song.title, ex: line, exzh: lineZh || '', exv: 'f' };
  }
  function songLineCard(song, i, gl) {
    const l = song.lines[i];
    return { id: 'l:' + l.ko, kind: 'song', ko: l.ko, zh: gl.zh || '', v: 'f', g: gl.g, src: song.title + (l.t != null ? ' ' + fmt(l.t) : ''),
      clip: song.audio && l.t != null ? { url: audioUrl(song), s: l.t, e: lineEnd(song, i) } : null };
  }
  function songTokDetail(song, ko, g, ti, opt) {
    opt = opt || {};
    const clean = ko.split(' ')[ti].replace(PUNCT, '');
    const rows = g[ti].map((x, pi) => {
      const lx = x.gram ? null : LEX[x.key];
      let extra = '';
      if (x.lemma && x.lemma !== x.ko) extra += '<span class="tiny">原形 <span lang="ko">' + esc(x.lemma) + '</span></span> ';
      if (lx) extra += '<a class="tag learned" href="#/e/' + lx.ep.id + '/3">' + epLabel(lx.ep) + '学过</a> ';
      else if (!x.gram && S.cards['w:' + x.key]) extra += '<span class="tag ok">已在复习</span> ';
      if (x.edited) extra += '<span class="tiny">你改过</span>';
      const btns = (x.gram || S.cards['w:' + x.key] || !HANGUL.test(x.ko) ? '' : '<button class="btn sm" data-addp="' + ti + ':' + pi + '">加入复习</button>') +
        (opt.noEdit ? '' : '<button class="btn sm" data-editp="' + ti + ':' + pi + '">改意思</button>');
      return '<div class="gpart' + (x.gram ? ' gram-part' : '') + '">' + (x.gram || !HANGUL.test(x.ko) ? '<span class="gdot"></span>' : pbtn(x.lemma || x.ko, 'f')) +
        '<div class="grow"><b lang="ko">' + esc(x.ko) + '</b>　' + (x.unk ? '<span class="unk">' + (opt.src === 'kiwi' ? '离线词典里没有。点上面的“精标”让大模型标注，或者查 Naver 词典' : opt.noEdit ? '词典里没有，可以查 Naver 词典' : '还不知道意思，可以点“改意思”填上') + '</span>' : esc(x.zh)) + '　' + extra + '</div>' +
        '<div class="row" style="gap:4px;flex-wrap:nowrap">' + btns + '</div></div>';
    }).join('');
    return '<div class="gloss-box">' + (HANGUL.test(clean) ? '<div class="g-word">' + pbtn(clean, 'f') + '<b lang="ko">' + esc(clean) + '</b>' + (pronOf(clean) ? ' <span class="tiny">读作</span> ' + pronTag(clean) : ' <span class="tiny">读音和写法一样</span>') + '</div>' : '') +
      rows + '<div class="row gfoot"><a class="btn sm" target="_blank" rel="noopener" href="https://korean.dict.naver.com/kozhdict/#/search?query=' + encodeURIComponent(clean) + '">查 Naver 词典</a>' +
      (opt.src ? '<span class="tiny">' + (opt.src === 'llm' ? '意思由大模型标注' : '意思来自离线拆词和词典') + '</span>' : '') + '</div></div>';
  }

  async function viewSongs() {
    if (needServer()) return;
    const my = routeSeq;
    main.innerHTML = '<div class="wrap"><div class="page-head"><div class="cap lg pop" lang="ko">노래로 배우기</div>' +
      '<p class="lede">导入一首韩语歌的歌词和音频，一句一句地听，点开每个词看意思。导入后会自动拆词；接好大模型以后，还能让它逐词精标并翻译整句。</p></div>' +
      '<div id="songList"><p class="muted">正在读取歌单…</p></div>' +
      '<section class="panel" id="impPanel" style="margin-top:26px"><h3>导入一首歌</h3><p class="muted small">把歌词文件和音频一起拖到这里，或者点按钮选择。</p>' +
      '<div class="file-row" style="justify-content:flex-start"><label class="btn primary">选择歌词（.lrc）<input type="file" id="fLrc" accept=".lrc,.txt" hidden></label>' +
      '<label class="btn">选择音频（可选）<input type="file" id="fAud" accept="audio/*,.flac,.m4a,.opus" hidden></label></div>' +
      '<p class="small" id="fInfo" style="margin-top:10px"></p>' +
      '<div class="row" style="margin-top:12px"><input class="search" id="sTitle" placeholder="歌名" lang="ko"><input class="search" id="sArtist" placeholder="歌手"></div>' +
      '<details style="margin-top:12px"><summary class="small">没有歌词文件？直接粘贴歌词</summary><textarea class="paste" id="sPaste" lang="ko" placeholder="一行一句。带 [00:15.17] 这种时间标记也可以。"></textarea></details>' +
      '<div class="row" style="margin-top:14px"><button class="btn primary" id="doImp">导入</button><span class="tiny">网易云会员下载的 .ncm 是加密格式，用不了。请用 mp3、m4a、flac 这类普通音频。</span></div></section></div>';
    const pending = { lrc: null, lrcName: '', audio: null };
    const info = () => {
      const a = [];
      if (pending.lrc) a.push('歌词：' + pending.lrcName + '，' + pending.lrc.length + ' 句');
      if (pending.audio) a.push('音频：' + pending.audio.name + '（' + (pending.audio.size / 1048576).toFixed(1) + ' MB）');
      $('#fInfo').textContent = a.join('　');
    };
    // 歌名歌手按文件名自动填写：歌词文件名优先，自己改过的不覆盖
    const fillName = (fname, strong) => {
      const n = nameParts(fname);
      [['#sTitle', n.title], ['#sArtist', n.artist]].forEach(([sel, v]) => {
        const el = $(sel);
        if (v && (!el.value || (el.dataset.auto && (strong || el.dataset.auto === 'weak')))) { el.value = v; el.dataset.auto = strong ? 'strong' : 'weak'; }
      });
    };
    const takeFile = async f => {
      if (/\.ncm$/i.test(f.name)) { toast('.ncm 是网易云的加密格式，浏览器播放不了。请换成 mp3 等普通音频。'); return; }
      if (/\.(lrc|txt)$/i.test(f.name)) {
        const text = await readText(f, 'gbk');
        const lines = parseLrc(text);
        pending.lrc = lines.length ? lines : plainLines(text);
        pending.lrcName = f.name; fillName(f.name, true);
      } else if (/^audio\//.test(f.type) || /\.(mp3|m4a|aac|flac|ogg|wav|opus)$/i.test(f.name)) {
        pending.audio = f; fillName(f.name, false);
      } else toast('不认识“' + f.name + '”。歌词用 .lrc，音频用 mp3、m4a、flac 等。');
      info();
    };
    $('#fLrc').onchange = e => Array.from(e.target.files).forEach(takeFile);
    $$('#sTitle, #sArtist').forEach(el => { el.oninput = () => { el.dataset.auto = ''; }; });
    $('#fAud').onchange = e => Array.from(e.target.files).forEach(takeFile);
    const panel = $('#impPanel');
    panel.ondragover = e => { e.preventDefault(); panel.classList.add('over'); };
    panel.ondragleave = () => panel.classList.remove('over');
    panel.ondrop = e => { e.preventDefault(); panel.classList.remove('over'); Array.from(e.dataTransfer.files).forEach(takeFile); };
    $('#doImp').onclick = async () => {
      const paste = $('#sPaste').value.trim();
      let lines = pending.lrc;
      if (!lines && paste) { const p = parseLrc(paste); lines = p.length ? p : plainLines(paste); }
      if (!lines || !lines.length) { toast('先选歌词文件，或者粘贴歌词。'); return; }
      const btn = $('#doImp'); btn.disabled = true; btn.textContent = '正在导入并拆词…';
      try {
        const song = await api('POST', '/api/songs', { title: $('#sTitle').value, artist: $('#sArtist').value, lines: lines });
        if (pending.audio) {
          btn.textContent = '正在保存音频…';
          const ext = (pending.audio.name.match(/\.([^.]+)$/) || [, 'mp3'])[1];
          await api('PUT', '/api/songs/' + song.id + '/audio?ext=' + encodeURIComponent(ext), undefined, pending.audio);
        }
        toast('导入好了。'); location.hash = '#/song/' + song.id;
      } catch (err) { toast('导入失败：' + err.message); btn.disabled = false; btn.textContent = '导入'; }
    };
    let list;
    try { list = await api('GET', '/api/songs'); } catch (err) { if (my === routeSeq) $('#songList').innerHTML = '<p class="muted">读取歌单失败：' + esc(err.message) + '</p>'; return; }
    if (my !== routeSeq) return;
    $('#songList').innerHTML = list.length ? '<ol class="ep-list">' + list.map((s, i) => '<li><a href="#/song/' + s.id + '"><span class="ep-no">' + (i + 1) + '</span><span><span class="ep-ko" lang="ko">' + esc(s.title) + '</span><br>' +
      '<span class="ep-zh">' + esc(s.artist || '未知歌手') + '，' + s.lines + ' 句' + (s.audio ? '' : '，只有歌词') + '</span></span>' +
      '<span class="tag ' + (s.llm || s.job ? 'ok' : '') + '">' + (s.job ? '精标中 ' + s.job.done + ' / ' + s.job.total + ' 句' : s.llm ? '已精标 ' + s.llm + ' / ' + s.unique + ' 句' : s.kiwi ? '已自动拆词' : '未拆词') + '</span></a></li>').join('') + '</ol>'
      : '<div class="empty" style="padding:24px">还没有歌。在下面导入第一首。</div>';
  }

  async function viewSong(id, step) {
    if (needServer()) return;
    const my = routeSeq;
    main.innerHTML = '<div class="wrap"><p class="muted">正在读取歌曲…</p></div>';
    let song;
    try { song = await api('GET', '/api/songs/' + id); }
    catch (err) { if (my === routeSeq) main.innerHTML = '<div class="wrap"><div class="empty">' + esc(err.message) + '。<a href="#/songs">回到歌单</a></div></div>'; return; }
    if (my !== routeSeq) return;
    songCache[id] = song;
    renderSong(song, Math.min(3, Math.max(1, +step || 1)));
  }

  function renderSong(song, step) {
    const uniq = songUnique(song), llmN = uniq.filter(t => (song.gloss.llm || {})[t]).length, src = songSrc(song);
    const names = ['逐句听', '生词表', '练习'];
    main.innerHTML = '<div class="wrap"><div class="ep-head"><div class="kicker"><a href="#/songs">歌曲</a>　' + esc(song.artist || '') + '</div>' +
      '<div class="cap lg pop" lang="ko">' + esc(song.title) + '</div>' +
      '<div class="song-status">' +
      '<div><b>自动拆词</b>　' + (song.kiwiError ? '<span class="unk">' + esc(song.kiwiError) + '</span>' : '已完成') + '　<button class="btn sm" id="reKiwi">重新拆词</button></div>' +
      '<div><b>大模型精标</b>　<span id="llmState">' + (llmN ? '已精标 ' + llmN + ' / ' + uniq.length + ' 句' : '还没有精标') + '</span>　' +
      '<span id="llmBtns"></span> <a class="small" href="#/settings">接口设置</a></div>' +
      '<div id="llmMsg" class="small" hidden></div>' +
      (llmN ? '<div><b>显示</b>　<span class="seg" id="srcSeg"><button data-src="llm" class="' + (src === 'llm' ? 'on' : '') + '">大模型精标</button><button data-src="kiwi" class="' + (src === 'kiwi' ? 'on' : '') + '">自动拆词</button></span></div>' : '') +
      '</div></div>' +
      '<div class="steps" role="tablist">' + names.map((n, i) => '<button role="tab" aria-selected="' + (i + 1 === step) + '" class="' + (i + 1 === step ? 'on' : '') + '" data-step="' + (i + 1) + '"><b>' + (i + 1) + '</b>' + n + '</button>').join('') + '</div>' +
      '<div id="stepBody"></div>' +
      '<div class="step-foot"><span></span><button class="btn sm" id="delSong">删除这首歌</button></div></div>';
    $$('.steps button').forEach(b => b.onclick = () => { location.hash = '#/song/' + song.id + '/' + b.dataset.step; });
    $('#reKiwi').onclick = async e => {
      e.currentTarget.disabled = true; e.currentTarget.textContent = '拆词中…';
      try { const s2 = await api('POST', '/api/songs/' + song.id + '/analyze'); songCache[song.id] = s2; toast('重新拆好了。'); renderSong(s2, step); }
      catch (err) { toast('拆词失败：' + err.message); }
    };
    // 精标在服务端后台跑，这里只负责显示进度。离开页面再回来，会接着显示
    clearTimeout(llmPoll);
    const my = routeSeq, onPage = () => my === routeSeq && !!$('#llmState');
    const drawLlm = job => {
      if (!onPage()) return;
      const st = $('#llmState'), bt = $('#llmBtns'), msg = $('#llmMsg');
      if (job.state === 'running') {
        st.textContent = '精标中：已完成 ' + job.done + ' / ' + job.total + ' 句' + (job.note ? '，' + job.note : '') + '。可以切到别的页面，不会中断。';
        bt.innerHTML = '<button class="btn sm" id="llmStop">停止</button>';
      } else {
        bt.innerHTML = (llmN < uniq.length ? '<button class="btn sm primary" id="llmRun">' + (llmN ? '精标剩下的 ' + (uniq.length - llmN) + ' 句' : '用大模型精标') + '</button> ' : '') +
          (llmN ? '<button class="btn sm" id="llmAll">全部重新精标</button> ' : '');
      }
      const failN = (job.failed || []).length;
      let text = '', bad = false;
      if (job.state === 'done') {
        text = '上次精标完成：成功 ' + job.ok + ' 句' + (failN ? '，' + failN + ' 句没有拿到结果' : '') + (job.fixed ? '，' + job.fixed + ' 个词对不上原文，已用自动拆词代替' : '') + '。';
        if (job.error) { text += job.error; bad = true; }
      } else if (job.state === 'error') {
        text = '精标出错停下了：' + job.error + ' 做完的 ' + job.ok + ' 句已经保存，问题解决后点“精标剩下的”会接着做。'; bad = true;
      } else if (job.state === 'cancelled') {
        text = '已停止。做完的 ' + job.ok + ' 句已经保存。';
      }
      msg.hidden = !text; msg.textContent = text; msg.classList.toggle('unk', bad);
    };
    const poll = async wasRunning => {
      if (!onPage()) return;
      let job;
      try { job = await api('GET', '/api/songs/' + song.id + '/llm/status'); } catch (err) { return; }
      if (!onPage()) return;
      if (wasRunning && job.state !== 'running') {
        // 刚做完：重新读取歌曲，把精标结果显示出来。正在听歌时不打断，给一个按钮
        try { song = await api('GET', '/api/songs/' + song.id); songCache[song.id] = song; } catch (err) { return; }
        S.set.songSrc = S.set.songSrc || {}; delete S.set.songSrc[song.id]; save();
        const aud = $('#sAud');
        if (aud && !aud.paused) { drawLlm(job); $('#llmBtns').innerHTML = '<button class="btn sm primary" id="llmShow">显示精标结果</button>'; }
        else renderSong(song, step);
        return;
      }
      drawLlm(job);
      if (job.state === 'running') llmPoll = setTimeout(() => poll(true), 2000);
    };
    const start = async all => {
      if (all && !confirm('重新精标全部 ' + uniq.length + ' 句？会覆盖已有的精标结果，包括你改过的意思。')) return;
      try {
        const cfg = await api('GET', '/api/llm/config');
        if (!cfg.base || !cfg.model) { toast('先在设置里填好大模型接口。'); location.hash = '#/settings'; return; }
        drawLlm(await api('POST', '/api/songs/' + song.id + '/llm/start', { all: all }));
        clearTimeout(llmPoll); llmPoll = setTimeout(() => poll(true), 1500);
      } catch (err) { toast('没能开始精标：' + err.message); }
    };
    $('.song-status').onclick = async e => {
      const id = e.target.id;
      if (id === 'llmRun') start(false);
      else if (id === 'llmAll') start(true);
      else if (id === 'llmShow') renderSong(song, step);
      else if (id === 'llmStop') { e.target.disabled = true; try { drawLlm(await api('POST', '/api/songs/' + song.id + '/llm/cancel', {})); } catch (err) { toast(err.message); } }
    };
    poll(false);
    const seg = $('#srcSeg');
    if (seg) seg.onclick = e => { const b = e.target.closest('[data-src]'); if (!b) return; S.set.songSrc = S.set.songSrc || {}; S.set.songSrc[song.id] = b.dataset.src; save(); renderSong(song, step); };
    $('#delSong').onclick = async () => {
      if (!confirm('删除“' + song.title + '”？歌词、音频和精标结果都会删掉，已加入复习的卡片会保留。')) return;
      try { await api('DELETE', '/api/songs/' + song.id); toast('已删除。'); location.hash = '#/songs'; } catch (err) { toast('删除失败：' + err.message); }
    };
    const body = $('#stepBody');
    if (leave) { leave(); leave = null; }
    viewKeys = null; main.onclick = null;
    [songListen, songWords, songPractice][step - 1](song, body);
  }

  function songListen(song, body) {
    const ui = S.set.songUi = Object.assign({ loop: false, auto: false, speed: 1, veilKo: false, veilZh: false }, S.set.songUi);
    const url = audioUrl(song), timed = song.lines.some(l => l.t != null);
    body.innerHTML = '<div class="player">' + (url ? '<audio id="sAud" src="' + url + '" preload="auto"></audio>' : '') +
      '<div class="row"><button class="btn primary" id="pp">' + (url ? '播放' : '朗读当前句') + '</button><button class="btn" id="prev">上一句</button><button class="btn" id="again">重播这句</button><button class="btn" id="next">下一句</button>' +
      '<button class="btn ' + (ui.loop ? 'on' : '') + '" id="loop">循环本句</button><button class="btn ' + (ui.auto ? 'on' : '') + '" id="auto">逐句暂停</button>' +
      (url ? '<span class="tiny" id="time">0:00</span>' : '') + '</div>' +
      (url ? '<input type="range" class="seek" id="seek" min="0" max="1" step="0.1" value="0" aria-label="播放进度">' : '<p class="tiny" style="margin-top:8px">这首歌没有音频，播放会用合成语音朗读歌词。</p>') +
      '<div class="row" style="margin-top:8px"><span class="small muted">语速</span><div class="seg" id="speed">' + [0.75, 0.9, 1].map(r => '<button data-s="' + r + '" class="' + (ui.speed === r ? 'on' : '') + '">' + r + '×</button>').join('') + '</div>' +
      '<button class="btn sm ' + (S.set.inter ? 'on' : '') + '" id="vi">逐词对照</button><button class="btn sm ' + (ui.veilKo ? 'on' : '') + '" id="vk">遮住韩文</button><button class="btn sm ' + (ui.veilZh ? 'on' : '') + '" id="vz">遮住翻译</button></div></div>' +
      '<p class="tiny" style="margin:10px 0">点句子左边的时间只播这一句。点任意一个词，看它的意思和原形。<kbd>空格</kbd> 播放或暂停，<kbd>←</kbd> <kbd>→</kbd> 换句，<kbd>R</kbd> 重播，<kbd>L</kbd> 循环。</p>' +
      '<ol class="lines song-lines" id="sLines"></ol>';
    const list = $('#sLines'), aud = $('#sAud');
    let cur = -1, stopAt = null, raf = 0, dragging = false;
    const drawLines = () => {
      list.innerHTML = song.lines.map((l, i) => {
        const gl = songGloss(song, l.ko), saved = !!S.cards['l:' + l.ko], ko = HANGUL.test(l.ko);
        return '<li class="line' + (i === cur ? ' cur' : '') + '" data-i="' + i + '"><div><button class="time-btn" data-li="' + i + '" title="只播这一句">' + (l.t != null ? fmt(l.t) : '第 ' + (i + 1) + ' 句') + '</button></div>' +
          '<div><div class="ko-text' + (ui.veilKo ? ' veil' : '') + '" lang="ko">' + (gl.g ? tokHtml(l.ko, gl.g, { inter: S.set.inter, song: true }) : esc(l.ko)) + '</div>' +
          (gl.zh ? '<div class="zh-text' + (ui.veilZh ? ' veil' : '') + '">' + esc(gl.zh) + '</div>' : '') +
          (gl.note ? '<div class="note">' + esc(gl.note) + '</div>' : '') +
          (ko ? '<div class="line-tools">' + pbtn(l.ko, 'f', 'sm-play') + '<span class="tiny">念一遍</span>' +
            '<button class="btn sm" data-keep="' + i + '"' + (saved ? ' disabled' : '') + '>' + (saved ? '已在复习里' : '收藏这句') + '</button></div>' : '') + '</div></li>';
      }).join('');
    };
    drawLines();
    const setCur = (i, scroll) => {
      if (i === cur) return;
      cur = i;
      $$('.line', list).forEach(li => li.classList.toggle('cur', +li.dataset.i === i));
      const li = $('.line[data-i="' + i + '"]', list);
      if (scroll && li) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const playLine = i => {
      i = Math.max(0, Math.min(song.lines.length - 1, i));
      const l = song.lines[i];
      setCur(i, true);
      if (aud && l.t != null) {
        stopAudio();
        aud.playbackRate = ui.speed; aud.preservesPitch = true;
        aud.currentTime = l.t;
        stopAt = ui.auto || ui.loop ? lineEnd(song, i, aud.duration) : null;
        aud.play().catch(() => toast('浏览器拦截了播放，请再点一次。'));
      } else if (HANGUL.test(l.ko)) {
        const my = token + 1;
        play(l.ko, 'f', ui.speed).then(() => { if (ui.loop && token === my && cur === i && list.isConnected) playLine(i); });
      }
    };
    const check = () => {
      if (!aud) return;
      const t = aud.currentTime;
      if (!dragging && $('#seek')) $('#seek').value = t;
      if ($('#time')) $('#time').textContent = fmt(t) + ' / ' + fmt(aud.duration || 0);
      if (aud.paused) return;
      if (stopAt != null && t >= stopAt) {
        if (ui.loop && cur >= 0) { aud.currentTime = song.lines[cur].t; return; }
        aud.pause(); stopAt = null; return;
      }
      if (stopAt == null && timed) {
        let k = -1;
        for (let n = 0; n < song.lines.length; n++) if (song.lines[n].t != null && song.lines[n].t <= t + 0.05) k = n;
        if (k >= 0) setCur(k, true);
      }
    };
    const tick = () => { raf = requestAnimationFrame(tick); check(); };
    if (aud) {
      aud.addEventListener('loadedmetadata', () => { $('#seek').max = aud.duration; check(); });
      aud.addEventListener('timeupdate', check);
      aud.addEventListener('play', () => { $('#pp').textContent = '暂停'; });
      aud.addEventListener('pause', () => { $('#pp').textContent = '播放'; });
      aud.addEventListener('error', () => toast('音频读不出来。请确认是 mp3、m4a、flac 这类普通格式。'));
      const seek = $('#seek');
      seek.oninput = () => { dragging = true; $('#time').textContent = fmt(+seek.value) + ' / ' + fmt(aud.duration || 0); };
      seek.onchange = () => { dragging = false; stopAt = null; aud.currentTime = +seek.value; };
      raf = requestAnimationFrame(tick);
    }
    const toggle = () => {
      if (!aud) return playLine(cur < 0 ? 0 : cur);
      if (aud.paused) {
        stopAudio();
        if (ui.auto && cur >= 0) playLine(cur);
        else { stopAt = null; aud.playbackRate = ui.speed; aud.play().catch(() => {}); }
      } else aud.pause();
    };
    $('#pp').onclick = toggle;
    $('#prev').onclick = () => playLine(cur - 1);
    $('#next').onclick = () => playLine(cur + 1);
    $('#again').onclick = () => playLine(cur < 0 ? 0 : cur);
    const flip = (k, btn) => { ui[k] = !ui[k]; save(); btn.classList.toggle('on', ui[k]); };
    $('#loop').onclick = e => { flip('loop', e.currentTarget); if (aud && !aud.paused && cur >= 0) stopAt = ui.loop || ui.auto ? lineEnd(song, cur, aud.duration) : null; };
    $('#auto').onclick = e => { flip('auto', e.currentTarget); if (aud && !aud.paused && cur >= 0 && !ui.loop) stopAt = ui.auto ? lineEnd(song, cur, aud.duration) : null; };
    $('#speed').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; ui.speed = +b.dataset.s; save(); if (aud) aud.playbackRate = ui.speed; $$('#speed button').forEach(x => x.classList.toggle('on', x === b)); };
    $('#vi').onclick = e => { S.set.inter = !S.set.inter; save(); e.currentTarget.classList.toggle('on', S.set.inter); drawLines(); };
    $('#vk').onclick = e => { flip('veilKo', e.currentTarget); drawLines(); };
    $('#vz').onclick = e => { flip('veilZh', e.currentTarget); drawLines(); };
    const openTok = (li, ti) => {
      const l = song.lines[+li.dataset.i], gl = songGloss(song, l.ko);
      if (!gl.g) return;
      const tk = $('.tok[data-t="' + ti + '"]', li);
      $$('.tok.open', li).forEach(x => x.classList.remove('open'));
      const old = $('.gloss-box', li); if (old) old.remove();
      if (tk) tk.classList.add('open');
      $('.ko-text', li).insertAdjacentHTML('afterend', songTokDetail(song, l.ko, gl.g, ti));
    };
    main.onclick = async e => {
      if (e.target.closest('.veil')) return;
      const tb = e.target.closest('[data-li]');
      if (tb) { playLine(+tb.dataset.li); return; }
      const tk = e.target.closest('.tok[data-t]');
      if (tk) {
        const li = tk.closest('.line');
        if (tk.classList.contains('open')) { tk.classList.remove('open'); const o = $('.gloss-box', li); if (o) o.remove(); return; }
        openTok(li, +tk.dataset.t); return;
      }
      const ap = e.target.closest('[data-addp]'), ep = e.target.closest('[data-editp]'), kp = e.target.closest('[data-keep]');
      if (ap || ep) {
        const li = (ap || ep).closest('.line'), l = song.lines[+li.dataset.i], gl = songGloss(song, l.ko);
        const [ti, pi] = (ap || ep).dataset[ap ? 'addp' : 'editp'].split(':').map(Number), x = gl.g[ti][pi];
        if (ap) {
          if (LEX[x.key]) addWordByKey(x.key); else addCard(songWordCard(song, x, l.ko, gl.zh));
          save(); renderNav(); toast('已加入复习，今天就会出现。'); openTok(li, ti); return;
        }
        const v = prompt('“' + x.ko + '”在这句里的中文意思：', x.unk ? '' : x.zh);
        if (v == null || !v.trim()) return;
        try {
          const s2 = await api('POST', '/api/songs/' + song.id + '/edit', { source: gl.src, line: l.ko, tok: ti, part: pi, zh: v.trim() });
          Object.assign(song, s2); songCache[song.id] = song;
          drawLines(); const li2 = $('.line[data-i="' + li.dataset.i + '"]', list); if (li2) openTok(li2, ti);
          toast('已保存。');
        } catch (err) { toast('保存失败：' + err.message); }
        return;
      }
      if (kp) {
        const i = +kp.dataset.keep;
        addCard(songLineCard(song, i, songGloss(song, song.lines[i].ko))); save(); renderNav();
        kp.disabled = true; kp.textContent = '已在复习里'; toast('已加入复习，复习时会播放原曲这一句。');
      }
    };
    viewKeys = e => {
      const k = e.key;
      if (k === ' ') { e.preventDefault(); toggle(); }
      else if (k === 'ArrowLeft') { e.preventDefault(); playLine(cur - 1); }
      else if (k === 'ArrowRight') { e.preventDefault(); playLine(cur + 1); }
      else if (k === 'r' || k === 'R') playLine(cur < 0 ? 0 : cur);
      else if (k === 'l' || k === 'L') $('#loop').click();
    };
    leave = () => { cancelAnimationFrame(raf); if (aud) aud.pause(); };
  }

  function songWords(song, body) {
    let filter = 'new';
    const map = new Map();
    song.lines.forEach((l, i) => {
      const gl = songGloss(song, l.ko);
      if (!gl.g) return;
      gl.g.forEach((t, ti) => t.forEach(x => {
        if (x.gram || !HANGUL.test(x.ko)) return;
        const e = map.get(x.key);
        if (e) { e.count++; return; }
        map.set(x.key, { key: x.key, x: x, count: 1, line: i, gl: gl });
      }));
    });
    const all = Array.from(map.values());
    const status = w => LEX[w.key] ? 'learned' : S.cards['w:' + w.key] ? 'review' : 'new';
    const draw = () => {
      const rows = all.filter(w => filter === 'all' || status(w) === filter || (filter === 'old' && status(w) !== 'new'));
      const newN = all.filter(w => status(w) === 'new').length;
      body.innerHTML = '<div class="toolbar"><div class="seg" id="wf">' + [['new', '新词'], ['old', '学过或在复习'], ['all', '全部']].map(f => '<button data-f="' + f[0] + '" class="' + (filter === f[0] ? 'on' : '') + '">' + f[1] + '</button>').join('') + '</div>' +
        '<button class="btn primary" id="addAll"' + (newN ? '' : ' disabled') + '>' + (newN ? '把 ' + newN + ' 个新词加入复习' : '新词都已加入复习') + '</button>' +
        '<span class="grow tiny">这首歌一共 ' + all.length + ' 个词。</span></div>' +
        (rows.length ? '<table class="table"><thead><tr><th></th><th>词</th><th>意思</th><th>次数</th><th>歌词里</th><th></th></tr></thead><tbody>' + rows.map(w => {
          const st = status(w), l = song.lines[w.line];
          return '<tr><td>' + pbtn(w.x.lemma || w.x.ko, 'f') + '</td><td><span class="ko-text" lang="ko">' + esc(w.x.lemma || w.x.ko) + '</span>' +
            (w.x.lemma && w.x.lemma !== w.x.ko ? ' <span class="muted small" lang="ko">' + esc(w.x.ko) + '</span>' : '') + '</td>' +
            '<td>' + (w.x.unk ? '<span class="unk">？</span>' : esc(contentZh(w.x))) + '</td><td class="small">' + w.count + '</td>' +
            '<td class="small" lang="ko">' + tokHtml(l.ko, w.gl.g, { hi: w.key, click: false }) + '</td>' +
            '<td>' + (st === 'learned' ? '<a class="tag learned" href="#/e/' + LEX[w.key].ep.id + '/3">' + epLabel(LEX[w.key].ep) + '</a>' : st === 'review' ? '<span class="tag ok">在复习</span>' : '<button class="btn sm" data-addw2="' + esc(w.key) + '">加入复习</button>') + '</td></tr>';
        }).join('') + '</tbody></table>' : '<div class="empty">这一类没有词。</div>');
      $('#wf').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; draw(); } };
      $('#addAll').onclick = () => {
        let n = 0;
        all.forEach(w => { if (status(w) === 'new' && addCard(songWordCard(song, w.x, song.lines[w.line].ko, w.gl.zh))) n++; });
        save(); renderNav(); toast('加入了 ' + n + ' 个词，今天就能复习。'); draw();
      };
    };
    main.onclick = e => {
      const b = e.target.closest('[data-addw2]');
      if (!b) return;
      const w = map.get(b.dataset.addw2);
      addCard(songWordCard(song, w.x, song.lines[w.line].ko, w.gl.zh)); save(); renderNav(); draw();
    };
    draw();
  }

  function songPractice(song, body) {
    const url = audioUrl(song);
    const idx = [], seen = {};
    song.lines.forEach((l, i) => { if (!seen[l.ko] && HANGUL.test(l.ko)) { seen[l.ko] = 1; idx.push(i); } });
    const words = [];
    idx.forEach(i => { const gl = songGloss(song, song.lines[i].ko); if (gl.g) song.lines[i].ko.split(' ').forEach(t => { const c = t.replace(PUNCT, ''); if (HANGUL.test(c) && c.length >= 2 && words.indexOf(c) < 0) words.push(c); }); });
    const clipBtn = i => { const l = song.lines[i]; return url && l.t != null ? cbtn(url, l.t, lineEnd(song, i)) : pbtn(l.ko, 'f'); };
    const fill = shuffle(idx.filter(i => song.lines[i].ko.split(' ').some(t => t.replace(PUNCT, '').length >= 2 && HANGUL.test(t)))).slice(0, 6).map(i => {
      const toks = song.lines[i].ko.split(' ');
      const cands = toks.map((t, k) => k).filter(k => toks[k].replace(PUNCT, '').length >= 2 && HANGUL.test(toks[k]));
      const k = cands[Math.floor(Math.random() * cands.length)], ans = toks[k].replace(PUNCT, '');
      const opts = shuffle([ans].concat(shuffle(words.filter(w => w !== ans)).slice(0, 3)));
      return { i: i, k: k, ans: ans, opts: opts };
    });
    const dict = shuffle(idx).slice(0, 3);
    body.innerHTML = '<section class="drill"><h3>听歌填词</h3><p class="tiny">听这一句，选出空着的那个词。</p>' + fill.map((q, n) => {
      const toks = song.lines[q.i].ko.split(' ');
      return '<div class="q" data-fq="' + n + '"><div class="row">' + clipBtn(q.i) + pbtn(song.lines[q.i].ko, 'f', 'sm-play') + '<span class="tiny">念一遍</span></div>' +
        '<div class="qtext" lang="ko" style="margin-top:8px">' + toks.map((t, k) => k === q.k ? '<span class="blank">＿＿＿</span>' + esc(t.slice(t.replace(PUNCT, '').length)) : esc(t)).join(' ') + '</div>' +
        '<div class="choices">' + q.opts.map(o => '<button class="choice" lang="ko" data-o="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div><div class="verdict"></div></div>';
    }).join('') + '</section>' +
      '<section class="drill"><h3>听写</h3><p class="tiny">把听到的歌词打出来，空格和标点不算分。需要电脑装了韩语输入法。</p>' + dict.map((i, n) => '<div class="q" data-dq="' + n + '"><div class="row">' + clipBtn(i) + pbtn(song.lines[i].ko, 'f', 'sm-play') + '<span class="tiny">念一遍</span></div>' +
        '<input class="dict-in" lang="ko" autocomplete="off" spellcheck="false" placeholder="在这里输入韩语"><div class="row" style="margin-top:10px"><button class="btn sm" data-check>检查</button></div><div class="diff"></div><div class="verdict"></div></div>').join('') + '</section>';
    $$('[data-fq]', body).forEach(box => {
      const q = fill[+box.dataset.fq], l = song.lines[q.i], gl = songGloss(song, l.ko);
      $$('.choice', box).forEach(c => c.onclick = () => {
        const right = c.dataset.o === q.ans;
        $$('.choice', box).forEach(x => { x.disabled = true; if (x.dataset.o === q.ans) x.classList.add('right'); });
        if (!right) c.classList.add('wrong');
        const v = $('.verdict', box);
        v.className = 'verdict ' + (right ? 'good' : 'bad');
        v.innerHTML = (right ? '答对了。' : '答案是 <span lang="ko">' + esc(q.ans) + '</span>。') + '整句：<span lang="ko">' + esc(l.ko) + '</span>' + (gl.zh ? '，' + esc(gl.zh) : '');
      });
    });
    $$('[data-dq]', body).forEach(box => {
      const l = song.lines[dict[+box.dataset.dq]], gl = songGloss(song, l.ko), inp = $('input', box);
      const go = () => {
        if (!inp.value.trim()) { inp.focus(); return; }
        const r = diff(l.ko, inp.value);
        $('.diff', box).innerHTML = r.html;
        const v = $('.verdict', box);
        v.className = 'verdict ' + (r.exact ? 'good' : 'bad');
        v.innerHTML = (r.exact ? '完全正确。' : '红色波浪线是漏掉或写错的字，灰色删除线是多写的。') + ' 原句：<span lang="ko">' + esc(l.ko) + '</span>' + (gl.zh ? '，' + esc(gl.zh) : '');
      };
      $('[data-check]', box).onclick = go;
      inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    });
  }

  route();
})();
