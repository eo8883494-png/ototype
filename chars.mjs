// chars.mjs — 16タイプのオリジナルキャラ（インラインSVG生成・画像ファイル不要）。
// 4軸の組み合わせでパーツが決まり、16タイプ全てが異なる見た目になる:
//   place F=両腕を上げて全開 / R=ヘッドホンでおこもり
//   core  L=歌詞のふきだき持ち / S=音符持ち
//   into  D=キラキラ目+全開の口 / E=まったり目+ほほえみ
//   find  T=王冠(王道) / M=探検帽(開拓)
// 体の色は types.json の color。app.js（一覧/結果/LP/シェアカード）が import する。

export function charSVG(t, size = 96) {
  const c = t.color;
  const F = t.id[0] === "F", L = t.id[1] === "L", D = t.id[2] === "D", T = t.id[3] === "T";
  const p = [];

  // 地面の影
  p.push(`<ellipse cx="60" cy="108" rx="25" ry="5" fill="rgba(60,70,66,.12)"/>`);

  // 腕（体より先に描いて体の後ろへ）
  if (F) {
    p.push(`<path d="M34 66 Q18 52 24 40" stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round"/>`);
    p.push(`<path d="M86 66 Q102 52 96 40" stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round"/>`);
  } else {
    p.push(`<path d="M32 84 Q24 92 28 98" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/>`);
    p.push(`<path d="M88 84 Q96 92 92 98" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/>`);
  }

  // 体
  p.push(`<ellipse cx="60" cy="72" rx="34" ry="33" fill="${c}"/>`);
  p.push(`<ellipse cx="60" cy="80" rx="26" ry="20" fill="rgba(255,255,255,.16)"/>`);

  // ヘッドホン（R）
  if (!F) {
    p.push(`<path d="M32 56 A28 26 0 0 1 88 56" stroke="#576661" stroke-width="5.5" fill="none"/>`);
    p.push(`<rect x="24" y="52" width="11" height="18" rx="5.5" fill="#576661"/>`);
    p.push(`<rect x="85" y="52" width="11" height="18" rx="5.5" fill="#576661"/>`);
  }

  // 目
  if (D) {
    p.push(`<circle cx="48" cy="66" r="5.2" fill="#3E3A3A"/><circle cx="50" cy="64" r="1.9" fill="#fff"/>`);
    p.push(`<circle cx="72" cy="66" r="5.2" fill="#3E3A3A"/><circle cx="74" cy="64" r="1.9" fill="#fff"/>`);
  } else {
    p.push(`<path d="M43 66 q5 -5.5 10 0" stroke="#3E3A3A" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
    p.push(`<path d="M67 66 q5 -5.5 10 0" stroke="#3E3A3A" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
  }

  // ほっぺ
  p.push(`<circle cx="41" cy="75" r="4.2" fill="rgba(255,255,255,.5)"/>`);
  p.push(`<circle cx="79" cy="75" r="4.2" fill="rgba(255,255,255,.5)"/>`);

  // 口
  if (D) {
    p.push(`<path d="M52.5 76 A7.5 7.5 0 0 0 67.5 76 Z" fill="#6E4048"/>`);
    p.push(`<path d="M56 81 A4.5 3.4 0 0 1 64 81 Z" fill="#E88C9C"/>`);
  } else {
    p.push(`<path d="M54 78 q6 5.5 12 0" stroke="#3E3A3A" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
  }

  // 頭のかざり
  if (T) { // 王冠
    p.push(`<path d="M47 40 L50 27 L56.5 34 L60 24 L63.5 34 L70 27 L73 40 Z" fill="#F6C453" stroke="#DCA33B" stroke-width="2" stroke-linejoin="round"/>`);
  } else { // 探検帽
    p.push(`<path d="M44 36 A16 13 0 0 1 76 36 Z" fill="#A5CBA0"/>`);
    p.push(`<ellipse cx="60" cy="36.5" rx="23" ry="5" fill="#8FB98B"/>`);
    p.push(`<rect x="46" y="31" width="28" height="4" rx="2" fill="#7DA878"/>`);
  }

  // 持ち物（体の横に浮かぶ）
  if (L) { // 歌詞のふきだし
    p.push(`<rect x="88" y="66" width="26" height="20" rx="6" fill="#fff" stroke="#D9CFC2" stroke-width="1.6"/>`);
    p.push(`<path d="M92 84 L89 91 L98 85 Z" fill="#fff"/>`);
    p.push(`<line x1="93" y1="73" x2="109" y2="73" stroke="#B9AFA0" stroke-width="2" stroke-linecap="round"/>`);
    p.push(`<line x1="93" y1="79" x2="104" y2="79" stroke="#B9AFA0" stroke-width="2" stroke-linecap="round"/>`);
  } else { // 8分音符
    p.push(`<ellipse cx="99" cy="86" rx="6" ry="5" fill="#565D68"/>`);
    p.push(`<rect x="102.5" y="60" width="3.6" height="26" rx="1.8" fill="#565D68"/>`);
    p.push(`<path d="M106 60 q10 3 7 14 q-1.5 -7 -7 -7 Z" fill="#565D68"/>`);
  }

  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t.name}のキャラクター">${p.join("")}</svg>`;
}
