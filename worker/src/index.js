// worker/src/index.js — Anthropic API 中継 Worker（オトタイプ）。
// POST /generate  body: { kind: "result" | "compat", payload: {...} }
// APIキーは `wrangler secret put ANTHROPIC_API_KEY` で登録（コードに書かない）。

const ALLOWED_ORIGIN = "https://eo8883494-png.github.io"; // ←自分のGitHub PagesのオリジンにREADME参照で差し替え
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";        // 環境変数 MODEL で上書き可
const MAX_TOKENS = 500;

// 簡易レート制限（IPごと 10リクエスト/10分。isolate単位のメモリなので厳密ではない）
const BUCKET = new Map();
const LIMIT = 10, WINDOW_MS = 10 * 60 * 1000;
function rateLimited(ip) {
  const now = Date.now();
  const arr = (BUCKET.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) { BUCKET.set(ip, arr); return true; }
  arr.push(now); BUCKET.set(ip, arr); return false;
}

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
}
const json = (obj, status, origin) => new Response(JSON.stringify(obj), { status, headers: cors(origin) });

// ---- 入力検証 ----
const str = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;
const arrOfStr = (v, maxLen, maxItem) => Array.isArray(v) && v.length <= maxLen && v.every((s) => str(s, maxItem));

function validate(body) {
  if (!body || typeof body !== "object") return null;
  const { kind, payload: p } = body;
  if (kind === "result") {
    if (p && str(p.name, 30) && str(p.catch, 60) && arrOfStr(p.keywords, 5, 20) && arrOfStr(p.answers, 25, 60) && arrOfStr(p.artists, 6, 40)) return { kind, p };
    return null;
  }
  if (kind === "compat") {
    if (p && str(p.typeA, 30) && str(p.typeB, 30) && arrOfStr(p.answersA, 10, 60) && arrOfStr(p.answersB, 10, 60) && ["◎", "○", "△"].includes(p.rating)) return { kind, p };
    return null;
  }
  return null;
}

// ---- プロンプト（PRD §11 準拠）----
const SYS_RESULT = "あなたは若者向け音楽診断サービスの専属ライター。断定口調で親しみやすく、必ず相手を肯定する。絵文字は最大2つ。250字以内。渡されたアーティスト名以外の固有名詞を出さない。事実の創作をしない。";
const SYS_COMPAT = SYS_RESULT + "どんな組み合わせも最後は『一緒に行ける』に着地させる。2人の関係を絶対に壊さない。";

function userPrompt(kind, p) {
  if (kind === "result") {
    return `タイプ: ${p.name}（${p.catch}） / キーワード: ${p.keywords.join("、")} / 本人が選んだ回答: ${JSON.stringify(p.answers)} / 代表アーティスト: ${p.artists.join("、")}\nこの人の診断結果コメントを書いて。構成: ①タイプの本質を一言で断定 ②回答から2つを具体的に引用して「見抜かれた感」を出す ③代表アーティストの聴き方の提案で締める。`;
  }
  return `Aさん: ${p.typeA}・回答抜粋${JSON.stringify(p.answersA)} / Bさん: ${p.typeB}・回答抜粋${JSON.stringify(p.answersB)} / ベース相性: ${p.rating}\nJSONのみで返答: {"text": "2人の音楽的な化学反応(150字以内)", "live": "一緒に行くべきライブの系統ひとつ", "invite": "そのままLINEで送れる誘い文句。口語20〜40字、絵文字1つまで"}`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/generate") return json({ error: "not found" }, 404, origin);
    if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "forbidden origin" }, 403, origin);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) return json({ error: "rate limited" }, 429, origin);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, origin); }
    const v = validate(body);
    if (!v) return json({ error: "bad request" }, 400, origin);

    const model = env.MODEL || DEFAULT_MODEL;
    let apiRes;
    try {
      apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system: v.kind === "result" ? SYS_RESULT : SYS_COMPAT,
          messages: [{ role: "user", content: userPrompt(v.kind, v.p) }],
        }),
      });
    } catch (e) { return json({ error: "upstream" }, 502, origin); }
    if (!apiRes.ok) return json({ error: "upstream " + apiRes.status }, 502, origin);

    const data = await apiRes.json();
    const text = (data.content && data.content[0] && data.content[0].text || "").trim();
    if (!text) return json({ error: "empty" }, 502, origin);

    if (v.kind === "result") return json({ text }, 200, origin);
    // compat: モデルにJSONを要求している。パースできなければフロントがfallbackするよう素のtextで返す。
    try {
      const m = text.match(/\{[\s\S]*\}/);
      const obj = JSON.parse(m ? m[0] : text);
      return json({ text: String(obj.text || ""), live: String(obj.live || ""), invite: String(obj.invite || "") }, 200, origin);
    } catch (e) {
      return json({ text }, 200, origin);
    }
  },
};
