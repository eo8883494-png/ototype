// tools/selftest.mjs — セルフテスト（軸ベース・16タイプ・7段階同意スケール）。実行: node tools/selftest.mjs
// 判定ロジックは scoring.mjs を単一の真実源として import（app.js と同じ関数）。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { judge, AXES, SCALE } from "../scoring.mjs";

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
}
for (const ax of AXES) {
  const n = QUESTIONS.filter((q) => q.axis === ax.id).length;
  if (n === 5) ok(`軸 ${ax.id}: 5問`); else fail(`軸 ${ax.id}: ${n}問（5であるべき）`);
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
