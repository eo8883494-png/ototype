// Scene4 (6-8秒): CTA。キャラがジャンプ、音符とキラキラが舞い、診断への誘い+QR+ハッシュタグ。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DEFAULT_SITE_URL, type VideoData} from '../data/schema';
import {Character} from '../components/Character';
import {Particles} from '../components/Particles';
import {QR} from '../components/QR';
import {Title} from '../components/Title';
import {usePop} from '../hooks/usePop';
import {FONT} from '../utils/font';

export const Scene4Outro: React.FC<{data: VideoData}> = ({data}) => {
  const pillPop = usePop(14);
  const url = data.siteUrl ?? DEFAULT_SITE_URL;
  return (
    <AbsoluteFill style={{alignItems: 'center'}}>
      <Particles kind="mixed" seed={`s4-${data.code}`} count={18} />
      <div style={{marginTop: 200}}>
        <Character image={data.image} size={640} popAt={0} jump={90} floatAmp={8} />
      </div>
      <div style={{marginTop: 40}}>
        <Title text="あなたも診断してみる？" size={92} delay={8} />
      </div>
      <div style={{marginTop: 22}}>
        <Title text="OTOTYPE" size={72} delay={12} letterSpacing={14} />
      </div>
      {/* ハッシュタグピル */}
      <div style={{display: 'flex', gap: 22, marginTop: 44, transform: `scale(${pillPop})`}}>
        {data.hashtags.slice(0, 3).map((h) => (
          <div
            key={h}
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 42,
              color: '#FFFFFF',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 999,
              padding: '14px 34px',
            }}
          >
            #{h}
          </div>
        ))}
      </div>
      {/* QRコード(右下) */}
      <div style={{position: 'absolute', right: 70, bottom: 150}}>
        <QR src={data.qrImage ?? 'qr.png'} url={url} delay={16} />
      </div>
    </AbsoluteFill>
  );
};
