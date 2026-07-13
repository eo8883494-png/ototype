// キャラクター表示(主役)。画像は無加工でscale/translateのみ(アート方針: リサイズ以外の改変禁止)。
import React from 'react';
import {Img, staticFile} from 'remotion';
import {usePop} from '../hooks/usePop';
import {useFloat} from '../hooks/useFloat';

type Props = {
  /** public/からの画像パス 例: types/FSDM.webp */
  image: string;
  /** 表示ボックスの一辺(px)。中に収まるよう等比表示 */
  size: number;
  /** ポップ出現の開始フレーム(負値で無効=常に等倍) */
  popAt?: number;
  /** ふわふわの振れ幅(px)。0で無効 */
  floatAmp?: number;
  /** ジャンプ量(px)。0で無効。popAtからのバネで跳ねる */
  jump?: number;
};

export const Character: React.FC<Props> = ({image, size, popAt = 0, floatAmp = 0, jump = 0}) => {
  const pop = usePop(popAt >= 0 ? popAt : 0, 9);
  const bob = useFloat(floatAmp);
  const scale = popAt >= 0 ? pop : 1;
  const jumpY = jump > 0 ? -Math.abs(Math.sin(pop * Math.PI)) * jump : 0;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${scale}) translateY(${bob + jumpY}px)`,
        filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.25))',
      }}
    >
      <Img
        src={staticFile(image)}
        style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}}
      />
    </div>
  );
};
