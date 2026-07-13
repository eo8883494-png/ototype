// タイプカラーの背景。ゆっくり動く大きな円でパララックス感を出す。
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {darken, lighten} from '../utils/color';

type Props = {
  /** タイプカラー(#RRGGBB) */
  color: string;
  /** パララックスの動き幅(px)。0で静止 */
  drift?: number;
};

export const Background: React.FC<Props> = ({color, drift = 40}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  // 背景の大円は前景より遅く動く=パララックス
  const y1 = Math.sin(t * 0.5) * drift;
  const y2 = Math.cos(t * 0.4) * drift * 0.6;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${lighten(color, 0.16)} 0%, ${color} 55%, ${darken(color, 0.18)} 100%)`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 1400,
          height: 1400,
          borderRadius: '50%',
          background: lighten(color, 0.24),
          opacity: 0.35,
          left: -420,
          top: -560 + y1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          borderRadius: '50%',
          background: darken(color, 0.12),
          opacity: 0.3,
          right: -380,
          bottom: -460 + y2,
        }}
      />
    </AbsoluteFill>
  );
};
