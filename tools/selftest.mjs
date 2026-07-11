// tools/selftest.mjs — セルフテスト（軸ベース・16タイプ・7段階同意スケール）。実行: node tools/selftest.mjs
// 判定ロジックは scoring.mjs を単一の真実源として import（app.js と同じ関数）。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { judge, AXES, SCALE } from "../scoring.mjs";
import { pickWeekly, SHOW_N } from "../playlist.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUESTIONS = JSON.parse(readFileSync(join(ROOT, "data/questions.json"), "utf-8"));
const TYPES = JSON.parse(readFileSync(join(ROOT, "data/types.json"), "utf-8"));
const CODES = Object.keys(TYPES);

let failures = 0;
const fail = (m) => { console.error("NG " + m); failures++; };
const ok = (m) => console.log("OK " + m);

// 0) 構造チェック：16タイプ、各コードが4軸の組み合わせと一致、各軸5問、全タイプにplaylist
if (CODES.length === 16) ok("タイプ数 = 16"); else fail(`タイプ数 = ${CODES.length}（16であるべき）`);
for (const code of CODES) {
  const valid = code.length === 4 && AXES.every((ax, i) => code[i] === ax.pos || code[i] === ax.neg);
  if (!valid) fail(`不正なタイプコード: ${code}`);
  if (!TYPES[code].playlist || !TYPES[code].playlist.title || TYPES[code].playlist.recipe.length !== 3) fail(`playlist不備: ${code}`);
  const d = TYPES[code].details;
  if (!d || d.intro.length < 180 || d.aruaru.length !== 3 || d.live.length < 50 || d.strength.length < 50) fail(`details不備: ${code}`);
}
for (const ax of AXES) {
  const n = QUESTIONS.filter((q) => q.axis === ax.id).length;
  if (n === 5) ok(`軸 ${ax.id}: 5問`); else fail(`軸 ${ax.id}: ${n}問（5であるべき）`);
}
{ // キャライラスト: 全16タイプ分の assets/chars/{code}.webp が存在する
  const missing = CODES.filter((c) => !existsSync(join(ROOT, "assets/chars", c + ".webp")));
  if (missing.length === 0) ok("キャライラスト: 16体すべて存在(assets/chars/*.webp)"); else fail("キャライラスト欠落: " + missing.join(","));
}
{ // 週替わりプレイリスト: 構造(16タイプ×12曲以上・曲名/アーティスト必須・プール内重複なし)
  const PL = JSON.parse(readFileSync(join(ROOT, "data/playlists.json"), "utf-8"));
  for (const c of CODES) {
    const pool = PL[c];
    if (!pool || pool.length < 12) { fail(`playlists: ${c} が12曲未満`); continue; }
    if (!pool.every((s) => s.t && s.a)) fail(`playlists: ${c} にt/a欠落`);
    if (new Set(pool.map((s) => s.t + "/" + s.a)).size !== pool.length) fail(`playlists: ${c} にプール内重複`);
  }
  ok("playlists: 16タイプ×12曲以上・重複なし");
  // 選曲: 10曲・重複なし・決定的・週が変われば選曲/並びが変わる
  const pool = PL["FLDT"];
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const a1 = pickWeekly(pool, now), a2 = pickWeekly(pool, now + 1000);
  const b = pickWeekly(pool, now + WEEK), c2 = pickWeekly(pool, now + 2 * WEEK);
  const key = (r) => r.songs.map((s) => s.t).join("|");
  if (a1.songs.length === SHOW_N && new Set(a1.songs.map((s) => s.t)).size === SHOW_N) ok(`pickWeekly: ${SHOW_N}曲・重複なし`); else fail("pickWeekly: 曲数/重複NG");
  if (key(a1) === key(a2)) ok("pickWeekly: 同一週は同一選曲(決定的)"); else fail("pickWeekly: 同一週で選曲が揺れる");
  if (key(a1) !== key(b) && key(b) !== key(c2)) ok("pickWeekly: 週が変わると選曲/並びが変わる"); else fail("pickWeekly: 週替わりで変化しない");
}

// 1) バランス：ランダム回答 4万回で全16タイプが 2% 以上出現
const N = 40000;
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const counts = Object.fromEntries(CODES.map((c) => [c, 0]));
for (let i = 0; i < N; i++) {
  const answers = QUESTIONS.map(() => Math.floor(rnd() * SCALE)); // 各問7段階
  counts[judge(answers, QUESTIONS).code]++;
}
console.log(`=== balance over ${N} random plays (16 types) ===`);
for (const c of CODES) {
  const pct = (counts[c] / N) * 100;
  const line = `${c} (${TYPES[c].name}): ${counts[c]} = ${pct.toFixed(2)}%`;
  if (pct >= 2) ok(line); else fail(line + "  < 2%");
}

// 2) 回帰（決定的）：
//    全問「そう思う」(idx0) → 各軸 dir(+,-,+,-,+)×3 = +3 → 全pos極 = FLDT
//    全問「そう思わない」(idx6) → 各軸 -3 → 全neg極 = RSEM
//    全問 中立(idx3) → 全軸0 → 同点は pos極 = FLDT（margins全0）
console.log("=== regression ===");
const reg = [
  { label: "all-agree (idx0)",    ans: Array(QUESTIONS.length).fill(0), code: "FLDT" },
  { label: "all-disagree (idx6)", ans: Array(QUESTIONS.length).fill(6), code: "RSEM" },
  { label: "all-neutral (idx3)",  ans: Array(QUESTIONS.length).fill(3), code: "FLDT" },
];
for (const r of reg) {
  const got = judge(r.ans, QUESTIONS);
  if (got.code === r.code) ok(`${r.label}: code=${got.code}(${TYPES[got.code].name}) closest=${got.closest} pure=${got.pure}`);
  else fail(`${r.label}: expected ${r.code}, got ${got.code}`);
}
// 極端回答：pos方向へ最大回答（dir=+1はidx0、dir=-1はidx6）→ FLDT・全margin=15・pure
{
  const ans = QUESTIONS.map((q) => (q.dir === 1 ? 0 : 6));
  const got = judge(ans, QUESTIONS);
  if (got.code === "FLDT" && got.pure && AXES.every((ax) => got.margins[ax.id] === 15)) ok("max-pos: FLDT・全margin15・pure");
  else fail(`max-pos: code=${got.code} pure=${got.pure} margins=${JSON.stringify(got.margins)}`);
}

// 3) 不変条件
console.log("=== invariants ===");
{
  const r = judge(Array(QUESTIONS.length).fill(0), QUESTIONS);
  if (TYPES[r.code]) ok("判定コードが types.json に存在"); else fail(`未知コード: ${r.code}`);
  try { judge([], QUESTIONS); ok("空回答でも例外なし"); } catch (e) { fail("空回答で例外: " + e.message); }
  try { judge(Array(QUESTIONS.length).fill(99), QUESTIONS); ok("範囲外回答でも例外なし"); } catch (e) { fail("範囲外回答で例外: " + e.message); }
}

console.log(failures === 0 ? "\nRESULT: ALL PASS" : `\nRESULT: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
