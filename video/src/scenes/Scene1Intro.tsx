// Scene1 (0-1秒): フック。「あなたは…」+キャラがポップズームで登場、音符が飛ぶ。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {VideoData} from '../data/schema';
import {Character} from '../components/Character';
import {Particles} from '../components/Particles';
import {Title} from '../components/Title';

export const Scene1Intro: React.FC<{data: VideoData}> = ({data}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Particles kind="notes" seed={`s1-${data.code}`} count={10} />
    <div style={{position: 'absolute', top: 320, width: '100%'}}>
      <Title
        text={data.nickname ? `${data.nickname}さんは…` : 'あなたは…'}
        size={data.nickname ? 92 : 104}
        mode="fade"
        delay={2}
      />
    </div>
    <Character image={data.image} size={860} popAt={4} />
  </AbsoluteFill>
);
