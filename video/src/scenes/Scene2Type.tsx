// Scene2 (1-3秒): タイプ発表。コード→タイプ名がポップ、キャッチコピーは1文字ずつ。キャラはふわふわ。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {VideoData} from '../data/schema';
import {CatchCopy} from '../components/CatchCopy';
import {Character} from '../components/Character';
import {Particles} from '../components/Particles';
import {Title} from '../components/Title';

export const Scene2Type: React.FC<{data: VideoData}> = ({data}) => (
  <AbsoluteFill style={{alignItems: 'center'}}>
    <Particles kind="sparkles" seed={`s2-${data.code}`} count={8} />
    <div style={{marginTop: 170}}>
      <Character image={data.image} size={660} popAt={-1} floatAmp={14} />
    </div>
    <div style={{marginTop: 40}}>
      <Title text={[...data.code].join(' ')} size={96} delay={0} letterSpacing={10} />
    </div>
    <div style={{marginTop: 18}}>
      <Title text={data.type} size={120} delay={5} />
    </div>
    <div style={{marginTop: 56}}>
      <CatchCopy text={data.catch} size={88} delay={16} />
    </div>
  </AbsoluteFill>
);
