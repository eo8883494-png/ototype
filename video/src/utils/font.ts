// サイト(index.html)と同じ M PLUS Rounded 1c をローカルTTFで読み込む。
// Google Fonts CDN方式は日本語サブセットが238分割リクエストになりタイムアウトするため不採用(2026-07-13教訓)。
// フォントはOFLライセンス(public/fonts/)。
import {continueRender, delayRender, staticFile} from 'remotion';

const FAMILY = 'MPlusRounded1c';

const load = (file: string, weight: string) => {
  const handle = delayRender(`font ${weight}`);
  const face = new FontFace(FAMILY, `url('${staticFile(file)}') format('truetype')`, {weight});
  face
    .load()
    .then((f) => {
      document.fonts.add(f);
      continueRender(handle);
    })
    .catch(() => continueRender(handle)); // 失敗時はフォールバック(Meiryo)で続行
};

load('fonts/MPLUSRounded1c-Bold.ttf', '700');
load('fonts/MPLUSRounded1c-ExtraBold.ttf', '800');

/** 全コンポーネント共通のフォントスタック */
export const FONT = `'${FAMILY}', 'Meiryo', sans-serif`;
