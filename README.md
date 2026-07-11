# オトタイプ — あなたの「聴き方」タイプ診断

音楽の知識ゼロでOK。20問(約1分)に答えると、音楽の「聴き方」を**4軸×16タイプ**で判定。
友達に相性リンクを送って、ライブ相性(◎/○/△)と「そのまま送れる誘い文句」までチェックできる。

- フロント: 素のHTML/CSS/JS(ビルドなし・ライブラリなし・Google Fontsのみ)
- バックエンド: Cloudflare Worker 1本(Anthropic APIの中継)。**Workerなしでもテンプレ文で全機能が動く**
- DBなし: 相性リンクは回答列をURLクエリに載せるステートレス方式

## 4軸と16タイプ

| 軸 | 記号 |
|---|---|
| 場所感 | **F**(みんな/現場) ↔ **R**(ひとり/自室) |
| 刺さる核 | **L**(歌詞・言葉) ↔ **S**(音・ノリ) |
| のめり込み | **D**(熱狂) ↔ **E**(ゆるり) |
| 探し方 | **T**(王道) ↔ **M**(開拓) |

タイプコードは4文字(例: `FSDT`=フェス大合唱型)。定義は `data/types.json`。

---

## 1. GitHub Pages で公開する

1. このリポジトリをGitHubへ push(リポジトリ直下が公開ルートの構成)
2. リポジトリの **Settings → Pages → Source: Deploy from a branch → main / (root)** を選択
3. 数分後 `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される
4. `tools/gen_r_pages.py` の `BASE` を公開URLに合わせて書き換え、`python tools/gen_r_pages.py` で `r/*.html` を再生成して push(OGPの絶対URLを正すため)

ローカル確認(`fetch`を使うため file:// では動かない):

```
cd <このリポジトリ>
python -m http.server 8080
# → http://localhost:8080/
```

## 2. Worker(AI解説)をデプロイする — 任意

Workerなしでも全機能が動く(テンプレ文)。AI解説を有効にする場合のみ:

```
cd worker
npm install -g wrangler          # 未導入なら
wrangler login
wrangler secret put ANTHROPIC_API_KEY   # APIキーを対話で貼り付け(コードに書かない)
wrangler deploy
```

1. デプロイ後に表示されるURL(例 `https://ototype-ai.xxx.workers.dev`)を `config.js` の `WORKER_URL` に設定
2. `worker/src/index.js` 冒頭の `ALLOWED_ORIGIN` を自分のGitHub Pagesのオリジン(例 `https://<ユーザー名>.github.io`)に差し替え
3. モデルは既定 `claude-haiku-4-5-20251001`。変えたい場合は `wrangler.toml` の `[vars] MODEL` を設定。最新のモデル名は https://docs.claude.com で確認できる
4. レート制限はIPごと10リクエスト/10分(超過429→フロントは自動でテンプレ文に切替)

## 3. アーティストリストの差し替え方

`data/types.json` の各タイプの `artists` 配列(テキストのみ)を編集するだけ。コードへのハードコードはない。
編集後、OGPページの文言には影響しないが、念のため:

```
python tools/gen_r_pages.py     # r/*.html 再生成(タイプ名/キャッチ変更時)
```

**法務ルール**: アーティストは名前のテキスト表記のみ。写真・ロゴ・歌詞・音源・ジャケットは使わない。
フッターの「本診断はエンタメ目的です。アーティスト各位とは無関係です」を消さない。

## 4. OGP画像の再生成手順

1. ローカルサーバを立てる: `python -m http.server 8080`
2. ブラウザで `http://localhost:8080/tools/ogp-generator.html` を開く
3. 「16枚を一括ダウンロード」→ ダウンロードされた `{typeId}.png` を `assets/ogp/` に上書き配置

(npm等の依存は不要。Canvas描画のみで生成される)

## 5. セルフテスト

```
node tools/selftest.mjs
```

- ランダム回答40,000回で全16タイプの出現率が2%以上であること
- 回帰テスト(全pos極→FLDT / 全neg極→RSEM / 混合→FSDM)
- 判定ロジックは `scoring.mjs` が唯一の実装で、アプリ本体(`app.js`)とテストが同じ関数をimportする

## 構成

```
index.html  app.js  style.css  config.js  scoring.mjs
data/types.json  data/questions.json  data/compat.json
r/{typeId}.html ×16          … シェア用OGPページ
assets/ogp/{typeId}.png ×16  … OGP画像
tools/ogp-generator.html     … OGP画像の再生成(ブラウザ)
tools/gen_r_pages.py         … r/*.html の再生成
tools/gen_compat.py          … data/compat.json の再生成(軸一致数ベース)
tools/selftest.mjs           … セルフテスト(node)
worker/src/index.js  worker/wrangler.toml
```

## 注意

- 本診断はエンタメ目的です。アーティスト各位とは無関係です
- 個人情報は収集しません(ニックネームは任意・最大20字・URLに載る旨をUI上に明記)
- 相性リンクのニックネームはURLクエリに含まれるため、本名を使わないことを推奨
