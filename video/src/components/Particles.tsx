// 音符・キラキラのパーティクル。seed固定の擬似乱数(remotion.random)で毎レンダリング同一。
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

type Props = {
  /** 表示個数 */
  count?: number;
  /** 乱数シード(シーンごとに変える) */
  seed?: string;
  /** notes=音符 / sparkles=キラキラ / mixed=両方 */
  kind?: 'notes' | 'sparkles' | 'mixed';
  /** 出現開始フレーム(シーン内) */
  startAt?: number;
  /** 文字色 */
  color?: string;
};

const NOTES = ['♪', '♫', '♩'];
const SPARKS = ['✦', '✧', '＊'];

export const Particles: React.FC<Props> = ({
  count = 14,
  seed = 'p',
  kind = 'mixed',
  startAt = 0,
  color = 'rgba(255,255,255,0.9)',
}) => {
  const frame = useCurrentFrame();
  const items = Array.from({length: count}, (_, i) => {
    const rx = random(`${seed}-x${i}`);
    const ry = random(`${seed}-y${i}`);
    const rs = random(`${seed}-s${i}`);
    const rv = random(`${seed}-v${i}`);
    const glyphs = kind === 'notes' ? NOTES : kind === 'sparkles' ? SPARKS : [...NOTES, ...SPARKS];
    const glyph = glyphs[Math.floor(random(`${seed}-g${i}`) * glyphs.length)];
    const local = Math.max(0, frame - startAt - i * 2); // 少しずつ時差で湧く
    const rise = local * (1.6 + rv * 2.6); // 上昇速度は個体差
    const sway = Math.sin((local / 30) * (1 + rv) * 2 * Math.PI) * 26;
    const opacity = local <= 0 ? 0 : Math.min(1, local / 8) * Math.max(0, 1 - local / 90);
    return {glyph, x: rx * 1000 + 40 + sway, y: 1700 - ry * 300 - rise, size: 40 + rs * 56, opacity, rot: (rv - 0.5) * 40};
  });
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {items.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            fontSize: p.size,
            color,
            opacity: p.opacity,
            transform: `rotate(${p.rot}deg)`,
            textShadow: '0 2px 12px rgba(0,0,0,0.12)',
          }}
        >
          {p.glyph}
        </div>
      ))}
    </AbsoluteFill>
  );
};
