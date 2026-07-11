// app.js — オトタイプ SPA 本体。ビルドなし・ライブラリなし。
// 判定ロジックは scoring.mjs（単一の真実源）を import する。
import { judge, AXES, CLOSE_MARGIN } from "./scoring.mjs";

// ---------- state ----------
let TYPES = null, QUESTIONS = null, COMPAT = null;
let answers = [];            // 自分の回答（選択肢index）
let inviter = null;          // { answers:[], nick:"" } 招待リンク経由のとき
let myResult = null;         // judge() の結果
let compatShown = null;      // 直近の相性計算結果（コピー用）

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NICK_MAX = 20;

// ---------- boot ----------
async function boot() {
  const [t, q, c] = await Promise.all([
    fetch("data/types.json").then((r) => r.json()),
    fetch("data/questions.json").then((r) => r.json()),
    fetch("data/compat.json").then((r) => r.json()),
  ]);
  TYPES = t; QUESTIONS = q; COMPAT = c;

  // 招待リンク?a=回答列&v=1&n=ニックネーム
  const p = new URLSearchParams(location.search);
  const a = p.get("a");
  if (p.get("v") === "1" && a && new RegExp(`^[0-3]{${QUESTIONS.length}}$`).test(a)) {
    inviter = { answers: [...a].map(Number), nick: (p.get("n") || "").slice(0, NICK_MAX) };
    const banner = $("#invite-banner");
    banner.innerHTML = `🎧 <b>${esc(inviter.nick || "友達")}</b>さんから相性チェックの招待が届いています。診断すると2人のライブ相性がわかる！`;
    banner.style.display = "block";
  }
  renderTypeGrid();
  route();
}

function renderTypeGrid() {
  $("#typegrid").innerHTML = Object.values(TYPES).map((t) => `<span style="color:${esc(t.color)}">${esc(t.name)}</span>`).join("");
}

// ---------- router ----------
window.addEventListener("hashchange", route);
function route() {
  const h = location.hash || "#/";
  const id = h.startsWith("#/q") ? "quiz" : h.startsWith("#/r") ? "result" : h.startsWith("#/c") ? "compat" : "lp";
  // 状態を持たない画面への直リンクはLPへ（相性リンクはクエリで再現されるので安全）
  if ((id === "result" || id === "compat") && !myResult) { location.hash = "#/"; return; }
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $("#screen-" + id).classList.add("active");
  if (id === "quiz") renderQuestion();
  window.scrollTo(0, 0);
}

// ---------- quiz ----------
$("#start").addEventListener("click", () => { answers = []; location.hash = "#/q"; });
$("#qback").addEventListener("click", () => {
  if (answers.length === 0) { location.hash = "#/"; return; }
  answers.pop(); renderQuestion();
});

function renderQuestion() {
  const i = answers.length;
  if (i >= QUESTIONS.length) return finishQuiz();
  const q = QUESTIONS[i];
  $("#qcount").textContent = `${i + 1} / ${QUESTIONS.length}`;
  $("#progress-i").style.width = `${(i / QUESTIONS.length) * 100}%`;
  $("#qtext").textContent = q.text;
  $("#opts").innerHTML = q.options.map((o, oi) => `<button class="opt" data-i="${oi}">${esc(o.text)}</button>`).join("");
  document.querySelectorAll("#opts .opt").forEach((b) =>
    b.addEventListener("click", () => { answers.push(Number(b.dataset.i)); renderQuestion(); })
  );
}

function finishQuiz() {
  myResult = judge(answers, QUESTIONS);
  if (inviter) { showCompat(); } else { showResult(); }
}

// ---------- result ----------
function typeOf(code) { return TYPES[code]; }
function nearCode(r) { // 最も僅差の軸を反転した「寄り」タイプ
  const i = AXES.findIndex((a) => a.id === r.closest);
  const ax = AXES[i];
  const flipped = r.code[i] === ax.pos ? ax.neg : ax.pos;
  return r.code.slice(0, i) + flipped + r.code.slice(i + 1);
}

function applyTypeColor(color) { document.documentElement.style.setProperty("--type", color); }

async function showResult() {
  const t = typeOf(myResult.code);
  applyTypeColor(t.color);
  $("#rcode").textContent = [...myResult.code].join(" ");
  $("#rname").textContent = t.name;
  $("#rcatch").textContent = t.catch;
  const near = typeOf(nearCode(myResult));
  $("#rsub").textContent = myResult.pure ? "純度高め。芯の通った聴き方タイプ" : `${near.name}寄り`;
  $("#rchips").innerHTML = t.keywords.map((k) => `<span class="chip">#${esc(k)}</span>`).join("");
  $("#rartists").innerHTML = t.artists.map(esc).join("<br>");
  renderAxes();
  location.hash = "#/r";
  // AI解説（失敗・未設定時は fallback 文）
  const box = $("#rtext");
  box.classList.add("loading"); box.textContent = "あなた専用の解説を書いています…";
  const picked = answers.map((ai, qi) => QUESTIONS[qi].options[ai].text);
  const ai = await callWorker("result", { name: t.name, catch: t.catch, keywords: t.keywords, answers: picked, artists: t.artists });
  box.classList.remove("loading");
  box.textContent = (ai && typeof ai.text === "string" && ai.text.trim()) ? ai.text.trim() : t.fallback;
}

function renderAxes() {
  $("#raxes").innerHTML = AXES.map((ax) => {
    const total = QUESTIONS.filter((q) => q.axis === ax.id).reduce((s, q) => s + Math.max(...q.options.map((o) => Object.values(o.weights)[0])), 0);
    const p = myResult.score[ax.pos] || 0, n = myResult.score[ax.neg] || 0;
    const ratio = (n / (p + n || 1)) * 100; // 左=pos極, 右=neg極
    return `<div class="axisrow"><span>${ax.posLabel}</span><div class="bar"><i style="left:${ratio}%"></i></div><span style="text-align:right">${ax.negLabel}</span></div>`;
  }).join("");
}

$("#retry").addEventListener("click", () => { answers = []; inviter = null; myResult = null; history.replaceState(null, "", location.pathname); location.hash = "#/q"; });

// ---------- share card (Canvas) ----------
function drawCard(w, h) {
  const t = typeOf(myResult.code);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const x = cv.getContext("2d");
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, t.color); g.addColorStop(0.55, "#1B1E38"); g.addColorStop(1, "#0E0F1A");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = "rgba(255,255,255,.14)";
  for (let i = 0; i < 24; i++) { x.beginPath(); x.arc((i * 97) % w, (i * 173) % h, 2.2, 0, 7); x.fill(); }
  const cxx = w / 2; const S = w / 1080; // scale基準
  x.textAlign = "center"; x.fillStyle = "#FFFFFF";
  x.font = `800 ${44 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillText("私の聴き方タイプ", cxx, h * 0.18);
  x.font = `900 ${86 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillText(t.name, cxx, h * 0.18 + 120 * S);
  x.font = `700 ${40 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillStyle = "rgba(255,255,255,.92)";
  x.fillText(t.catch, cxx, h * 0.18 + 190 * S);
  x.font = `800 ${34 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillStyle = "rgba(255,255,255,.8)";
  x.fillText([...myResult.code].join(" "), cxx, h * 0.18 + 250 * S);
  x.font = `700 ${36 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillStyle = "#FFFFFF";
  t.artists.slice(0, 3).forEach((a, i) => x.fillText(a, cxx, h * 0.55 + i * 58 * S));
  x.font = `700 ${30 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillStyle = "rgba(255,255,255,.75)";
  x.fillText("#オトタイプ", cxx, h * 0.86);
  x.fillText(siteBase(), cxx, h * 0.86 + 46 * S);
  return cv;
}
function siteBase() { return location.origin + location.pathname.replace(/index\.html$/, ""); }

$("#savecard").addEventListener("click", async () => {
  const cv = drawCard(1080, 1920);
  cv.toBlob(async (blob) => {
    const file = new File([blob], `ototype-${myResult.code}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "オトタイプ診断" }); return; } catch (e) { /* キャンセル時はDLに落とす */ }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    URL.revokeObjectURL(a.href);
    toast("シェアカードを保存しました");
  }, "image/png");
});

// ---------- compat link ----------
$("#makelink").addEventListener("click", async () => {
  const nick = $("#nick").value.trim().slice(0, NICK_MAX);
  const url = `${siteBase()}index.html?a=${answers.join("")}&v=1${nick ? "&n=" + encodeURIComponent(nick) : ""}`;
  const text = `私は「${typeOf(myResult.code).name}」だった🎧 相性チェックしてみて→ ${url}`;
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { /* fallthrough */ } }
  await copy(text); toast("相性リンクをコピーしました");
});

// ---------- compat result ----------
function compatKey(a, b) { return a <= b ? `${a}-${b}` : `${b}-${a}`; }

function liveSuggest(a, b) {
  const bothF = a[0] === "F" && b[0] === "F";
  const bothR = a[0] === "R" && b[0] === "R";
  const bothD = a[2] === "D" && b[2] === "D";
  const sameCoreL = a[1] === "L" && b[1] === "L";
  if (bothF && bothD) return "夏フェス・アリーナ級の大型公演";
  if (bothF) return sameCoreL ? "大合唱が起きるバンドのホールワンマン" : "屋外フェスか対バンイベント";
  if (bothR) return sameCoreL ? "座って聴き入るアコースティック公演" : "音響のいい小箱か配信ライブ";
  return sameCoreL ? "座席ありのホール公演" : "初心者も入りやすいフェスの昼帯";
}

async function showCompat() {
  const me = myResult;
  const other = judge(inviter.answers, QUESTIONS);
  const tMe = typeOf(me.code), tOther = typeOf(other.code);
  applyTypeColor(tMe.color);
  const base = COMPAT[compatKey(me.code, other.code)] || { rating: "○", summary: "聴き方は違っても、音楽が好きなのは同じ" };
  const live = liveSuggest(me.code, other.code);

  $("#vs").innerHTML = `
    <div class="vcard" style="background:color-mix(in srgb, ${esc(tOther.color)} 22%, var(--card))">
      <div class="who">${esc(inviter.nick || "友達")}</div>
      <div class="c" style="color:${esc(tOther.color)}">${[...other.code].join(" ")}</div>
      <div class="n">${esc(tOther.name)}</div>
    </div>
    <div class="vsmark">×</div>
    <div class="vcard" style="background:color-mix(in srgb, ${esc(tMe.color)} 22%, var(--card))">
      <div class="who">あなた</div>
      <div class="c" style="color:${esc(tMe.color)}">${[...me.code].join(" ")}</div>
      <div class="n">${esc(tMe.name)}</div>
    </div>`;
  $("#crating").textContent = base.rating;
  $("#clive").textContent = live;
  location.hash = "#/c";

  const box = $("#ctext");
  box.classList.add("loading"); box.textContent = "2人の化学反応を分析中…";
  const pickedMe = answers.map((ai2, qi) => QUESTIONS[qi].options[ai2].text).slice(0, 5);
  const pickedOther = inviter.answers.map((ai2, qi) => QUESTIONS[qi].options[ai2].text).slice(0, 5);
  const ai = await callWorker("compat", { typeA: tOther.name, answersA: pickedOther, typeB: tMe.name, answersB: pickedMe, rating: base.rating });
  box.classList.remove("loading");
  const fallbackInvite = `ライブ相性${base.rating}だったよ！${live}、いっしょに行かない？🎧`;
  if (ai && typeof ai.text === "string" && ai.text.trim()) {
    box.textContent = ai.text.trim();
    if (typeof ai.live === "string" && ai.live.trim()) $("#clive").textContent = ai.live.trim();
    compatShown = { invite: (typeof ai.invite === "string" && ai.invite.trim()) ? ai.invite.trim() : fallbackInvite };
  } else {
    box.textContent = `${base.summary}。${live}なら、2人とも間違いなく楽しめるはず。`;
    compatShown = { invite: fallbackInvite };
  }
  $("#cinvite").textContent = compatShown.invite;
}

$("#copyinvite").addEventListener("click", async () => { await copy(compatShown.invite); toast("誘い文句をコピーしました"); });
$("#cretry").addEventListener("click", () => { answers = []; inviter = null; myResult = null; history.replaceState(null, "", location.pathname); location.hash = "#/q"; });
$("#cshowmine").addEventListener("click", () => { inviter = null; showResult(); });

// ---------- AI worker ----------
async function callWorker(kind, payload) {
  if (!CONFIG.WORKER_URL) return null;
  try {
    const res = await fetch(CONFIG.WORKER_URL.replace(/\/$/, "") + "/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, payload }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && typeof data === "object") ? data : null;
  } catch (e) { return null; }
}

// ---------- utils ----------
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove();
  }
}
let toastTimer = null;
function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

boot();
