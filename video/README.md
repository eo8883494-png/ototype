# OTOTYPE Video — 診断結果TikTok動画の自動生成 (Remotion)

診断結果1件ぶんのJSONから、シェアしたくなる8秒の縦動画(1080×1920/30fps/H264)を完全自動生成する。
「広告」ではなく「これ私じゃん」と思える、ゲームのステータス画面×Spotify×かわいいキャラのテンポ動画。

## セットアップ

```powershell
# このPCはポータブルNodeなのでPATHを通す
$env:Path = "C:\dev\tools\node;$env:Path"
cd C:\dev\ototype\video
npm install
```

## 使い方

```powershell
npm run render                      # data/fsdm.json で1本生成 → out/FSDM.mp4
npm run render -- data/rsdt.json    # JSONを指定して生成
npm run render -- --all             # data/*.json 全タイプ一括生成
npm run data                        # ../data/types.json から16タイプ分のJSONを再生成
npm run dev                         # Remotion Studioでプレビュー(ブラウザ)
```

プログラムからは `src/api.ts` の `generateVideo(data)` / `renderVideo(data)` / `exportVideo(data, outPath)`。

## JSON仕様 (data/*.json)

```json
{
  "type": "ライブハウス魂型",
  "code": "FSDM",
  "catch": "爆音は、浄化。",
  "image": "types/FSDM.webp",
  "color": "#D92E3C",
  "axis": {"place": 100, "core": 73, "immersion": 70, "discover": 60},
  "hashtags": ["爆音", "衝動", "ライブ"]
}
```

- 型定義と実行時バリデーションは `src/data/schema.ts`(唯一の真実源)
- 任意フィールド: `siteUrl` `qrImage` / 将来拡張用: `playlist` `spotifyId` `appleMusicId` `extras`
- **JSONを差し替えるだけ**で16タイプ(将来100種)すべて生成できる。タイプ追加時は `npm run data` を再実行

## シーン構成 (8秒)

| シーン | 時間 | 内容 |
|---|---|---|
| Scene1Intro | 0-1s | 「あなたは…」+キャラがポップズーム+音符 |
| Scene2Type | 1-3s | コード→タイプ名ポップ、キャッチコピー1文字ずつ、キャラふわふわ |
| Scene3Status | 3-6s | ゲーム風ステータス。4軸バーが時差で伸び数字カウントアップ |
| Scene4Outro | 6-8s | キャラジャンプ+「あなたも診断してみる？」+QR+ハッシュタグ |

タイミングの単一情報源は `src/utils/timing.ts`。シーン追加は `scenes/` に足して `Video.tsx` の登録簿に1行 — 既存シーンは触らない(OCP)。

## 設計

- `components/` … Character / Title / AxisBar / CatchCopy / Background / Particles / Footer / QR。アニメーションは全てprops化
- `hooks/` … usePop(バネ出現) / useFloat(ふわふわ) / useCountUp(数字)
- `utils/` … timing(シーン設計図) / color(派生色) / font(M PLUS Rounded 1c=サイトと同一)
- キャラ画像(`public/types/*.webp`)は**無加工**(scale/translateのみ)。アート方針: リサイズ以外の改変禁止
- 音声トラックなし=TikTok/CapCutでアプリ内音源を付ける(著作権安全+アルゴリズム有利)
- パフォーマンス: jpegフレーム+`--concurrency=2`(低メモリPC対策。余裕があれば上げる)。連続生成はapi.tsがバンドルをキャッシュ

## GitHub Pagesとの連携

- このフォルダはサイトと同じリポジトリ内のサブプロジェクト。Pagesは静的配信のみなので**動画はローカルで生成**する(node_modules/outはgitignore済みでPagesに影響なし)
- QR・CTAのリンク先は本番サイト https://eo8883494-png.github.io/ototype/
- キャラ画像はサイトの `assets/chars/` のコピー。更新時は `Copy-Item ..\assets\chars\*.webp public\types\`
- 将来: サイトの結果画面に「動画用データをコピー」を付ければ、ユーザーの実測axis入りJSONでパーソナル動画を生成できる(サイト側は `judge()` の結果をこのJSON形にするだけ)

## 生成した動画の投稿

out/*.mp4 をスマホへ送り、TikTok/リールでアプリ内音源を付けて投稿する(自動投稿はToSリスクがあるため行わない)。
