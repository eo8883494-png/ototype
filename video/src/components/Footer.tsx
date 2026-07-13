// 画面下部の控えめなブランド表記(全シーン共通)。
import React from 'react';
import {FONT} from '../utils/font';

type Props = {
  text?: string;
};

export const Footer: React.FC<Props> = ({text = 'OTOTYPE｜聴き方でわかる16タイプ診断'}) => (
  <div
    style={{
      position: 'absolute',
      bottom: 64,
      width: '100%',
      textAlign: 'center',
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 34,
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: 2,
    }}
  >
    {text}
  </div>
);
