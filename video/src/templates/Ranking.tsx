// Template E: ランキング。お題TOP3を3位→2位→1位の順で発表する(エンタメ・オトタイプの独断)。
import React from 'react';
import {AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {Character} from '../components/Character';
import {Footer} from '../components/Footer';
import {Particles} from '../components/Particles';
import {Title} from '../components/Title';
import type {RankingData, RankItem} from '../data/schema';
import {FONT} from '../utils/font';

const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32']; // 1位/2位/3位

const Row: React.FC<{item: RankItem; delay: number; big?: boolean}> = ({item, delay, big}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 11, stiffness: 120}});
  const size = big ? 250 : 180;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 34,
        background: 'rgba(255,255,255,0.94)',
        borderRadius: 34,
        padding: big ? '20px 44px' : '14px 40px',
        boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
        opacity: Math.min(1, s * 1.3),
        transform: `scale(${0.7 + 0.3 * s})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: big ? 88 : 64,
          color: MEDAL[item.place - 1] ?? '#3A322B',
          textShadow: '0 2px 6px rgba(0,0,0,0.15)',
          minWidth: big ? 120 : 90,
        }}
      >
        {item.place}位
      </div>
      <Character image={item.image} size={size} popAt={-1} floatAmp={big ? 8 : 0} />
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: big ? 54 : 44, color: '#3A322B'}}>{item.type}</div>
    </div>
  );
};

export const OtotypeRanking: React.FC<RankingData> = (d) => {
  const sorted = [...d.ranks].sort((a, b) => b.place - a.place); // 3位→1位の発表順
  const first = d.ranks.find((r) => r.place === 1);
  const bg = d.color ?? first?.color ?? '#E88CA4';
  return (
    <AbsoluteFill>
      <Background color={bg} />
      <AbsoluteFill style={{alignItems: 'center'}}>
        <div style={{marginTop: 120}}>
          {/* お題は1行固定(長さでサイズを落とす) */}
          <Title text={d.theme} size={d.theme.length >= 13 ? 62 : 76} delay={2} nowrap />
        </div>
        <div style={{marginTop: 10}}>
          <Title text="TOP3(オトタイプの独断)" size={44} delay={10} mode="fade" color="rgba(255,255,255,0.85)" />
        </div>
        <div style={{marginTop: 50, display: 'flex', flexDirection: 'column', gap: 34, alignItems: 'center'}}>
          {sorted.map((r) => (
            <Row key={r.place} item={r} delay={r.place === 3 ? 40 : r.place === 2 ? 95 : 150} big={r.place === 1} />
          ))}
        </div>
        <Sequence from={155}>
          <Particles kind="sparkles" seed={`e-${d.theme}`} count={14} />
        </Sequence>
      </AbsoluteFill>
      <Sequence from={205}>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end'}}>
          <div style={{marginBottom: 210}}>
            <Title text="あなたのタイプはプロフのリンクから" size={50} delay={0} mode="fade" />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Footer />
    </AbsoluteFill>
  );
};
