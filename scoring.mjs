// scoring.mjs — オトタイプの判定ロジック（純粋関数・軸ベース / 7段階同意スケール）。
// app.js（ブラウザ）と tools/selftest.mjs（Node）が単一の真実源として import する。
// DOM や fetch には一切依存しない。

// 4つの軸。各軸は pos / neg の2極。タイプコードは place→core→into→find の順に連結。
export const AXES = [
  { id: "place", label: "場所感",     pos: "F", neg: "R", posLabel: "みんな", negLabel: "ひとり" },
  { id: "core",  label: "刺さる核",   pos: "L", neg: "S", posLabel: "歌詞",   negLabel: "音"     },
  { id: "into",  label: "のめり込み", pos: "D", neg: "E", posLabel: "熱狂",   negLabel: "ゆるり" },
  { id: "find",  label: "探し方",     pos: "T", neg: "M", posLabel: "王道",   negLabel: "開拓"   },
];

export const SCALE = 7;           // 7段階（0=そう思う 〜 6=そう思わない、3=中立）
export const AXIS_MAX = 15;       // 各軸5問 × 最大寄与3
export const CLOSE_MARGIN = 3;    // 軸の差がこれ以下なら「どっちつかず＝寄り」。全軸が超なら「純度高め」。

// answers: 各設問の回答 index（0..6）の配列。questions: data/questions.json の配列。
// 各設問 { axis, dir(+1=同意でpos極 / -1=同意でneg極), text }。
// 同意度 = 3 - index（0→+3 強く同意, 3→0 中立, 6→-3 強く不同意）。軸合計の符号で極を決める。
export function judge(answers, questions) {
  const totals = {}; // 軸ID→合計（正=pos極寄り）
  for (const ax of AXES) totals[ax.id] = 0;
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const a = answers[qi];
    if (!q || !Number.isInteger(a) || a < 0 || a >= SCALE) continue;
    totals[q.axis] += (3 - a) * q.dir;
  }
  let code = "";
  const margins = {};
  const axisPick = {};
  for (const ax of AXES) {
    const t = totals[ax.id];
    const pick = t >= 0 ? ax.pos : ax.neg; // 同点（合計0）は pos 極（決定的）
    code += pick;
    margins[ax.id] = Math.abs(t);
    axisPick[ax.id] = pick;
  }
  // 最も僅差だった軸（複数なら AXES 順で最初）＝「寄り」を出す軸
  let closest = AXES[0].id;
  for (const ax of AXES) if (margins[ax.id] < margins[closest]) closest = ax.id;
  const pure = AXES.every((ax) => margins[ax.id] > CLOSE_MARGIN);
  return { code, margins, axisPick, closest, pure, totals };
}
