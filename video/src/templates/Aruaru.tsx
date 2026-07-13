// Template B: タイプあるある。3つのあるあるカードが順に出て「わかる人はコメントへ」で締める。
import React from 'react';
import {AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {Character} from '../components/Character';
import {Footer} from '../components/Footer';
import {Title} from '../components/Title';
import type {AruaruData} from '../data/schema';
import {FONT} from '../utils/font';

const Card: React.FC<{text: string; index: number; delay: number; color: string}> = ({text, index, delay, color}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 13, stiffness: 110}});
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 30,
        background: '#FFFFFF',
        borderRadius: 32,
        padding: '34px 40px',
        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
        opacity: Math.min(1, s * 1.3),
        transform: `translateX(${(1 - s) * 80}px)`,
      }}
    >
      <div
        style={{
          minWidth: 64,
          height: 64,
          borderRadius: '50%',
          background: color,
          color: '#FFF',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {index + 1}
      </div>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 44, color: '#3A322B', lineHeight: 1.35}}>{text}</div>
    </div>
  );
};

export const OtotypeAruaru: React.FC<AruaruData> = (d) => (
  <AbsoluteFill>
    <Background color={d.color} />
    <AbsoluteFill style={{alignItems: 'center'}}>
      <div style={{marginTop: 110}}>
        <Character image={d.image} size={400} popAt={2} floatAmp={10} />
      </div>
      <div style={{marginTop: 14}}>
        <Title text={`${d.type} あるある`} size={82} delay={6} />
      </div>
      <div style={{width: 920, marginTop: 46, display: 'flex', flexDirection: 'column', gap: 30}}>
        {d.aruaru.slice(0, 3).map((a, i) => (
          <Card key={i} text={a} index={i} delay={38 + i * 48} color={d.color} />
        ))}
      </div>
    </AbsoluteFill>
    <Sequence from={200}>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end'}}>
        <div style={{marginBottom: 210}}>
          <Title text="わかる人はコメントへ！" size={62} delay={0} />
        </div>
      </AbsoluteFill>
    </Sequence>
    <Footer />
  </AbsoluteFill>
);
