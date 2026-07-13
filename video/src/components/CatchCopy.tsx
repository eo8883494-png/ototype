// キャッチコピーを1文字ずつポップ表示する(タイプライター+バネ)。
import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../utils/font';

type Props = {
  text: string;
  size: number;
  color?: string;
  /** 出現開始フレーム(シーン内) */
  delay?: number;
  /** 1文字あたりの間隔(フレーム) */
  stagger?: number;
};

export const CatchCopy: React.FC<Props> = ({text, size, color = '#FFFFFF', delay = 0, stagger = 3}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chars = [...text];
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        color,
        display: 'flex',
        justifyContent: 'center',
        textShadow: '0 4px 18px rgba(0,0,0,0.25)',
      }}
    >
      {chars.map((c, i) => {
        const s = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: {damping: 10, stiffness: 160, mass: 0.5},
        });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `scale(${s}) translateY(${(1 - s) * 30}px)`,
              opacity: Math.min(1, s * 1.5),
              whiteSpace: 'pre',
            }}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
};
