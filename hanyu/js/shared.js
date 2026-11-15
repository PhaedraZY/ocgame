// 浏览器和音频预生成脚本共用：决定每段韩语用谁的声音读
(function (root) {
  // 例句和单词男女声交替，耳朵不只习惯一种嗓音
  function vx(i) { return i % 2 ? 'm' : 'f'; }
  // 单词卡读“原形. 常用形”，例如“먹다. 먹어.”
  function wordSay(w) { return w.say || (w.f && w.f !== w.ko ? w.ko + '. ' + w.f : w.ko); }
  function collect(D) {
    const out = [];
    const add = (t, v) => { if (t) out.push({ t: t, v: v || 'f' }); };
    D.seasons.forEach(s => s.episodes.forEach(e => {
      e.dialogue.forEach(l => add(l.ko, l.v));
      e.vocab.forEach((w, i) => add(wordSay(w), vx(i)));
      e.grammar.forEach(g => g.examples.forEach((x, i) => add(x.ko, vx(i))));
      e.quiz.forEach(q => add(q.say, 'f'));
    }));
    D.packs.forEach(p => p.items.forEach((x, i) => { add(x.say || x.ko, vx(i)); add(x.exSay || x.ex, vx(i + 1)); }));
    D.rules.forEach(r => r.examples.forEach((x, i) => add(x.ko, vx(i))));
    Object.keys(D.gx || {}).forEach(id => D.gx[id].forEach(x => {
      add(x.say, 'f');
      (x.table || []).forEach((r, k) => add(r[2], vx(k)));
      ((x.cmp || {}).rows || []).forEach((c, k) => add(c.ko, vx(k)));
      (x.quiz || []).forEach(q => add(q.say, 'f'));
    }));
    (D.topics || []).forEach(t => {
      const ws = t.groups.reduce((a, g) => a.concat(g.words), []);
      ws.forEach((w, i) => { add(wordSay(w), vx(i)); add(w.ex, vx(i + 1)); add(w.ko, vx(i)); });  // 听写题只读原形
      t.talk.lines.forEach(l => add(l.ko, l.v));
    });
    // 逐词标注里不在词汇表的实词，点开时会单独朗读
    const vocabKeys = {};
    D.seasons.forEach(s => s.episodes.forEach(e => e.vocab.forEach(w => { vocabKeys[w.id || w.ko] = 1; })));
    Object.values(D.gloss || {}).forEach(arr => arr.forEach(str => str.split(' | ').forEach(t => t.split('+').forEach(x => {
      const f = x.split('/');
      if (f[1] && !/^（.*）$/.test(f[1]) && !vocabKeys[f[2] || f[0]]) add(f[0], 'f');
    }))));
    const seen = {};
    return out.filter(x => { const k = x.v + '|' + x.t; return seen[k] ? false : (seen[k] = 1); });
  }
  root.KShared = { vx: vx, wordSay: wordSay, collect: collect };
})(typeof window !== 'undefined' ? window : globalThis);
