// 動画1本ぶんの入力データ定義。JSONを差し替えるだけで何タイプでも生成できる(将来100種対応)。
// 新フィールドは必ずオプショナルで足すこと(既存JSONを壊さない=OCP)。

/** 4軸のスコア(0..100)。サイトの判定結果(勝ち側の%)をそのまま入れる */
export type AxisScores = {
  place: number; // 場所感(みんな/ひとり)
  core: number; // 刺さる核(歌詞/音)
  immersion: number; // のめり込み(熱狂/ゆるり)
  discover: number; // 探し方(王道/開拓)
};

/** 動画生成の入力。data/*.json がこの形 */
export type VideoData = {
  /** タイプ名(表示用) 例: ライブハウス魂型 */
  type: string;
  /** 4文字コード 例: FSDM */
  code: string;
  /** キャッチコピー(1文字ずつ表示される) */
  catch: string;
  /** キャラ画像(public/からの相対パス) 例: types/FSDM.webp */
  image: string;
  /** タイプカラー(背景・バーに使う) */
  color: string;
  /** 4軸スコア */
  axis: AxisScores;
  /** ハッシュタグ(#は不要)。Scene4にピル表示 */
  hashtags: string[];
  /** ニックネーム(パーソナル動画用)。あればScene1が「◯◯さんは…」になる */
  nickname?: string;
  /** 診断サイトURL(QR・文言用)。省略時は既定URL */
  siteUrl?: string;
  /** QR画像(public/からの相対パス)。省略時は qr.png */
  qrImage?: string;
  // ---- 将来拡張(未実装でもJSONに足して安全) ----
  /** おすすめプレイリスト(曲名/アーティスト) */
  playlist?: {title: string; artist: string}[];
  /** Spotify/Apple Music等の埋め込みID */
  spotifyId?: string;
  appleMusicId?: string;
  /** アーティスト画像・週間ランキング・相性/恋愛診断などの拡張データ */
  extras?: Record<string, unknown>;
};

export const DEFAULT_SITE_URL = 'https://eo8883494-png.github.io/ototype/';

/** 軸キー→日本語ラベル(表示順もこの順) */
export const AXIS_LABELS: {key: keyof AxisScores; label: string}[] = [
  {key: 'place', label: '場所感'},
  {key: 'core', label: '刺さる核'},
  {key: 'immersion', label: 'のめり込み'},
  {key: 'discover', label: '探し方'},
];

/** 実行時バリデーション。壊れたJSONを黙ってレンダリングしない */
export function validateVideoData(d: unknown): VideoData {
  const o = d as Partial<VideoData>;
  const fail = (msg: string): never => {
    throw new Error(`VideoData不正: ${msg}`);
  };
  if (!o || typeof o !== 'object') fail('オブジェクトではありません');
  if (typeof o.type !== 'string' || !o.type) fail('type がありません');
  if (typeof o.code !== 'string' || !/^[A-Z]{4}$/.test(o.code)) fail('code は4文字の英大文字です');
  if (typeof o.catch !== 'string') fail('catch がありません');
  if (typeof o.image !== 'string') fail('image がありません');
  if (typeof o.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(o.color)) fail('color は#RRGGBB形式です');
  if (!o.axis || typeof o.axis !== 'object') fail('axis がありません');
  for (const {key} of AXIS_LABELS) {
    const v = (o.axis as AxisScores)[key];
    if (typeof v !== 'number' || v < 0 || v > 100) fail(`axis.${key} は0..100の数値です`);
  }
  if (!Array.isArray(o.hashtags)) fail('hashtags は配列です');
  return o as VideoData;
}
