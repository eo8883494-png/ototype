// シーン構成の単一情報源。シーンの追加・入替はここと scenes/ の追加だけで済む(既存コード非改変)。
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** 8秒 = 240フレーム */
export const DURATION_IN_FRAMES = 8 * FPS;

/** 各シーンの開始フレームと長さ。TikTokネイティブなテンポ(0.5〜2秒刻み) */
export const SCENES = {
  intro: {from: 0, duration: 1 * FPS}, // 0-1秒: フック
  type: {from: 1 * FPS, duration: 2 * FPS}, // 1-3秒: タイプ発表
  status: {from: 3 * FPS, duration: 3 * FPS}, // 3-6秒: ステータス
  outro: {from: 6 * FPS, duration: 2 * FPS}, // 6-8秒: CTA
} as const;
