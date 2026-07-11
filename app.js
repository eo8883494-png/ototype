// app.js — オトタイプ SPA 本体。ビルドなし・ライブラリなし・AI不使用（解説はテンプレ）。
// 判定ロジックは scoring.mjs（単一の真実源）、キャラは chars.mjs を import する。
import { judge, AXES, SCALE, AXIS_MAX } from "./scoring.mjs";
import { charSVG } from "./chars.mjs";

// ---------- state ----------
let TYPES = null, QUESTIONS = null, COMPAT = null;
let answers = [];            // 自分の回答（0..6、未回答は -1）
let inviter = null;          // { answers:[], nick:"" } 招待リンク経由のとき
let myResult = null;         // judge() の結果
let compatShown = null;      // 直近の相性計算結果（コピー用）

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NICK_MAX = 20;
const LINK_V = "2"; // 招待リンクの版（v2=7段階回答）

// ---------- boot ----------
async function boot() {
  const [t, q, c] = await Promise.all([
    fetch("data/types.json").then((r) => r.json()),
    fetch("data/questions.json").then((r) => r.json()),
    fetch("data/compat.json").then((r) => r.json()),
  ]);
  TYPES = t; QUESTIONS = q; COMPAT = c;

  // 招待リンク ?a=回答列(0-6)&v=2&n=ニックネーム
  const p = new URLSearchParams(location.search);
  const a = p.get("a");
  if (p.get("v") === LINK_V && a && new RegExp(`^[0-6]{${QUESTIONS.length}}$`).test(a)) {
    inviter = { answers: [...a].map(Number), nick: (p.get("n") || "").slice(0, NICK_MAX) };
    const banner = $("#invite-banner");
    banner.innerHTML = `🎧 <b>${esc(inviter.nick || "友達")}</b>さんから相性チェックの招待が届いています。診断すると2人のライブ相性がわかる！`;
    banner.style.display = "block";
  }
  renderCharRow();
  route();
}

// LPのキャラ行進（マーキー用に2周分並べて -50% ループ）
function renderCharRow() {
  const slots = Object.values(TYPES).map((t) =>
    `<span class="cslot">${charSVG(t, 64)}<span class="cname">${esc(t.name)}</span></span>`
  ).join("");
  $("#chartrack").innerHTML = slots + slots;
}

// ---------- router ----------
window.addEventListener("hashchange", route);
function route() {
  const h = location.hash || "#/";
  const id = h.startsWith("#/q") ? "quiz" : h.startsWith("#/r") ? "result" : h.startsWith("#/c") ? "compat" : h.startsWith("#/t") ? "types" : "lp";
  // 状態を持たない画面への直リンクはLPへ（相性リンクはクエリで再現されるので安全）
  if ((id === "result" || id === "compat") && !myResult) { location.hash = "#/"; return; }
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $("#screen-" + id).classList.add("active");
  if (id === "quiz" && !$("#qlist").childElementCount) renderQuiz();
  if (id === "types") renderTypesList();
  window.scrollTo(0, 0);
}

// ---------- quiz（7段階同意スケール・1ページスクロール式） ----------
$("#start").addEventListener("click", startQuiz);
$("#qback").addEventListener("click", () => { location.hash = "#/"; });

function startQuiz() {
  answers = Array(QUESTIONS.length).fill(-1);
  $("#qlist").innerHTML = "";
  $("#finishbar").classList.remove("show");
  location.hash = "#/q";
  renderQuiz();
}

function renderQuiz() {
  if (answers.length !== QUESTIONS.length) answers = Array(QUESTIONS.length).fill(-1);
  $("#qlist").innerHTML = QUESTIONS.map((q, qi) => `
    <div class="qitem${qi === 0 ? " current" : ""}" id="qi${qi}">
      <p class="qtext">${esc(q.text)}</p>
      <div class="scale">
        ${Array.from({ length: SCALE }, (_, s) =>
          `<button class="dotbtn s${s} ${s < 3 ? "agree" : s > 3 ? "disagree" : ""}" data-q="${qi}" data-s="${s}" aria-label="Q${qi + 1} 選択肢${s + 1}"></button>`
        ).join("")}
      </div>
      <div class="scale-labels"><span class="agree">そう思う</span><span class="disagree">そう思わない</span></div>
    </div>`).join("");
  updateProgress();
  document.querySelectorAll(".dotbtn").forEach((b) => b.addEventListener("click", onPick));
}

function onPick(e) {
  const qi = Number(e.currentTarget.dataset.q);
  const s = Number(e.currentTarget.dataset.s);
  answers[qi] = s;
  const item = $("#qi" + qi);
  item.querySelectorAll(".dotbtn").forEach((b) => b.classList.toggle("picked", Number(b.dataset.s) === s));
  item.classList.add("answered");
  item.classList.remove("current");
  updateProgress();
  // 次の未回答へスムーズスクロール
  const next = answers.findIndex((a) => a === -1);
  if (next >= 0) {
    const el = $("#qi" + next);
    el.classList.add("current");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    $("#finishbar").classList.add("show");
    $("#finishbar").scrollIntoView({ behavior: "smooth", block: "end" });
  }
}

function updateProgress() {
  const done = answers.filter((a) => a >= 0).length;
  $("#qcount").textContent = `${done} / ${QUESTIONS.length}`;
  $("#progress-i").style.width = `${(done / QUESTIONS.length) * 100}%`;
}

$("#finishquiz").addEventListener("click", () => {
  if (answers.some((a) => a < 0)) return;
  myResult = judge(answers, QUESTIONS);
  $("#finishbar").classList.remove("show");
  if (inviter) { showCompat(); } else { showResult(); }
});

// ---------- result ----------
function typeOf(code) { return TYPES[code]; }
function nearCode(r) { // 最も僅差の軸を反転した「寄り」タイプ
  const i = AXES.findIndex((a) => a.id === r.closest);
  const ax = AXES[i];
  const flipped = r.code[i] === ax.pos ? ax.neg : ax.pos;
  return r.code.slice(0, i) + flipped + r.code.slice(i + 1);
}

function applyTypeColor(color) { document.documentElement.style.setProperty("--type", color); }

function showResult() {
  const t = typeOf(myResult.code);
  applyTypeColor(t.color);
  $("#rchar").innerHTML = charSVG(t, 116);
  $("#rcode").textContent = [...myResult.code].join(" ");
  $("#rname").textContent = t.name;
  $("#rcatch").textContent = t.catch;
  const near = typeOf(nearCode(myResult));
  $("#rsub").textContent = myResult.pure ? "純度高め。芯の通った聴き方タイプ" : `${near.name}寄り`;
  $("#rchips").innerHTML = t.keywords.map((k) => `<span class="chip">#${esc(k)}</span>`).join("");
  $("#rartists").innerHTML = t.artists.map(esc).join("<br>");
  $("#rtext").textContent = t.fallback;
  renderAxes();
  renderPlaylist(t);
  location.hash = "#/r";
}

const AXIS_COLORS = { place: "#4A9FD8", core: "#E8B33C", into: "#4FB07A", find: "#9B6BE0" };

function renderAxes() {
  $("#raxes").innerHTML = `<h3 class="axtitle">聴き方の特性</h3>` + AXES.map((ax) => {
    const total = myResult.totals[ax.id]; // +AXIS_MAX(pos極寄り) 〜 -AXIS_MAX(neg極寄り)
    const posPct = Math.round(((total + AXIS_MAX) / (AXIS_MAX * 2)) * 100);
    const posWin = total >= 0;
    const winPct = posWin ? posPct : 100 - posPct;
    const winLabel = posWin ? ax.posLabel : ax.negLabel;
    const ratio = 100 - posPct; // マーカー位置（左=pos極, 右=neg極、勝ち側に寄る）
    const c = AXIS_COLORS[ax.id];
    return `<div class="axisblock">
      <p class="axhead">${ax.label}: <b style="color:${c}">${winPct}% ${winLabel}</b></p>
      <div class="bar2" style="background:${c}"><i style="left:${ratio}%;border-color:${c}"></i></div>
      <div class="axpoles"><span class="${posWin ? "win" : ""}">${ax.posLabel}</span><span class="${posWin ? "" : "win"}">${ax.negLabel}</span></div>
    </div>`;
  }).join("");
}

function renderPlaylist(t) {
  const pl = t.playlist || { title: "あなたの定番リスト", recipe: [] };
  $("#pltitle").textContent = `「${pl.title}」`;
  $("#plrecipe").innerHTML = pl.recipe.map((r) => `<li>${esc(r)}</li>`).join("");
  $("#pllinks").innerHTML = t.artists.slice(0, 3).map((a) =>
    `<a href="https://open.spotify.com/search/${encodeURIComponent(a)}" target="_blank" rel="noopener">🔍 ${esc(a)}</a>`
  ).join("") + `<a href="https://music.youtube.com/search?q=${encodeURIComponent(t.artists[0] || "")}" target="_blank" rel="noopener">▶ YouTube Musicで探す</a>`;
}

$("#retry").addEventListener("click", () => { inviter = null; myResult = null; history.replaceState(null, "", location.pathname); startQuiz(); });
$("#rtypes").addEventListener("click", () => { location.hash = "#/t"; });

// ---------- types list ----------
$("#gotypes").addEventListener("click", () => { location.hash = "#/t"; });
$("#tstart").addEventListener("click", startQuiz);
$("#tback").addEventListener("click", () => { location.hash = "#/"; });

let typesRendered = false;
function renderTypesList() {
  if (typesRendered) return;
  typesRendered = true;
  $("#typelist").innerHTML = Object.values(TYPES).map((t) => `
    <div class="tcard" id="tc-${t.id}">
      <button class="tcard-head" data-t="${t.id}">
        <span class="tchar">${charSVG(t, 46)}</span>
        <span class="tc" style="background:${esc(t.color)}">${t.id}</span>
        <span class="tn">${esc(t.name)}</span>
        <span class="tarrow">›</span>
      </button>
      <div class="tcard-body">
        <p class="tcatch" style="color:${esc(t.color)}">${esc(t.catch)}</p>
        <p class="tdesc">${esc(t.fallback)}</p>
        <h4>代表アーティスト</h4>
        <p class="tart">${t.artists.map(esc).join(" / ")}</p>
        <h4>プレイリストレシピ「${esc(t.playlist.title)}」</h4>
        <p class="tpl">${t.playlist.recipe.map(esc).join("<br>")}</p>
      </div>
    </div>`).join("");
  document.querySelectorAll(".tcard-head").forEach((b) =>
    b.addEventListener("click", () => $("#tc-" + b.dataset.t).classList.toggle("open"))
  );
}

// ---------- share card (Canvas) ----------
function loadCharImage(t) { // キャラSVG→Image（Canvasへ合成するため）
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([charSVG(t, 480)], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); }; // 失敗してもカードは作る
    img.src = url;
  });
}

async function drawCard(w, h) {
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
  x.fillText("私の聴き方タイプ", cxx, h * 0.14);
  x.font = `900 ${86 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillText(t.name, cxx, h * 0.14 + 120 * S);
  x.font = `700 ${40 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillStyle = "rgba(255,255,255,.92)";
  x.fillText(t.catch, cxx, h * 0.14 + 190 * S);
  x.font = `800 ${34 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillStyle = "rgba(255,255,255,.8)";
  x.fillText([...myResult.code].join(" "), cxx, h * 0.14 + 250 * S);
  const img = await loadCharImage(t);
  if (img) {
    const cw = 430 * S;
    x.drawImage(img, cxx - cw / 2, h * 0.40, cw, cw);
  }
  x.font = `700 ${36 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillStyle = "#FFFFFF";
  t.artists.slice(0, 3).forEach((a, i) => x.fillText(a, cxx, h * 0.68 + i * 58 * S));
  x.font = `700 ${30 * S}px 'M PLUS Rounded 1c',sans-serif`;
  x.fillStyle = "rgba(255,255,255,.75)";
  x.fillText("#オトタイプ", cxx, h * 0.88);
  x.fillText(siteBase(), cxx, h * 0.88 + 46 * S);
  return cv;
}
function siteBase() { return location.origin + location.pathname.replace(/index\.html$/, ""); }

$("#savecard").addEventListener("click", async () => {
  const cv = await drawCard(1080, 1920);
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
  const url = `${siteBase()}index.html?a=${answers.join("")}&v=${LINK_V}${nick ? "&n=" + encodeURIComponent(nick) : ""}`;
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

function showCompat() {
  const me = myResult;
  const other = judge(inviter.answers, QUESTIONS);
  const tMe = typeOf(me.code), tOther = typeOf(other.code);
  applyTypeColor(tMe.color);
  const base = COMPAT[compatKey(me.code, other.code)] || { rating: "○", summary: "聴き方は違っても、音楽が好きなのは同じ" };
  const live = liveSuggest(me.code, other.code);

  $("#vs").innerHTML = `
    <div class="vcard" style="border-color:${esc(tOther.color)}">
      <div class="who">${esc(inviter.nick || "友達")}</div>
      <div class="c" style="color:${esc(tOther.color)}">${[...other.code].join(" ")}</div>
      <div class="n">${esc(tOther.name)}</div>
    </div>
    <div class="vsmark">×</div>
    <div class="vcard" style="border-color:${esc(tMe.color)}">
      <div class="who">あなた</div>
      <div class="c" style="color:${esc(tMe.color)}">${[...me.code].join(" ")}</div>
      <div class="n">${esc(tMe.name)}</div>
    </div>`;
  $("#crating").textContent = base.rating;
  $("#clive").textContent = live;
  $("#ctext").textContent = `${base.summary}。${live}なら、2人とも間違いなく楽しめるはず。`;
  compatShown = { invite: `ライブ相性${base.rating}だったよ！${live}、いっしょに行かない？🎧` };
  $("#cinvite").textContent = compatShown.invite;
  location.hash = "#/c";
}

$("#copyinvite").addEventListener("click", async () => { await copy(compatShown.invite); toast("誘い文句をコピーしました"); });
$("#cretry").addEventListener("click", () => { inviter = null; myResult = null; history.replaceState(null, "", location.pathname); startQuiz(); });
$("#cshowmine").addEventListener("click", () => { inviter = null; showResult(); });

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
