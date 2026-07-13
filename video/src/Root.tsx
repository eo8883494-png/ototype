// Composition登録。テンプレA〜EをJSONの"template"で使い分ける(render.mjsがidを解決)。
import React from 'react';
import {Composition} from 'remotion';
import {OtotypeVideo} from './Video';
import {OtotypeAruaru} from './templates/Aruaru';
import {OtotypeCompare} from './templates/Compare';
import {OtotypePlaylist} from './templates/Playlist';
import {OtotypeRanking} from './templates/Ranking';
import {validateVideoData, type VideoData, type AruaruData, type CompareData, type PlaylistData, type RankingData} from './data/schema';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './utils/timing';
import sampleA from '../data/fsdm.json';
import sampleB from '../data/b/fsdm.json';
import sampleC from '../data/c/fsdm.json';
import sampleD from '../data/d/fldt_fldm.json';
import sampleE from '../data/e/fes_naki.json';

const common = {durationInFrames: DURATION_IN_FRAMES, fps: FPS, width: WIDTH, height: HEIGHT} as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="OtotypeResult" component={OtotypeVideo} {...common} defaultProps={validateVideoData(sampleA) as VideoData} />
    <Composition id="OtotypeAruaru" component={OtotypeAruaru} {...common} defaultProps={sampleB as AruaruData} />
    <Composition id="OtotypePlaylist" component={OtotypePlaylist} {...common} defaultProps={sampleC as PlaylistData} />
    <Composition id="OtotypeCompare" component={OtotypeCompare} {...common} defaultProps={sampleD as CompareData} />
    <Composition id="OtotypeRanking" component={OtotypeRanking} {...common} defaultProps={sampleE as RankingData} />
  </>
);
