// 数字のカウントアップ(easeOut)。バーの伸びと同じ進行度を共有できるようprogressも公開。
import {interpolate, useCurrentFrame, Easing} from 'remotion';

export const useCountUp = (
  target: number,
  delayFrames: number,
  durationFrames = 20
): {value: number; progress: number} => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delayFrames, delayFrames + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return {value: Math.round(target * progress), progress};
};
