/* templates.js — 把每个可替换元素用现在的手绘画成 PNG（2 倍、透明底、正确尺寸），给用户当底稿重画。 */
(() => {
'use strict';
const groups = new Map();
for (const e of Skin.catalog.values()) { if (!groups.has(e.group)) groups.set(e.group, []); groups.get(e.group).push(e); }
const list = document.getElementById('list'), canvases = new Map();
for (const [g, es] of groups) {
  const h = document.createElement('h2'); h.textContent = `${g}（${es.length}）`; list.append(h);
  const grid = document.createElement('div'); grid.className = 'grid'; list.append(grid);
  for (const e of es) {
    const cv = OCTools.renderTemplate(e); canvases.set(e.key, cv);
    const spec = Skin.SPEC[e.kind] || Skin.SPEC.small;
    const card = document.createElement('div'); card.className = 'card' + (Skin.has(e.key) ? ' has' : '');
    const pic = document.createElement('div'); pic.className = 'pic'; pic.append(cv);
    const a = document.createElement('a'); a.textContent = '下载模板'; a.href = '#';
    a.onclick = ev => { ev.preventDefault(); cv.toBlob(b => OCTools.download(b, e.key + '.png')); };
    card.append(pic);
    card.insertAdjacentHTML('beforeend', `<b>${e.label}</b><br><code>${e.key}.png</code><small>${cv.width} × ${cv.height} 像素 · ${spec.label}最大长边 ${spec.px} 像素、${spec.kb} KB${e.fit === 'stretch' ? ' · 会拉伸铺满' : ' · 按比例放，贴底居中'}${e.note ? ' · ' + e.note : ''}</small>`);
    card.append(a); grid.append(card);
  }
}
document.getElementById('count').textContent = `一共 ${Skin.catalog.size} 个可以换的东西`;

document.getElementById('zip').onclick = async () => {
  const btn = document.getElementById('zip'); btn.disabled = true; btn.textContent = '打包中……';
  const files = [];
  for (const [key, cv] of canvases) files.push({ name: `${Skin.catalog.get(key).group}/${key}.png`, data: await new Promise(r => cv.toBlob(r)) });
  const lines = [...Skin.catalog.values()].map(e => `${e.key}.png\t${canvases.get(e.key).width}×${canvases.get(e.key).height}\t${e.label}`);
  files.push({ name: '说明.txt', data: '文件名\t尺寸（像素）\t是什么\n' + lines.join('\n') + '\n\n画好后：打开 studio.html（工作站）上传；或者文件名不变放进 theme/images/，再把文件名写进 theme/theme.json 的 "images" 列表。\n' });
  OCTools.download(await OCTools.zip(files), `${THEME.id}-素材模板.zip`);
  btn.disabled = false; btn.textContent = '下载全部模板（zip）';
};
})();
