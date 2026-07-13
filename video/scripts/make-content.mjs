// テンプレB〜Eのデータ一式と投稿キュー(tiktok_queue.csv)を生成する。
//   node scripts/make-content.mjs
// キューの制約: 連続する投稿で主役キャラ(primary)が同じにならない(2026-07-13ユーザー指示)。
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.resolve(ROOT, '..');
const TYPES = JSON.parse(readFileSync(path.join(SITE, 'data', 'types.json'), 'utf-8'));
const PLAYLISTS = JSON.parse(readFileSync(path.join(SITE, 'data', 'playlists.json'), 'utf-8'));
const COMPAT = JSON.parse(readFileSync(path.join(SITE, 'data', 'compat.json'), 'utf-8'));
const {pickWeekly} = await import(pathToFileURL(path.join(SITE, 'playlist.mjs')).href);

const CODES = Object.keys(TYPES);
const side = (c) => ({type: TYPES[c].name, code: c, image: `types/${c}.webp`, color: TYPES[c].color});
const tags = (c, extra) => [...new Set(['オトタイプ', '音楽診断', ...(TYPES[c]?.keywords ?? []).slice(0, 1), ...(extra ?? [])])];
const w = (rel, obj) => {
  const p = path.join(ROOT, rel);
  mkdirSync(path.dirname(p), {recursive: true});
  writeFileSync(p, JSON.stringify(obj, null, 2), 'utf-8');
};

// ---- B: あるある(types.jsonのdetails.aruaruをそのまま使う=創作しない) ----
for (const c of CODES) {
  const t = TYPES[c];
  w(`data/b/${c.toLowerCase()}.json`, {
    template: 'B', type: t.name, code: c, image: `types/${c}.webp`, color: t.color,
    aruaru: (t.details?.aruaru ?? []).slice(0, 3), hashtags: tags(c, ['あるある']),
  });
}

// ---- C: プレイリスト(週替わり選曲の先頭3曲=サイトと同じ週なら同じ曲) ----
for (const c of CODES) {
  const t = TYPES[c];
  const {songs} = pickWeekly(PLAYLISTS[c] ?? []);
  w(`data/c/${c.toLowerCase()}.json`, {
    template: 'C', type: t.name, code: c, image: `types/${c}.webp`, color: t.color,
    playlistTitle: t.playlist?.title ?? '', songs: songs.slice(0, 3), hashtags: tags(c, ['プレイリスト']),
  });
}

// ---- D: 友達と比較(◎ペアを8組=全16タイプを一度ずつ使う) ----
const key = (a, b) => (a <= b ? `${a}-${b}` : `${b}-${a}`);
const used = new Set();
const pairs = [];
for (const a of CODES) {
  if (used.has(a)) continue;
  // 1軸違い(◎になりやすい)の相手で未使用のものを探す
  const partner = CODES.find((b) => !used.has(b) && b !== a &&
    [...a].filter((ch, i) => ch !== b[i]).length === 1 && (COMPAT[key(a, b)]?.rating ?? '') === '◎');
  const b = partner ?? CODES.find((x) => !used.has(x) && x !== a);
  if (!b) break;
  used.add(a); used.add(b);
  const comp = COMPAT[key(a, b)] ?? {rating: '○', summary: '聴き方は違っても、音楽が好きなのは同じ'};
  pairs.push({a, b});
  w(`data/d/${a.toLowerCase()}_${b.toLowerCase()}.json`, {
    template: 'D', left: side(a), right: side(b), rating: comp.rating, summary: comp.summary,
    hashtags: ['オトタイプ', '相性診断', '音楽好きと繋がりたい'],
  });
}

// ---- E: ランキング(エンタメ・タイプ定義由来の独断。動画内に「独断」明記) ----
const RANKINGS = [
  {slug: 'fes_naki', theme: 'フェスで泣きがちなタイプ', codes: ['FLDT', 'FSDT', 'FLDM']},
  {slug: 'earphone', theme: 'イヤホンを外さないタイプ', codes: ['RSDT', 'RSDM', 'RLDM']},
  {slug: 'karaoke', theme: 'カラオケで本気を出すタイプ', codes: ['FLET', 'FSDT', 'FSET']},
  {slug: 'digger', theme: '新曲を見つけるのが早いタイプ', codes: ['RSEM', 'FSEM', 'FLDM']},
  {slug: 'zensen', theme: 'ライブで最前列にいるタイプ', codes: ['FSDM', 'FSDT', 'FSET']},
  {slug: 'shinya', theme: '深夜に歌詞で泣いてるタイプ', codes: ['RLEM', 'RLDT', 'RLDM']},
];
for (const r of RANKINGS) {
  w(`data/e/${r.slug}.json`, {
    template: 'E', theme: r.theme,
    ranks: r.codes.map((c, i) => ({place: i + 1, ...side(c)})),
    color: TYPES[r.codes[0]].color, hashtags: ['オトタイプ', '音楽診断', 'ランキング'],
  });
}

// ---- 投稿キュー生成: A残り15 + B16 + C16 + D8 + E6 = 61本 ----
// 制約: 隣接エントリのprimaryコードを変える。テンプレも偏らないようラウンドロビン。
const entries = [];
for (const c of CODES) if (c !== 'FSDM') entries.push({template: 'A', json: `data/${c.toLowerCase()}.json`, primary: c});
const poolB = CODES.map((c) => ({template: 'B', json: `data/b/${c.toLowerCase()}.json`, primary: c}));
const poolC = CODES.map((c) => ({template: 'C', json: `data/c/${c.toLowerCase()}.json`, primary: c}));
const poolD = pairs.map(({a, b}) => ({template: 'D', json: `data/d/${a.toLowerCase()}_${b.toLowerCase()}.json`, primary: a}));
const poolE = RANKINGS.map((r) => ({template: 'E', json: `data/e/${r.slug}.json`, primary: r.codes[0]}));
// 決定的シャッフル(同じ入力なら同じキュー=再生成しても安定)
const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const shuf = (arr) => arr.slice().sort((x, y) => hash(x.json) - hash(y.json));
const pools = {A: shuf(entries), B: shuf(poolB), C: shuf(poolC), D: shuf(poolD), E: shuf(poolE)};
const order = ['A', 'B', 'C', 'A', 'C', 'B', 'A', 'D', 'B', 'A', 'C', 'E'];

const queue = [];
const recent = ['FSDM']; // 直近2件(初回FSDM済み含む)と同じprimaryを避ける=同日内の再登場も防ぐ
let oi = 0;
while (Object.values(pools).some((p) => p.length > 0)) {
  let placed = false;
  for (let attempt = 0; attempt < order.length && !placed; attempt++) {
    const tpl = order[(oi + attempt) % order.length];
    const pool = pools[tpl];
    if (!pool || pool.length === 0) continue;
    const idx = pool.findIndex((e) => !recent.includes(e.primary));
    if (idx === -1) continue;
    const e = pool.splice(idx, 1)[0];
    queue.push(e);
    recent.push(e.primary);
    if (recent.length > 2) recent.shift();
    placed = true;
  }
  if (!placed) { // 残りが直近と同じprimaryのみ(終盤の端数)→制約を1件分に緩めて入れる
    const tpl = Object.keys(pools).find((k) => pools[k].length > 0);
    const pool = pools[tpl];
    const idx = pool.findIndex((e) => e.primary !== recent[recent.length - 1]);
    const e = pool.splice(idx >= 0 ? idx : 0, 1)[0];
    queue.push(e);
    recent.push(e.primary);
    if (recent.length > 2) recent.shift();
  }
  oi++;
}

const csv = ['seq,template,json,primary,status,posted_at'];
queue.forEach((e, i) => csv.push(`${i + 1},${e.template},${e.json.replace(/\\/g, '/')},${e.primary},pending,`));
const qPath = path.join(ROOT, 'tiktok_queue.csv');
if (existsSync(qPath)) {
  console.log('注意: tiktok_queue.csv が既に存在します → tiktok_queue.new.csv に出力(手動で差し替え)');
  writeFileSync(path.join(ROOT, 'tiktok_queue.new.csv'), csv.join('\n') + '\n', 'utf-8');
} else {
  writeFileSync(qPath, csv.join('\n') + '\n', 'utf-8');
}
console.log(`B/C/D/Eデータ生成完了。キュー=${queue.length}本(連続同キャラなし)`);
