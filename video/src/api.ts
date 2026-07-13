// プログラムから動画を生成するNode API。generateVideo(data) の1関数で完結する。
// CLI(scripts/render.mjs)とは独立しており、将来サーバー/バッチから呼べる。
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {validateVideoData, type VideoData} from './data/schema';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'src', 'index.ts');

let cachedBundle: string | null = null;

/** Webpackバンドルを1回だけ作って使い回す(連続レンダリングの高速化) */
async function getBundle(): Promise<string> {
  if (!cachedBundle) {
    cachedBundle = await bundle({entryPoint: ENTRY});
  }
  return cachedBundle;
}

/**
 * 動画を生成して出力パスを返す。
 * @param data 動画データ(JSONそのまま)
 * @param outPath 省略時は out/{code}.mp4
 */
export async function generateVideo(data: VideoData, outPath?: string): Promise<string> {
  const valid = validateVideoData(data);
  const serveUrl = await getBundle();
  const composition = await selectComposition({
    serveUrl,
    id: 'OtotypeResult',
    inputProps: valid,
  });
  const outputLocation = outPath ?? path.join(ROOT, 'out', `${valid.code}.mp4`);
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    outputLocation,
    inputProps: valid,
    concurrency: 2, // 低メモリ環境向け。余裕があれば上げてよい
  });
  return outputLocation;
}

/** generateVideoの別名(仕様互換用) */
export const renderVideo = generateVideo;

/** 出力先を明示するエクスポート用API */
export async function exportVideo(data: VideoData, outPath: string): Promise<string> {
  return generateVideo(data, outPath);
}
