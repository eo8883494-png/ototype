// CLIレンダラー。
//   npm run render                     → data/fsdm.json で1本
//   npm run render -- data/rsdt.json   → 指定JSONで1本
//   npm run render -- --all            → data/*.json 全部
import {spawnSync} from 'node:child_process';
import {readFileSync, readdirSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const targets = args.includes('--all')
  ? readdirSync(path.join(ROOT, 'data'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join('data', f))
  : [args.find((a) => a.endsWith('.json')) ?? 'data/fsdm.json'];

mkdirSync(path.join(ROOT, 'out'), {recursive: true});

// このPCはコミットメモリ上限が厳しく、x264のmallocが散発的に失敗する。
// 対策: 並列1+ultrafastプリセットで省メモリ化し、失敗時は待って自動リトライ(最大3回)。
const RETRIES = 3;
const WAIT_MS = 45_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// JSONの"template"からコンポジションIDを解決(省略時はA=診断結果)
const COMPOSITIONS = {A: 'OtotypeResult', B: 'OtotypeAruaru', C: 'OtotypePlaylist', D: 'OtotypeCompare', E: 'OtotypeRanking'};

const renderOne = (abs, out, compositionId) =>
  spawnSync(
    'npx',
    [
      'remotion', 'render', compositionId, out,
      `--props=${abs}`,
      '--concurrency=1',
      '--x264-preset=ultrafast',
    ],
    {cwd: ROOT, stdio: 'inherit', shell: true}
  );

const failed = [];
for (const rel of targets) {
  const abs = path.resolve(ROOT, rel);
  const data = JSON.parse(readFileSync(abs, 'utf-8')); // 早期バリデーション(壊れたJSONを検出)
  const tpl = data.template ?? 'A';
  const compositionId = COMPOSITIONS[tpl];
  if (!compositionId) { console.error(`不明なtemplate: ${tpl}`); process.exit(1); }
  // 出力名: テンプレ接頭辞+ファイル名(A/fsdm.json→FSDM.mp4、b/fsdm.json→B_FSDM.mp4、personal_*はそのまま)
  const base = path.basename(abs, '.json');
  const name = base.startsWith('personal') ? base : tpl === 'A' ? base.toUpperCase() : `${tpl}_${base.toUpperCase()}`;
  const out = path.join('out', `${name}.mp4`);
  console.log(`\n=== render [${tpl}] ${rel} -> ${out} ===`);
  let ok = false;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const r = renderOne(abs, out, compositionId);
    if (r.status === 0) {
      ok = true;
      break;
    }
    console.error(`attempt ${attempt}/${RETRIES} 失敗(メモリ逼迫の可能性)。${WAIT_MS / 1000}秒待って再試行`);
    await sleep(WAIT_MS);
  }
  if (!ok) {
    console.error(`断念: ${rel}`);
    failed.push(rel);
  }
}
if (failed.length > 0) {
  console.error(`\n未完了: ${failed.join(', ')}`);
  process.exit(1);
}
console.log('\n完了');
