// playlist.mjs — 週替わりプレイリスト選曲（純粋関数）。app.js と tools/selftest.mjs が import する。
// プール(12曲以上)から週番号に応じて SHOW_N 曲を選ぶ。同じ週は誰が見ても同じ選曲（決定的）。

export const SHOW_N = 10;

// 週番号: UNIXエポックからの経過週(UTC)。毎週木曜0時UTC(日本時間木曜9時)に切り替わる。
export function weekIndex(now = Date.now()) {
  return Math.floor(now / (7 * 24 * 60 * 60 * 1000));
}

// プールから今週の10曲を選ぶ。開始位置を週でずらし、並び順も週で回転させる。
export function pickWeekly(pool, now = Date.now()) {
  const w = weekIndex(now);
  const n = pool.length;
  const songs = [];
  for (let i = 0; i < Math.min(SHOW_N, n); i++) {
    songs.push(pool[(w + i * (1 + (w % 3))) % n]); // 週ごとに歩幅も変えて並びを変化させる
  }
  // 歩幅による重複を除去し、足りなければ順送りで補完
  const seen = new Set();
  const out = [];
  for (const s of songs) {
    const k = s.t + "/" + s.a;
    if (!seen.has(k)) { seen.add(k); out.push(s); }
  }
  let j = 0;
  while (out.length < Math.min(SHOW_N, n) && j < n) {
    const s = pool[(w + j) % n];
    const k = s.t + "/" + s.a;
    if (!seen.has(k)) { seen.add(k); out.push(s); }
    j++;
  }
  return { week: w, songs: out };
}
