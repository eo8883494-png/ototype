// 相性リンク(またはURLクエリ)から「その人の実測スコア入り」パーソナル動画用JSONを作る。
//   node scripts/from-link.mjs "https://.../ototype/index.html?a=01230123012301230123&v=2&n=太郎"
//   node scripts/from-link.mjs "<URL>" --render   ← JSON生成後そのままレンダリング
// 仕組み: リンクの a= には20問の回答が全部入っている → サイトと同じ scoring.mjs で判定し、
// 4軸の勝ち側%(結果画面と同じ計算)を axis に埋める。サイト改修不要で誰の結果でも動画化できる。
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.resolve(ROOT, '..');

const {judge, AXES, AXIS_MAX} = await import(pathToFileURL(path.join(SITE, 'scoring.mjs')).href);
const QUESTIONS = JSON.parse(readFileSync(path.join(SITE, 'data', 'questions.json'), 'utf-8'));
const TYPES = JSON.parse(readFileSync(path.join(SITE, 'data', 'types.json'), 'utf-8'));

// ---- 引数 ----
const arg = process.argv[2];
if (!arg) {
  console.error('使い方: node scripts/from-link.mjs "<相性リンクURL>" [--render]');
  process.exit(1);
}
const doRender = process.argv.includes('--render');

// ---- リンク解析(完全URLでも ?a=... だけでも受ける) ----
const qs = arg.includes('?') ? arg.slice(arg.indexOf('?') + 1) : arg;
const p = new URLSearchParams(qs);
const a = p.get('a') ?? '';
const nick = (p.get('n') ?? '').slice(0, 20);
if (!new RegExp(`^[0-6]{${QUESTIONS.length}}$`).test(a)) {
  console.error(`回答列(a=)が不正です: 0-6の${QUESTIONS.length}桁が必要`);
  process.exit(1);
}
const answers = [...a].map(Number);

// ---- 判定(サイトと同一ロジック) ----
const r = judge(answers, QUESTIONS);
const t = TYPES[r.code];

// 結果画面(renderAxes)と同じ「勝ち側%」の計算
const winPct = (axisId) => {
  const total = r.totals[axisId];
  const posPct = Math.round(((total + AXIS_MAX) / (AXIS_MAX * 2)) * 100);
  return total >= 0 ? posPct : 100 - posPct;
};
// サイトの軸ID → 動画スキーマのキー
const axis = {
  place: winPct('place'),
  core: winPct('core'),
  immersion: winPct('into'),
  discover: winPct('find'),
};

const data = {
  type: t.name,
  code: r.code,
  catch: t.catch,
  image: `types/${r.code}.webp`,
  color: t.color,
  axis,
  hashtags: (t.keywords ?? []).slice(0, 3),
  ...(nick ? {nickname: nick} : {}),
};

// ---- 保存 ----
const safeNick = nick ? nick.replace(/[\\/:*?"<>|\s]/g, '') : '';
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const name = `personal_${r.code}${safeNick ? '_' + safeNick : ''}_${stamp}`;
mkdirSync(path.join(ROOT, 'data', 'personal'), {recursive: true});
const rel = path.join('data', 'personal', `${name}.json`);
writeFileSync(path.join(ROOT, rel), JSON.stringify(data, null, 2), 'utf-8');
console.log(`生成: ${rel}`);
console.log(`  ${nick || '(名前なし)'} → ${r.code} ${t.name} / 軸% place=${axis.place} core=${axis.core} immersion=${axis.immersion} discover=${axis.discover}`);

// ---- そのままレンダリング ----
if (doRender) {
  const res = spawnSync('node', ['scripts/render.mjs', rel], {cwd: ROOT, stdio: 'inherit'});
  process.exit(res.status ?? 0);
} else {
  console.log(`レンダリング: npm run render -- ${rel.replace(/\\/g, '/')}`);
}
