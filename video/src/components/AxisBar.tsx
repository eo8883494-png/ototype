// ゲームのステータス画面風の1軸バー。左から気持ちよく伸び、数字はカウントアップ。
import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useCountUp} from '../hooks/useCountUp';
import {lighten} from '../utils/color';
import {FONT} from '../utils/font';

type Props = {
  label: string;
  /** 0..100 */
  value: number;
  /** バーの色(タイプカラー) */
  color: string;
  /** 伸び始めるフレーム(シーン内)。4本を時差で気持ちよく */
  delay: number;
  width: number;
};

export const AxisBar: React.FC<Props> = ({label, value, color, delay, width}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  // 行自体の出現(左からスライドイン)
  const enter = spring({frame: frame - delay + 6, fps, config: {damping: 14, stiffness: 120}});
  // バーの伸び(バネでわずかにオーバーシュート→戻る、の気持ちよさ)
  const grow = spring({frame: frame - delay, fps, config: {damping: 13, stiffness: 90, mass: 0.9}});
  const {value: count} = useCountUp(value, delay, 22);
  const barW = Math.max(0, Math.min(1, grow)) * (value / 100) * width;
  return (
    <div
      style={{
        opacity: Math.min(1, enter * 1.3),
        transform: `translateX(${(1 - enter) * -60}px)`,
        marginBottom: 42,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: FONT,
          marginBottom: 12,
        }}
      >
        <span style={{fontSize: 44, fontWeight: 800, color: '#FFFFFF'}}>{label}</span>
        <span style={{fontSize: 56, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums'}}>
          {count}
          <span style={{fontSize: 34, opacity: 0.85}}>%</span>
        </span>
      </div>
      {/* トラック */}
      <div
        style={{
          width,
          height: 34,
          borderRadius: 17,
          background: 'rgba(255,255,255,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* フィル(グロス入り=ゲームUI感) */}
        <div
          style={{
            width: barW,
            height: '100%',
            borderRadius: 17,
            background: `linear-gradient(180deg, ${lighten(color, 0.5)} 0%, ${lighten(color, 0.15)} 55%, ${color} 100%)`,
            boxShadow: `0 0 18px ${lighten(color, 0.3)}`,
          }}
        />
      </div>
    </div>
  );
};
