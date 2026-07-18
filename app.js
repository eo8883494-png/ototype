// app.js — オトタイプ SPA 本体。ビルドなし・ライブラリなし・AI不使用（解説はテンプレ）。
// 判定ロジックは scoring.mjs（単一の真実源）。キャラはユーザー制作イラスト assets/chars/{code}.webp。
// ?v= はキャッシュバスター。デプロイで挙動が変わるときは index.html 側と揃えて数字を上げる。
const ASSET_V = "30";
import { judge, AXES, SCALE, AXIS_MAX } from "./scoring.mjs?v=28";
import { pickWeekly } from "./playlist.mjs?v=28";

// ユーザー原画をそのまま表示するタイプ(3:2の一枚絵・切り抜きなし)。残りはシート切り出し版(正方形)。
// 原画が届いたらこのSetに追加するだけで同じ扱いになる。
const FULLART = new Set(["FLDT", "FLDM", "FLET", "FLEM", "FSDT", "FSDM", "FSET", "FSEM", "RLDT", "RLDM", "RLET", "RLEM", "RSDT", "RSDM", "RSET", "RSEM"]);

function charSrc(t) { return `assets/chars/${t.id}.webp?v=${ASSET_V}`; }
function charImg(t, size, lazy = false) {
  // 遅延読み込みはLPマーキーのみ(初回ロード軽量化)。他画面は表示時に即ロード
  const attr = FULLART.has(t.id) ? `height="${size}"` : `width="${size}" height="${size}"`;
  return `<img class="chimg${FULLART.has(t.id) ? " full" : ""}" src="${charSrc(t)}" ${attr}${lazy ? ' loading="lazy"' : ""} alt="${esc(t.name)}のキャラクター">`;
}

// ---------- state ----------
let TYPES = null, QUESTIONS = null, COMPAT = null, PLAYLISTS = null;
let answers = [];            // 自分の回答（0..6、未回答は -1）
let inviter = null;          // { answers:[], nick:"" } 招待リンク経由のとき
let myResult = null;         // judge() の結果
let compatShown = null;      // 直近の相性計算結果（コピー用）

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NICK_MAX = 20;
const LINK_V = "2"; // 招待リンクの版（v2=7段階回答）
const INVITE_SS = "ototype_invite"; // 招待情報のタブ内保存キー(リロード対策。URLには残さない)

function clearInvite() {
  inviter = null;
  try { sessionStorage.removeItem(INVITE_SS); } catch (e) { /* noop */ }
  const banner = $("#invite-banner");
  if (banner) banner.style.display = "none";
}

// ---------- boot ----------
async function boot() {
  const [t, q, c, pls] = await Promise.all([
    fetch(`data/types.json?v=${ASSET_V}`).then((r) => r.json()),
    fetch(`data/questions.json?v=${ASSET_V}`).then((r) => r.json()),
    fetch(`data/compat.json?v=${ASSET_V}`).then((r) => r.json()),
    fetch(`data/playlists.json?v=${ASSET_V}`).then((r) => r.json()),
  ]);
  TYPES = t; QUESTIONS = q; COMPAT = c; PLAYLISTS = pls;

  // 招待リンク ?a=回答列(0-6)&v=2&n=ニックネーム
  // 受け取った招待クエリは即URLから消してsessionStorage(タブ内)に移す。URLに残すと、
  // 招待された人がアドレスバーやアプリの共有機能でこのページを共有したとき
  // 「招待した人のリンク」がそのまま拡散され、別の人の名前で招待が表示される(2026-07-13修正)。
  const p = new URLSearchParams(location.search);
  const a = p.get("a");
  if (p.get("v") === LINK_V && a && new RegExp(`^[0-6]{${QUESTIONS.length}}$`).test(a)) {
    // u=招待者のuid(任意)。相手が相性チェックを終えたとき、招待者の「届いた相性チェック」に記録するため
    const u = p.get("u") || "";
    inviter = {
      answers: [...a].map(Number),
      nick: (p.get("n") || "").slice(0, NICK_MAX),
      uid: /^[A-Za-z0-9]{10,64}$/.test(u) ? u : "",
    };
    try { sessionStorage.setItem(INVITE_SS, JSON.stringify(inviter)); } catch (e) { /* プライベートモード等 */ }
    history.replaceState(null, "", location.pathname + location.hash);
  } else {
    try {
      const saved = JSON.parse(sessionStorage.getItem(INVITE_SS));
      if (saved && Array.isArray(saved.answers) && saved.answers.length === QUESTIONS.length
        && saved.answers.every((n) => Number.isInteger(n) && n >= 0 && n <= 6)) {
        inviter = {
          answers: saved.answers,
          nick: String(saved.nick || "").slice(0, NICK_MAX),
          uid: /^[A-Za-z0-9]{10,64}$/.test(String(saved.uid || "")) ? String(saved.uid) : "",
        };
      }
    } catch (e) { /* 保存なし・壊れたデータは無視 */ }
  }
  if (inviter) {
    const banner = $("#invite-banner");
    banner.innerHTML = `🎧 <b>${esc(inviter.nick || "友達")}</b>さんから相性チェックの招待が届いています。診断すると2人のライブ相性がわかる！`;
    banner.style.display = "block";
  }
  renderCharRow();
  renderSideDeco();
  restoreCharIcon(); // 端末に記憶した推しキャラアイコンを適用
  route();
  initFirebase(); // 記録機能(任意ログイン)。失敗してもサイト本体は動く
}

// ---------- アカウント/きろく(Firebase・zzZFMと共通アカウント) ----------
// ログインは任意。ログイン中のみ診断結果と相性チェックを本人のアカウントに保存する。
// 保存先: ototype/users/{uid}/results, ototype/users/{uid}/compats
const FB = { app: null, auth: null, db: null, A: null, D: null, user: null };

async function initFirebase() {
  try {
    const [appM, A, D] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js"),
    ]);
    FB.app = appM.initializeApp({
      apiKey: "AIzaSyD3KXbGaNLcfVImgeWPkdwl8byS-c54YYE",
      authDomain: "zzzfm-beaaa.firebaseapp.com",
      databaseURL: "https://zzzfm-beaaa-default-rtdb.firebaseio.com",
      projectId: "zzzfm-beaaa",
    });
    FB.A = A; FB.D = D;
    FB.auth = A.getAuth(FB.app);
    FB.db = D.getDatabase(FB.app);
    A.onAuthStateChanged(FB.auth, (u) => {
      FB.user = u || null;
      updateAuthUI();
      if (document.body.dataset.screen === "history") renderHistory(); // きろく画面を開いたままの状態変化に追従
    });
  } catch (e) { /* SDK読込失敗時は記録機能を出さないだけ */ }
}

function inAppBrowser() {
  return /Instagram|Line\/|FBAN|FBAV|Twitter/i.test(navigator.userAgent);
}

async function login() {
  if (!FB.auth) { toast("読み込み中です。少し待ってもう一度どうぞ"); return; }
  if (inAppBrowser()) { toast("アプリ内ブラウザではログインできません。SafariやChromeで開いてください"); return; }
  try {
    await FB.A.signInWithPopup(FB.auth, new FB.A.GoogleAuthProvider());
    toast("ログインしました。これから診断すると自動で記録されます");
  } catch (e) {
    if (e && (e.code === "auth/popup-blocked" || e.code === "auth/cancelled-popup-request")) {
      try { await FB.A.signInWithRedirect(FB.auth, new FB.A.GoogleAuthProvider()); } catch (e2) { toast("ログインできませんでした"); }
    } else if (!(e && e.code === "auth/popup-closed-by-user")) {
      toast("ログインできませんでした");
    }
  }
}
async function logout() { if (FB.auth) { await FB.A.signOut(FB.auth); toast("ログアウトしました"); } }

function updateAuthUI() {
  const b = $("#authbtn"), k = $("#histbtn"), note = $("#loginnote");
  document.body.classList.toggle("authed", !!FB.user); // ログイン限定UI(推しアイコン等)のCSSゲート
  if (!b) return;
  if (FB.user) {
    b.textContent = "ログアウト";
    k.style.display = "";
    if (note) note.style.display = "none";
  } else {
    b.textContent = "ログイン";
    k.style.display = "none";
    if (note) note.style.display = "";
  }
}

// ---------- 推しキャラアイコン(ログイン者限定) ----------
// 選んだキャラにファビコン/ホーム画面アイコンを差し替える。選択は端末に記憶し、次回以降も適用。
const ICON_KEY = "ototype_icon";

function applyCharIcon(code) {
  if (!/^[FR][LS][DE][TM]$/.test(code)) return;
  const base = `assets/icons/c/${code}`;
  document.querySelector('link[rel="icon"][sizes="32x32"]').href = `${base}-32.png?v=2`;
  document.querySelector('link[rel="icon"][sizes="192x192"]').href = `${base}-192.png?v=2`;
  document.querySelector('link[rel="apple-touch-icon"]').href = `${base}-180.png?v=2`;
  document.querySelector('link[rel="manifest"]').href = `assets/icons/m/${code}.webmanifest?v=2`;
}

function setCharIcon(code) {
  applyCharIcon(code);
  try { localStorage.setItem(ICON_KEY, code); } catch (e) { /* プライベートモード等 */ }
  const t = TYPES[code];
  toast(`${t ? t.name : code}をアイコンに設定しました`);
  alert(`アイコンを「${t ? t.name : code}」にしました！\n\nこの状態でブラウザの共有メニューから「ホーム画面に追加」すると、このキャラのアイコンで追加されます。\n(すでに追加済みのアイコンは変わらないので、一度削除してから追加し直してください)`);
}

function restoreCharIcon() {
  try {
    const saved = localStorage.getItem(ICON_KEY);
    if (saved) applyCharIcon(saved);
  } catch (e) { /* no-op */ }
}

function userRef(kind) {
  return FB.D.ref(FB.db, `ototype/users/${FB.user.uid}/${kind}`);
}

async function saveRecord(kind, data) {
  if (!FB.user || !FB.db) return false;
  try {
    await FB.D.push(userRef(kind), data);
    return true;
  } catch (e) { return false; }
}

// ---------- きろく画面 ----------
async function renderHistory() {
  const box = $("#histbody");
  if (!FB.user) {
    box.innerHTML = `<p class="hist-empty">ログインすると、診断結果と相性チェックのきろくが自動で残ります。<br>アカウントはzzZFMと共通です。</p>
      <div class="actions"><button class="btn primary" id="histlogin">Googleでログイン</button></div>`;
    $("#histlogin").addEventListener("click", login);
    return;
  }
  box.innerHTML = `<p class="hist-empty">読み込み中…</p>`;
  try {
    const [rs, cs, ibx] = await Promise.all([
      FB.D.get(FB.D.query(userRef("results"), FB.D.limitToLast(50))),
      FB.D.get(FB.D.query(userRef("compats"), FB.D.limitToLast(50))),
      FB.D.get(FB.D.query(FB.D.ref(FB.db, `ototype/inbox/${FB.user.uid}`), FB.D.limitToLast(50))),
    ]);
    const results = []; rs.forEach((s) => results.push(s.val()));
    const compats = []; cs.forEach((s) => compats.push(s.val()));
    const inbox = []; ibx.forEach((s) => inbox.push(s.val()));
    results.reverse(); compats.reverse(); inbox.reverse();
    const fmt = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
    const rrows = results.map((r) => {
      const t = TYPES[r.code]; if (!t) return "";
      return `<button class="hrow" data-a="${esc(r.a)}">${charImg(t, 44)}<span class="hmeta"><b>${esc(t.name)}</b><i>${fmt(r.ts)}</i></span><span class="tarrow">›</span></button>`;
    }).join("");
    const crows = compats.map((c) => {
      const a = TYPES[c.me], b = TYPES[c.other]; if (!a || !b) return "";
      return `<div class="hrow flat"><span class="hrate" style="color:${esc(a.color)}">${esc(c.rating)}</span><span class="hmeta"><b>${esc(c.nick || "友達")}(${esc(b.name)}) × あなた(${esc(a.name)})</b><i>${fmt(c.ts)}</i></span></div>`;
    }).join("");
    const irows = inbox.map((c) => {
      const a = TYPES[c.fromCode], b = TYPES[c.myCode]; if (!a || !b) return "";
      return `<div class="hrow flat"><span class="hrate" style="color:${esc(a.color)}">${esc(c.rating)}</span><span class="hmeta"><b>${esc(c.from || "だれか")}(${esc(a.name)}) × あなた(${esc(b.name)})</b><i>${fmt(c.ts)}</i></span></div>`;
    }).join("");
    box.innerHTML = `
      <h3 class="histh">診断のきろく</h3>
      ${rrows || '<p class="hist-empty">まだ診断のきろくがありません。</p>'}
      <h3 class="histh">相性チェックのきろく</h3>
      ${crows || '<p class="hist-empty">まだ相性チェックのきろくがありません。</p>'}
      <h3 class="histh">届いた相性チェック</h3>
      <p class="pl-week">あなたの相性リンクから友達がチェックしてくれた結果です。ログイン中に作ったリンクだけが届きます。</p>
      ${irows || '<p class="hist-empty">まだ届いていません。結果画面から相性リンクを送ってみよう。</p>'}
      <div class="actions">
        <button class="btn ghost" id="histclear">きろくを全部削除する</button>
      </div>
      <p class="pl-hint">きろくはあなたのGoogleアカウントにひも付けて保存され、本人だけが見られます。</p>`;
    document.querySelectorAll(".hrow[data-a]").forEach((el) =>
      el.addEventListener("click", () => {
        answers = [...el.dataset.a].map(Number);
        clearInvite();
        myResult = judge(answers, QUESTIONS);
        showResult({ skipSave: true });
      })
    );
    $("#histclear").addEventListener("click", async () => {
      if (!confirm("診断と相性のきろくをすべて削除します。よろしいですか？")) return;
      await FB.D.remove(FB.D.ref(FB.db, `ototype/users/${FB.user.uid}`));
      try { await FB.D.remove(FB.D.ref(FB.db, `ototype/inbox/${FB.user.uid}`)); } catch (e) { /* noop */ }
      toast("きろくを削除しました");
      renderHistory();
    });
  } catch (e) {
    box.innerHTML = `<p class="hist-empty">きろくを読み込めませんでした。時間をおいて再度お試しください。</p>`;
  }
}

// PC(広い画面)専用の両サイド装飾: キャラ6体+音符。表示制御はCSS(1100px未満とクイズ中は非表示)
function renderSideDeco() {
  const picks = ["FSDM", "RLDT", "RSEM", "FSET", "RLEM", "RSDT"];
  const deco = document.createElement("div");
  deco.id = "sidedeco";
  deco.setAttribute("aria-hidden", "true");
  deco.innerHTML =
    picks.map((c, i) => `<img class="sd${i + 1}" src="${charSrc(TYPES[c])}" alt="">`).join("") +
    `<span class="nt n1">♪</span><span class="nt n2">♫</span><span class="nt n3">♩</span><span class="nt n4">♪</span>`;
  document.body.appendChild(deco);
}

// LPのキャラ行進（マーキー用に2周分並べて -50% ループ）
function renderCharRow() {
  const slots = Object.values(TYPES).map((t) =>
    `<span class="cslot">${charImg(t, 64, true)}<span class="cname">${esc(t.name)}</span></span>`
  ).join("");
  $("#chartrack").innerHTML = slots + slots;
}

// ---------- router ----------
// iOS Safariでは「最終問の回答時のスムーズスクロール」や履歴のスクロール復元が
// 画面切替後も効いてしまい、結果画面が下スクロール位置で表示されることがある。
// → 復元を無効化し、切替時は複数タイミングで先頭へ戻す(進行中のアニメーションを打ち消す)
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
function scrollTopHard() {
  const s = () => window.scrollTo(0, 0);
  s();
  requestAnimationFrame(s);
  setTimeout(s, 80);
  setTimeout(s, 300);
}

window.addEventListener("hashchange", route);
function route() {
  if (!TYPES) return; // データ読込完了前のhashchangeで例外にしない(boot完了時にrouteが呼ばれる)
  const h = location.hash || "#/";
  const detailCode = h.match(/^#\/t\/([FR][LS][DE][TM])$/)?.[1];
  const id = h.startsWith("#/q") ? "quiz" : h.startsWith("#/r") ? "result" : h.startsWith("#/c") ? "compat"
    : h.startsWith("#/log") ? "history"
    : (detailCode && TYPES[detailCode]) ? "typedetail" : h.startsWith("#/t") ? "types" : "lp";
  // 状態を持たない画面への直リンクはLPへ（招待はsessionStorageで同タブのリロードに耐える）
  if ((id === "result" || id === "compat") && !myResult) { location.hash = "#/"; return; }
  if (id === "compat" && !compatShown) { location.hash = "#/"; return; } // 相性未計算で#/cへ来ても空画面を出さない
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $("#screen-" + id).classList.add("active");
  document.body.dataset.screen = id;
  // 画面ごとにテーマ色を復元（図鑑詳細で変えた色が結果画面や戻り先に残らないように）
  if (id === "result" || id === "compat") applyTypeColor(typeOf(myResult.code).color);
  else if (id !== "typedetail") applyTypeColor(DEFAULT_TYPE_COLOR);
  if (id === "quiz" && !$("#qlist").childElementCount) renderQuiz();
  // 結果から「戻る」で設問へ戻ったとき、全問回答済みなら完了ボタンを出し直す
  if (id === "quiz" && answers.length === QUESTIONS.length && answers.every((a) => a >= 0)) $("#finishbar").classList.add("show");
  if (id === "types") renderTypesGrid();
  if (id === "typedetail") renderTypeDetail(detailCode);
  // 診断済みなら図鑑/タイプ詳細から結果画面へ戻れる導線を出す
  if (id === "types") $("#tresult").style.display = myResult ? "" : "none";
  if (id === "typedetail") $("#tdresult").style.display = myResult ? "" : "none";
  if (id === "history") renderHistory();
  scrollTopHard();
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
  if (document.body.dataset.screen !== "quiz") return; // 連打での二重保存・二重計測を防止(1回目で画面が切り替わる)
  myResult = judge(answers, QUESTIONS);
  $("#finishbar").classList.remove("show");
  track("quiz_complete", { result_type: myResult.code, via_invite: !!inviter });
  if (inviter) { showCompat(); } else { showResult(); }
  scrollTopHard(); // クイズ末尾からの切替時、進行中のスクロールを打ち消して先頭表示
});

// ---------- result ----------
function typeOf(code) { return TYPES[code]; }
function nearCode(r) { // 最も僅差の軸を反転した「寄り」タイプ
  const i = AXES.findIndex((a) => a.id === r.closest);
  const ax = AXES[i];
  const flipped = r.code[i] === ax.pos ? ax.neg : ax.pos;
  return r.code.slice(0, i) + flipped + r.code.slice(i + 1);
}

const DEFAULT_TYPE_COLOR = "#E88CA4"; // style.css :root --type と同値
function applyTypeColor(color) { document.documentElement.style.setProperty("--type", color); }

function showResult(opts = {}) {
  const t = typeOf(myResult.code);
  applyTypeColor(t.color);
  if (!opts.skipSave && FB.user) {
    saveRecord("results", { ts: Date.now(), code: myResult.code, a: answers.join("") })
      .then((ok) => { if (ok) toast("きろくに保存しました"); });
  }
  $("#rchar").innerHTML = charImg(t, 132);
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

// 検索先サービス(2026-07-18: Apple Music対応の要望を受けて切替式に)
const MUSIC_SERVICES = [
  { id: "spotify", label: "Spotify", url: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
  { id: "apple", label: "Apple Music", url: (q) => `https://music.apple.com/jp/search?term=${encodeURIComponent(q)}` },
  { id: "ytm", label: "YouTube Music", url: (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}` },
];
function getMusicService() {
  const saved = localStorage.getItem("ototype_music_service");
  return MUSIC_SERVICES.find((s) => s.id === saved) || MUSIC_SERVICES[0];
}

function playlistHTML(t) {
  const pool = PLAYLISTS[t.id] || [];
  const { songs } = pickWeekly(pool);
  const svc = getMusicService();
  const tabs = MUSIC_SERVICES.map((s) =>
    `<button class="svctab${s.id === svc.id ? " on" : ""}" data-svc="${s.id}" type="button">${s.label}</button>`).join("");
  const rows = songs.map((s, i) =>
    `<a class="song" href="${svc.url(s.t + " " + s.a)}" target="_blank" rel="noopener">
      <span class="no">${i + 1}</span><span class="meta"><span class="st">${esc(s.t)}</span><span class="sa">${esc(s.a)}</span></span><span class="go">🔍</span>
    </a>`).join("");
  return `<p class="pl-title">「${esc(t.playlist.title)}」</p>
    <p class="pl-week">今週の10曲 — 毎週自動で入れ替わります。タップで曲を検索できます。</p>
    <div class="svctabs">${tabs}</div>
    <div class="songs">${rows}</div>
    <p class="pl-hint">選曲はエンタメ目的の例示です。楽曲は各サービスの公式配信でお楽しみください。</p>`;
}

function renderPlaylist(t) {
  $("#plbody").innerHTML = playlistHTML(t);
  $("#plbody").querySelectorAll(".svctab").forEach((btn) => {
    btn.addEventListener("click", () => {
      localStorage.setItem("ototype_music_service", btn.dataset.svc);
      renderPlaylist(t);
    });
  });
}

$("#retry").addEventListener("click", () => { clearInvite(); myResult = null; history.replaceState(null, "", location.pathname); startQuiz(); });
$("#rtypes").addEventListener("click", () => { location.hash = "#/t"; });
$("#ricon").addEventListener("click", () => { if (myResult) setCharIcon(myResult.code); });
$("#rdetail").addEventListener("click", () => { if (myResult) location.hash = "#/t/" + myResult.code; });

// ---------- types zukan（キャラグリッド） ----------
$("#gotypes").addEventListener("click", () => { location.hash = "#/t"; });
$("#authbtn").addEventListener("click", () => { FB.user ? logout() : login(); });
$("#histbtn").addEventListener("click", () => { location.hash = "#/log"; });
$("#histback").addEventListener("click", () => { location.hash = "#/"; });
$("#rlogin").addEventListener("click", login);
$("#tstart").addEventListener("click", startQuiz);
$("#tdstart").addEventListener("click", startQuiz);
$("#tback").addEventListener("click", () => { location.hash = "#/"; });
$("#tdback").addEventListener("click", () => { location.hash = "#/t"; });
$("#tresult").addEventListener("click", () => { location.hash = "#/r"; });
$("#tdresult").addEventListener("click", () => { location.hash = "#/r"; });

let typesRendered = false;
function renderTypesGrid() {
  if (typesRendered) return;
  typesRendered = true;
  $("#typegrid").innerHTML = Object.values(TYPES).map((t) => `
    <a class="ttile" href="#/t/${t.id}" style="background:color-mix(in srgb, ${esc(t.color)} 10%, #fff);border-color:color-mix(in srgb, ${esc(t.color)} 35%, #fff)">
      ${charImg(t, 108)}
      <span class="tc" style="background:${esc(t.color)}">${t.id}</span>
      <span class="tn">${esc(t.name)}</span>
    </a>`).join("");
}

// ---------- type detail（個別紹介ページ） ----------
function compatPartners(code) { // ライブ相性◎の4タイプ（1軸だけ違う相手）
  return Object.keys(TYPES).filter((c) => c !== code && (COMPAT[compatKey(code, c)] || {}).rating === "◎");
}

function renderTypeDetail(code) {
  const t = TYPES[code];
  const d = t.details;
  applyTypeColor(t.color);
  $("#tdbody").innerHTML = `
    <div class="rcard">
      <div class="rchar">${charImg(t, 150)}</div>
      <p class="rcode">${[...t.id].join(" ")}</p>
      <h2 class="rname">${esc(t.name)}</h2>
      <p class="rcatch">${esc(t.catch)}</p>
      <div class="chips">${t.keywords.map((k) => `<span class="chip">#${esc(k)}</span>`).join("")}</div>
    </div>
    <div class="panel"><h3>どんなタイプ？</h3><p class="tdtext">${esc(d.intro)}</p></div>
    <div class="panel"><h3>${esc(t.name)}のあるある</h3><ul class="aruaru">${d.aruaru.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>
    <div class="panel"><h3>ライブ・現場での姿</h3><p class="tdtext">${esc(d.live)}</p></div>
    <div class="panel"><h3>この聴き方の強み</h3><p class="tdtext">${esc(d.strength)}</p></div>
    <div class="panel"><h3>代表アーティスト</h3><p class="strong">${t.artists.map(esc).join(" / ")}</p></div>
    <div class="panel playlist">
      <h3>🎵 今週のプレイリスト</h3>
      ${playlistHTML(t)}
      <h4 class="pl-sub">組み方のコツ</h4>
      <ol class="pl-recipe">${t.playlist.recipe.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>
    </div>
    <div class="panel">
      <h3>ライブ相性◎のタイプ</h3>
      <div class="buddies">${compatPartners(code).map((c) => {
        const b = TYPES[c];
        return `<a class="buddy" href="#/t/${c}">${charImg(b, 64)}<span>${esc(b.name)}</span></a>`;
      }).join("")}</div>
    </div>
    <button class="btn iconbtn" id="tdicon">このキャラをホーム画面アイコンにする</button>`;
  $("#tdicon").addEventListener("click", () => setCharIcon(code));
  $("#tdbody").querySelectorAll(".svctab").forEach((btn) => {
    btn.addEventListener("click", () => {
      localStorage.setItem("ototype_music_service", btn.dataset.svc);
      renderTypeDetail(code);
    });
  });
}

// ---------- share card (Canvas) ----------
function loadCharImage(t) { // キャライラスト→Image（Canvasへ合成するため）
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // 失敗してもカードは作る
    img.src = charSrc(t);
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
    // 固定枠(620x600相当)に全体を収めて描画(変形・切り抜きなし)。全タイプで大きさが揃う
    const boxW = 620 * S, boxH = 600 * S;
    const sc = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
    x.drawImage(img, cxx - dw / 2, h * 0.40 + (boxH - dh) / 2, dw, dh);
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

$("#sharex").addEventListener("click", () => {
  track("share_x", { result_type: myResult.code });
  const t = typeOf(myResult.code);
  const text = `私は「${t.name}」だった🎧 #オトタイプ\n音楽の聴き方を16タイプに分ける無料診断`;
  const u = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteBase())}`;
  window.open(u, "_blank", "noopener");
});

$("#savecard").addEventListener("click", async () => {
  track("share_card", { result_type: myResult.code });
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
  track("make_invite_link", { result_type: myResult.code });
  const nick = $("#nick").value.trim().slice(0, NICK_MAX);
  // ログイン中はuidをリンクに含める→相手がチェックを終えたら「届いた相性チェック」に記録される
  const uidPart = FB.user ? `&u=${encodeURIComponent(FB.user.uid)}` : "";
  const url = `${siteBase()}index.html?a=${answers.join("")}&v=${LINK_V}${nick ? "&n=" + encodeURIComponent(nick) : ""}${uidPart}`;
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
      ${charImg(tOther, 100)}
      <div class="c" style="color:${esc(tOther.color)}">${[...other.code].join(" ")}</div>
      <div class="n">${esc(tOther.name)}</div>
    </div>
    <div class="vsmark">×</div>
    <div class="vcard" style="border-color:${esc(tMe.color)}">
      <div class="who">あなた</div>
      ${charImg(tMe, 100)}
      <div class="c" style="color:${esc(tMe.color)}">${[...me.code].join(" ")}</div>
      <div class="n">${esc(tMe.name)}</div>
    </div>`;
  if (FB.user) {
    saveRecord("compats", { ts: Date.now(), nick: inviter.nick || "", me: me.code, other: other.code, rating: base.rating })
      .then((ok) => { if (ok) toast("きろくに保存しました"); });
  }
  // 招待者側の「届いた相性チェック」に記録(リンクにuidが入っていた場合のみ。書き込みはログイン不要)
  if (inviter.uid && FB.db) {
    const fromName = (FB.user && FB.user.displayName) ? String(FB.user.displayName).slice(0, NICK_MAX) : "";
    try {
      FB.D.push(FB.D.ref(FB.db, `ototype/inbox/${inviter.uid}`), {
        ts: Date.now(), from: fromName, fromCode: me.code, myCode: other.code, rating: base.rating,
      });
    } catch (e) { /* 通知に失敗しても相性表示は続行 */ }
  }
  $("#crating").textContent = base.rating;
  $("#clive").textContent = live;
  $("#ctext").textContent = `${base.summary}。${live}なら、2人とも間違いなく楽しめるはず。`;
  compatShown = { invite: `ライブ相性${base.rating}だったよ！${live}、いっしょに行かない？🎧` };
  $("#cinvite").textContent = compatShown.invite;
  location.hash = "#/c";
}

$("#copyinvite").addEventListener("click", async () => { if (!compatShown) return; await copy(compatShown.invite); toast("誘い文句をコピーしました"); });
$("#cretry").addEventListener("click", () => { clearInvite(); myResult = null; history.replaceState(null, "", location.pathname); startQuiz(); });
$("#cshowmine").addEventListener("click", () => { clearInvite(); showResult(); });

// ---------- utils ----------
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove();
  }
}
// GA4カスタムイベント(gtag未ロードでも安全に無視)
function track(name, params) {
  try { if (typeof gtag === "function") gtag("event", name, params || {}); } catch (e) { /* no-op */ }
}

let toastTimer = null;
function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

boot();
