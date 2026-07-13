// Scene3 (3-6秒): ゲーム風ステータス。半透明ダークカード(Spotify感)の中で4本のバーが時差で伸びる。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {AXIS_LABELS, type VideoData} from '../data/schema';
import {AxisBar} from '../components/AxisBar';
import {Character} from '../components/Character';
import {Title} from '../components/Title';

const BAR_STAGGER = 13; // 1本ごとの時差(フレーム)。テンポの要

export const Scene3Status: React.FC<{data: VideoData}> = ({data}) => (
  <AbsoluteFill style={{alignItems: 'center'}}>
    {/* キャラは上部で見守る(主役の継続) */}
    <div style={{marginTop: 130}}>
      <Character image={data.image} size={430} popAt={-1} floatAmp={10} />
    </div>
    <div style={{marginTop: 26}}>
      <Title text={`${data.type} のステータス`} size={62} delay={0} />
    </div>
    {/* ステータスカード */}
    <div
      style={{
        marginTop: 44,
        width: 900,
        padding: '64px 70px 24px',
        borderRadius: 44,
        background: 'rgba(18,18,24,0.62)',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
      }}
    >
      {AXIS_LABELS.map(({key, label}, i) => (
        <AxisBar
          key={key}
          label={label}
          value={data.axis[key]}
          color={data.color}
          delay={8 + i * BAR_STAGGER}
          width={760}
        />
      ))}
    </div>
  </AbsoluteFill>
);
