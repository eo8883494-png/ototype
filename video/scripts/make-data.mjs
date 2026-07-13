// サイトの data/types.json から16タイプぶんの動画用JSONを一括生成する。
// タイプが100種に増えても types.json が正なのでこのスクリプトだけで追従できる。
// 注意: axis はサンプル値(タイプ字面から機械的に生成)。本来はユーザーの診断結果で差し替える。
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = JSON.parse(readFileSync(path.join(ROOT, '..', 'data', 'types.json'), 'utf-8'));

mkdirSync(path.join(ROOT, 'data'), {recursive: true});

// コード文字から決定的にそれっぽい%を作る(見栄え用サンプル)
const sampleAxis = (code) => {
  const v = (c, base) => base + (c.charCodeAt(0) % 7) * 3;
  return {
    place: Math.min(100, v(code[0], 82)),
    core: Math.min(100, v(code[1], 68)),
    immersion: Math.min(100, v(code[2], 62)),
    discover: Math.min(100, v(code[3], 55)),
  };
};

let n = 0;
for (const [code, t] of Object.entries(types)) {
  const data = {
    type: t.name,
    code,
    catch: t.catch,
    image: `types/${code}.webp`,
    color: t.color,
    axis: sampleAxis(code),
    // 基本4+タイプ名+タイプ由来2=7個(2026-07-13「ハッシュタグをしっかり・タイプ名も」指示)
    hashtags: [...new Set(['オトタイプ', '音楽診断', '16タイプ診断', '音楽好きな人と繋がりたい', t.name, ...(t.keywords ?? []).slice(0, 2)])],
  };
  writeFileSync(path.join(ROOT, 'data', `${code.toLowerCase()}.json`), JSON.stringify(data, null, 2), 'utf-8');
  n++;
}
console.log(`${n}件のJSONを data/ に生成しました`);
