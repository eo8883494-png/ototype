// キャラのふわふわ上下(sin波)。amplitude=px, speed=周期/秒。
import {useCurrentFrame, useVideoConfig} from 'remotion';

export const useFloat = (amplitude = 12, speed = 1.1): number => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return Math.sin((frame / fps) * speed * 2 * Math.PI) * amplitude;
};
