// scoring.mjs — オトタイプの判定ロジック（純粋関数・軸ベース / MBTI型）。
// app.js（ブラウザ）と tools/selftest.mjs（Node）が単一の真実源として import する。
// DOM や fetch には一切依存しない。

// 4つの軸。各軸は pos / neg の2極。タイプコードは place→core→into→find の順に連結。
export const AXES = [
  { id: "place", pos: "F", neg: "R", posLabel: "みんな", negLabel: "ひとり" }, // 場所感
  { id: "core",  pos: "L", neg: "S", posLabel: "歌詞",   negLabel: "音"     }, // 刺さる核
  { id: "into",  pos: "D", neg: "E", posLabel: "熱狂",   negLabel: "ゆるり" }, // のめり込み
  { id: "find",  pos: "T", neg: "M", posLabel: "王道",   negLabel: "開拓"   }, // 探し方
];

export const CLOSE_MARGIN = 2; // 軸の差がこれ以下なら「どっちつかず＝寄り」。全軸が超なら「純度高め」。

// answers: 各設問で選んだ選択肢 index の配列。questions: data/questions.json の配列。
// 各 option.weights は極の文字（F/R/L/S/D/E/T/M）→ 重み。
export function judge(answers, questions) {
  const score = {}; // 極ごとの合計
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const opt = q && q.options[answers[qi]];
    if (!opt || !opt.weights) continue;
    for (const pole in opt.weights) score[pole] = (score[pole] || 0) + opt.weights[pole];
  }
  let code = "";
  const margins = {};
  const axisPick = {};
  for (const ax of AXES) {
    const p = score[ax.pos] || 0;
    const n = score[ax.neg] || 0;
    const pick = p >= n ? ax.pos : ax.neg; // 同点は pos 極（決定的）
    code += pick;
    margins[ax.id] = Math.abs(p - n);
    axisPick[ax.id] = pick;
  }
  // 最も僅差だった軸（複数なら AXES 順で最初）＝「寄り」を出す軸
  let closest = AXES[0].id;
  for (const ax of AXES) if (margins[ax.id] < margins[closest]) closest = ax.id;
  const pure = AXES.every((ax) => margins[ax.id] > CLOSE_MARGIN);
  return { code, margins, axisPick, closest, pure, score };
}
