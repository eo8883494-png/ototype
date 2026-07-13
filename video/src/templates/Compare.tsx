// Template D: 友達と比較。2タイプのライブ相性を発表する(データはサイトのcompat.jsonと同源)。
import React from 'react';
import {AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {Character} from '../components/Character';
import {Footer} from '../components/Footer';
import {Particles} from '../components/Particles';
import {Title} from '../components/Title';
import type {CompareData, CompareSide} from '../data/schema';
import {FONT} from '../utils/font';

const SideCard: React.FC<{side: CompareSide; from: 'left' | 'right'; delay: number}> = ({side, from, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 13, stiffness: 100}});
  const dir = from === 'left' ? -1 : 1;
  return (
    <div
      style={{
        width: 430,
        background: '#FFFFFF',
        border: `10px solid ${side.color}`,
        borderRadius: 40,
        padding: '30px 20px 24px',
        textAlign: 'center',
        transform: `translateX(${(1 - s) * dir * 420}px)`,
        opacity: Math.min(1, s * 1.4),
      }}
    >
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Character image={side.image} size={300} popAt={-1} floatAmp={6} />
      </div>
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 40, color: side.color, marginTop: 10}}>
        {[...side.code].join(' ')}
      </div>
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 44, color: '#3A322B'}}>{side.type}</div>
    </div>
  );
};

export const OtotypeCompare: React.FC<CompareData> = (d) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ratingPop = spring({frame: frame - 100, fps, config: {damping: 9, stiffness: 140, mass: 0.8}});
  return (
    <AbsoluteFill>
      <Background color={d.left.color} />
      <AbsoluteFill style={{alignItems: 'center'}}>
        <div style={{marginTop: 130}}>
          <Title text="この2人、ライブ相性は？" size={76} delay={2} />
        </div>
        <div style={{display: 'flex', gap: 36, alignItems: 'center', marginTop: 60}}>
          <SideCard side={d.left} from="left" delay={22} />
          <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 80, color: '#FFFFFF'}}>×</div>
          <SideCard side={d.right} from="right" delay={34} />
        </div>
        {/* 相性発表 */}
        <div style={{marginTop: 60, transform: `scale(${ratingPop})`, textAlign: 'center'}}>
          <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 70, color: '#FFFFFF'}}>相性 </span>
          <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 150, color: '#FFE066', textShadow: '0 6px 24px rgba(0,0,0,0.3)'}}>
            {d.rating}
          </span>
        </div>
        <Sequence from={130}>
          <Particles kind="sparkles" seed={`d-${d.left.code}${d.right.code}`} count={12} />
        </Sequence>
      </AbsoluteFill>
      <Sequence from={140}>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end'}}>
          <div style={{marginBottom: 300, padding: '0 80px'}}>
            <Title text={d.summary} size={52} delay={0} mode="fade" />
          </div>
          <div style={{position: 'absolute', bottom: 200, width: '100%'}}>
            <Title text="友達との相性はリンクからチェック" size={48} delay={30} mode="fade" />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Footer />
    </AbsoluteFill>
  );
};
