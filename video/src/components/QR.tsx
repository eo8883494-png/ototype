// QRコード表示。画像(public/qr.png等)があればカードで表示、なければURLテキストにフォールバック。
import React from 'react';
import {Img, staticFile} from 'remotion';
import {usePop} from '../hooks/usePop';
import {FONT} from '../utils/font';

type Props = {
  /** public/からのQR画像パス */
  src?: string;
  /** フォールバック表示用URL */
  url: string;
  size?: number;
  /** 出現開始フレーム(シーン内) */
  delay?: number;
};

export const QR: React.FC<Props> = ({src, url, size = 210, delay = 0}) => {
  const pop = usePop(delay);
  if (!src) {
    return (
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 34, color: '#FFFFFF', opacity: pop}}>
        {url.replace(/^https?:\/\//, '')}
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#FFFFFF',
        borderRadius: 24,
        padding: 14,
        transform: `scale(${pop})`,
        boxShadow: '0 10px 26px rgba(0,0,0,0.25)',
      }}
    >
      <Img src={staticFile(src)} style={{width: '100%', height: '100%'}} />
    </div>
  );
};
