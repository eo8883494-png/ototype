// 動画本体。SCENES(utils/timing)の設計図どおりにシーンを並べる。
// シーン追加は SCENE_COMPONENTS への1行追加で済む(既存シーンのコードは触らない)。
import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Background} from './components/Background';
import {Footer} from './components/Footer';
import type {VideoData} from './data/schema';
import {Scene1Intro} from './scenes/Scene1Intro';
import {Scene2Type} from './scenes/Scene2Type';
import {Scene3Status} from './scenes/Scene3Status';
import {Scene4Outro} from './scenes/Scene4Outro';
import {SCENES} from './utils/timing';

/** シーンの登録簿。timing.tsのキーと対で管理 */
const SCENE_COMPONENTS: {
  key: keyof typeof SCENES;
  Component: React.FC<{data: VideoData}>;
}[] = [
  {key: 'intro', Component: Scene1Intro},
  {key: 'type', Component: Scene2Type},
  {key: 'status', Component: Scene3Status},
  {key: 'outro', Component: Scene4Outro},
];

export const OtotypeVideo: React.FC<VideoData> = (data) => (
  <AbsoluteFill>
    {/* 背景は全シーン共通(タイプカラー+パララックス) */}
    <Background color={data.color} />
    {SCENE_COMPONENTS.map(({key, Component}) => (
      <Sequence key={key} from={SCENES[key].from} durationInFrames={SCENES[key].duration}>
        <Component data={data} />
      </Sequence>
    ))}
    <Footer />
  </AbsoluteFill>
);
