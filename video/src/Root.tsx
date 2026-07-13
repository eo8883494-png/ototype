// Composition登録。inputProps(JSON)を差し替えるだけで16タイプ全て(将来100種でも)生成できる。
import React from 'react';
import {Composition} from 'remotion';
import {OtotypeVideo} from './Video';
import {validateVideoData, type VideoData} from './data/schema';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './utils/timing';
import sample from '../data/fsdm.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="OtotypeResult"
    component={OtotypeVideo}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={validateVideoData(sample) as VideoData}
  />
);
