// 汎用テキスト。出現アニメーション(pop/fade)をprops化。
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {usePop} from '../hooks/usePop';
import {FONT} from '../utils/font';

type Props = {
  text: string;
  size: number;
  color?: string;
  weight?: 700 | 800;
  /** 出現方法 */
  mode?: 'pop' | 'fade';
  /** 出現開始フレーム(シーン内) */
  delay?: number;
  letterSpacing?: number;
  shadow?: boolean;
  /** 折り返し禁止(長いタイトルはサイズ側で調整する) */
  nowrap?: boolean;
};

export const Title: React.FC<Props> = ({
  text,
  size,
  color = '#FFFFFF',
  weight = 800,
  mode = 'pop',
  delay = 0,
  letterSpacing = 0,
  shadow = true,
  nowrap = false,
}) => {
  const frame = useCurrentFrame();
  const pop = usePop(delay);
  const fade = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const style: React.CSSProperties = {
    fontFamily: FONT,
    fontWeight: weight,
    fontSize: size,
    color,
    letterSpacing,
    textAlign: 'center',
    lineHeight: 1.25,
    whiteSpace: nowrap ? 'nowrap' : undefined,
    textShadow: shadow ? '0 4px 18px rgba(0,0,0,0.22)' : undefined,
    ...(mode === 'pop'
      ? {transform: `scale(${pop})`, opacity: Math.min(1, pop * 1.4)}
      : {opacity: fade, transform: `translateY(${(1 - fade) * 24}px)`}),
  };
  return <div style={style}>{text}</div>;
};
