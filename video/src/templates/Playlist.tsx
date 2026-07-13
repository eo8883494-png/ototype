// Template C: おすすめプレイリスト。タイプに効く3曲をSpotify風カードで見せる(選曲はサイトの週替わりと同源)。
import React from 'react';
import {AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {Character} from '../components/Character';
import {Footer} from '../components/Footer';
import {Title} from '../components/Title';
import type {PlaylistData} from '../data/schema';
import {lighten} from '../utils/color';
import {FONT} from '../utils/font';

const Song: React.FC<{t: string; a: string; i: number; delay: number; color: string}> = ({t, a, i, delay, color}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 13, stiffness: 110}});
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        background: 'rgba(18,18,24,0.78)',
        borderRadius: 26,
        padding: '30px 36px',
        opacity: Math.min(1, s * 1.3),
        transform: `translateY(${(1 - s) * 50}px)`,
      }}
    >
      <div
        style={{
          minWidth: 60,
          height: 60,
          borderRadius: 16,
          background: lighten(color, 0.15),
          color: '#FFF',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ♪
      </div>
      <div style={{fontFamily: FONT, textAlign: 'left'}}>
        <div style={{fontWeight: 800, fontSize: 44, color: '#FFFFFF'}}>{i + 1}. {t}</div>
        <div style={{fontWeight: 700, fontSize: 34, color: 'rgba(255,255,255,0.7)'}}>{a}</div>
      </div>
    </div>
  );
};

export const OtotypePlaylist: React.FC<PlaylistData> = (d) => (
  <AbsoluteFill>
    <Background color={d.color} />
    <AbsoluteFill style={{alignItems: 'center'}}>
      <div style={{marginTop: 100}}>
        <Character image={d.image} size={380} popAt={2} floatAmp={10} />
      </div>
      <div style={{marginTop: 12}}>
        {/* 長いタイプ名でも1行に収める(折り返すと「3｜曲」で切れて不格好) */}
        <Title text={`${d.type}に効く3曲`} size={d.type.length >= 7 ? 64 : 78} delay={6} nowrap />
      </div>
      <div style={{width: 920, marginTop: 44, display: 'flex', flexDirection: 'column', gap: 26}}>
        {d.songs.slice(0, 3).map((s, i) => (
          <Song key={i} t={s.t} a={s.a} i={i} delay={40 + i * 46} color={d.color} />
        ))}
      </div>
    </AbsoluteFill>
    <Sequence from={200}>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end'}}>
        <div style={{marginBottom: 210}}>
          <Title text="フルの10曲は診断結果でもらえます" size={52} delay={0} />
        </div>
      </AbsoluteFill>
    </Sequence>
    <Footer />
  </AbsoluteFill>
);
