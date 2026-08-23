# corp.tarareba.com

TARAREBA株式会社のコーポレートサイト。すべての要素は誰でも書き換えられ、編集は全訪問者に共有される。

- `bun run dev` — 開発サーバー
- `bun run test` — テスト
- `bun run typecheck` — 型チェック
- `bun run deploy` — ビルドとデプロイ

## モデレーション

編集はすべて D1 の `events` テーブルに追記される。問題のある編集はイベントを消せばその編集だけ歴史から消える。
履歴は World DO がメモリに持っていて 10 分ごとに D1 から読み直すので、削除は最長 10 分で反映される。すぐ反映したいときは `bun run deploy` で DO を再起動する。

```bash
bunx wrangler d1 execute DB --remote --command "SELECT id, ts, type, target, payload FROM events ORDER BY id DESC LIMIT 20"
bunx wrangler d1 execute DB --remote --command "DELETE FROM events WHERE id = <id>"
```

## シークレット

- `IP_HASH_SALT` — IP ハッシュ用ソルト（必須。未設定だと編集が拒否される）
- `DISCORD_WEBHOOK_URL` — 編集通知先（任意。未設定なら通知しない）

```bash
bunx wrangler secret put DISCORD_WEBHOOK_URL
```
