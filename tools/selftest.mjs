// tools/selftest.mjs — §13-4 セルフテスト（軸ベース・16タイプ）。実行: node tools/selftest.mjs
// 判定ロジックは scoring.mjs を単一の真実源として import（app.js と同じ関数）。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { judge, AXES } from "../scoring.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUESTIONS = JSON.parse(readFileSync(join(ROOT, "data/questions.json"), "utf-8"));
const TYPES = JSON.parse(readFileSync(join(ROOT, "data/types.json"), "utf-8"));
const CODES = Object.keys(TYPES);

let failures = 0;
const fail = (m) => { console.error("NG " + m); failures++; };
const ok = (m) => console.log("OK " + m);

// 0) 構造チェック：16タイプ、各コードが4軸の組み合わせと一致
if (CODES.length === 16) ok("タイプ数 = 16"); else fail(`タイプ数 = ${CODES.length}（16であるべき）`);
for (const code of CODES) {
  const valid = code.length === 4 && AXES.every((ax, i) => code[i] === ax.pos || code[i] === ax.neg);
  if (!valid) fail(`不正なタイプコード: ${code}`);
}

// 1) バランス：ランダム回答 4万回で全16タイプが 2% 以上出現
const N = 40000;
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const counts = Object.fromEntries(CODES.map((c) => [c, 0]));
for (let i = 0; i < N; i++) {
  const answers = QUESTIONS.map(() => Math.floor(rnd() * 2)); // 各問2択
  counts[judge(answers, QUESTIONS).code]++;
}
console.log(`=== balance over ${N} random plays (16 types) ===`);
for (const c of CODES) {
  const pct = (counts[c] / N) * 100;
  const line = `${c} (${TYPES[c].name}): ${counts[c]} = ${pct.toFixed(2)}%`;
  if (pct >= 2) ok(line); else fail(line + "  < 2%");
}

// 2) 回帰（決定的）：全pos極→FLDT / 全neg極→RSEM / 混合→FSDM
console.log("=== regression ===");
const reg = [
  { label: "all-idx0 (pos poles)", ans: Array(QUESTIONS.length).fill(0), code: "FLDT" },
  { label: "all-idx1 (neg poles)", ans: Array(QUESTIONS.length).fill(1), code: "RSEM" },
  { label: "mixed FSDM", ans: [0,0,0,0,0, 1,1,1,1,1, 0,0,0,0,0, 1,1,1,1,1], code: "FSDM" },
];
for (const r of reg) {
  const got = judge(r.ans, QUESTIONS);
  if (got.code === r.code) ok(`${r.label}: code=${got.code}(${TYPES[got.code].name}) closest=${got.closest} pure=${got.pure}`);
  else fail(`${r.label}: expected ${r.code}, got ${got.code}`);
}

// 3) 不変条件
console.log("=== invariants ===");
{
  const r = judge(Array(QUESTIONS.length).fill(0), QUESTIONS);
  if (TYPES[r.code]) ok("判定コードが types.json に存在"); else fail(`未知コード: ${r.code}`);
  try { judge([], QUESTIONS); ok("空回答でも例外なし"); } catch (e) { fail("空回答で例外: " + e.message); }
}

console.log(failures === 0 ? "\nRESULT: ALL PASS" : `\nRESULT: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
