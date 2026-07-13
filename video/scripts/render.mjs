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

for (const rel of targets) {
  const abs = path.resolve(ROOT, rel);
  const data = JSON.parse(readFileSync(abs, 'utf-8'));
  const out = path.join('out', `${data.code}.mp4`);
  console.log(`\n=== render ${rel} -> ${out} ===`);
  const r = spawnSync(
    'npx',
    [
      'remotion', 'render', 'OtotypeResult', out,
      `--props=${abs}`,
      '--concurrency=2', // 低メモリ環境対策(必要なら上げる)
    ],
    {cwd: ROOT, stdio: 'inherit', shell: true}
  );
  if (r.status !== 0) {
    console.error(`失敗: ${rel}`);
    process.exit(r.status ?? 1);
  }
}
console.log('\n完了');
