// ポップ出現(scale 0→1にバネで到達)。delayFramesで時差出現を作る。
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const usePop = (delayFrames = 0, damping = 11): number => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - delayFrames,
    fps,
    config: {damping, stiffness: 130, mass: 0.6},
  });
};
