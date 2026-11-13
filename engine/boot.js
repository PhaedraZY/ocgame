/* boot.js — 读主题包（theme/*.json）→ 放进 window.THEME → 按顺序加载引擎脚本。
   换 OC / 换风格：只改 theme/ 里的 JSON 和图片，不用动代码。
   网址带 ?studio 时，再叠加工作站（studio.html）里还没导出的草稿（存在浏览器 IndexedDB 里）。
   脚本名前面带 @ 的在引擎文件夹（engine/，所有 OC 共用）；不带的在 OC 自己的文件夹（比如这个 OC 的手绘 art.js）。 */
(() => {
'use strict';
const V = 28;                                    // bump on every change (cache busting for JSON + scripts)
const BASE = 'theme/';
const ENGINE = new URL('.', document.currentScript.src).href;     // folder this boot.js lives in
const SCRIPTS = window.BOOT_SCRIPTS || ['@sketch.js', '@skin.js', 'art.js', '@bgm.js', '@game.js', 'home-art.js', '@home.js', '@mobile.js'];
const srcOf = s => s.startsWith('@') ? ENGINE + s.slice(1) : s;
const get = f => fetch(`${BASE}${f}?v=${V}`).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
const USE_DRAFT = window.BOOT_DRAFT || /[?&]studio\b/.test(location.search);

/* the studio's draft store: { id, theme: {theme.json fields}, files: {dishes: […], …}, images: {key: Blob}, audio: {shop: Blob} } */
const Draft = {
  db: () => new Promise((ok, bad) => { const r = indexedDB.open('oc-studio', 1); r.onupgradeneeded = () => r.result.createObjectStore('drafts'); r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); }),
  async get(id) { const db = await this.db(); return new Promise(ok => { const q = db.transaction('drafts').objectStore('drafts').get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); },
  async put(id, v) { const db = await this.db(); return new Promise((ok, bad) => { const t = db.transaction('drafts', 'readwrite'); t.objectStore('drafts').put(v, id); t.oncomplete = ok; t.onerror = () => bad(t.error); }); },
  async del(id) { const db = await this.db(); return new Promise(ok => { const t = db.transaction('drafts', 'readwrite'); t.objectStore('drafts').delete(id); t.oncomplete = ok; t.onerror = ok; }); },
};
window.OCDraft = Draft;

const loadImg = src => new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });

async function boot() {
  const theme = await get('theme.json');
  const files = theme.files || {};
  const parts = await Promise.all(Object.entries(files).map(async ([k, f]) => [k, await get(f)]));
  for (const [k, v] of parts) theme[k] = v;
  theme._base = { ...theme };           // what's in the repo, before any draft
  // theme images (key → file): preload so drawings can use them synchronously; a missing file just falls back to hand drawing
  theme._images = {};
  // "images" is either { key: file } or a list of files named after their key ("shop.fridge.png" → shop.fridge), all inside theme/images/
  const list = Array.isArray(theme.images) ? theme.images.map(f => [f.replace(/\.(png|webp|jpe?g)$/i, ''), 'images/' + f]) : Object.entries(theme.images || {});
  await Promise.all(list.map(async ([k, f]) => {
    const im = await loadImg(`${BASE}${f}?v=${V}`);
    if (im) theme._images[k] = im; else console.warn('主题图片读取失败：', k, f);
  }));
  if (USE_DRAFT) await applyDraft(theme);
  window.THEME = theme;
  applyPage(theme);
  applyUI(theme);
  for (const s of SCRIPTS) await new Promise((ok, bad) => {
    const el = document.createElement('script'); el.src = `${srcOf(s)}?v=${V}`; el.onload = ok; el.onerror = () => bad(new Error(s));
    document.body.appendChild(el);
  });
}
async function applyDraft(theme) {
  const d = await Draft.get(theme.id).catch(() => null); if (!d) return;
  theme._draft = d;
  Object.assign(theme, d.theme || {});
  for (const [k, v] of Object.entries(d.files || {})) theme[k] = v;
  for (const k of d.removed || []) delete theme._images[k];
  await Promise.all(Object.entries(d.images || {}).map(async ([k, blob]) => {
    const url = URL.createObjectURL(blob);
    if (k.startsWith('oc.')) { theme.oc = { ...theme.oc, [k.slice(3)]: url }; return; }
    const im = await loadImg(url); if (im) theme._images[k] = im;
  }));
  for (const [k, blob] of Object.entries(d.audio || {})) theme.audio = { ...theme.audio, [k]: URL.createObjectURL(blob) };
}

/* page text + images marked in index.html with data-t="a.b" / data-img="a.b" */
const at = (o, path) => path.split('.').reduce((v, k) => v == null ? v : v[k], o);
function applyPage(t) {
  if (t.page?.title) document.title = t.page.title;
  const desc = document.querySelector('meta[name="description"]'); if (desc && t.page?.description) desc.content = t.page.description;
  document.querySelectorAll('[data-t]').forEach(el => { const v = at(t, el.dataset.t); if (typeof v === 'string') el.textContent = v; });
  document.querySelectorAll('[data-img]').forEach(el => { const v = at(t, el.dataset.img); if (v) el.src = v; });
}

/* page UI: theme.ui.colors / fonts are CSS variables (--line, --paper, --f-hand …); images named ui.<name> become --ui-<name> */
function applyUI(t) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries({ ...(t.ui?.colors || {}), ...(t.ui?.fonts || {}) })) root.style.setProperty(k.startsWith('--') ? k : '--' + k, v);
  for (const [k, im] of Object.entries(t._images)) if (k.startsWith('ui.')) {
    const n = k.slice(3).replace(/\./g, '-');
    root.style.setProperty('--ui-' + n, `url("${im.src}")`); root.classList.add('skin-' + n);
  }
}

boot().catch(e => {
  console.error(e);
  document.body.insertAdjacentHTML('afterbegin', `<p style="padding:12px;background:#fde;color:#844;font:14px sans-serif">主题包读取失败：${e.message}（需要用本地服务器或线上地址打开，不能直接双击 html）</p>`);
});
})();
