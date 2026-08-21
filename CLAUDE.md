# corp.tarareba.com

誰でも書き換えられるコーポレートサイト。

- イベントログが唯一の真実。現在の状態は foldEvents の結果で、DB に状態テーブルはない。
- イベント語彙は setText / move / transform のみ。追加するときは後方互換を保つこと
  （古いイベントが validateEvent を通らなくなる変更は履歴を壊す）。
- テキスト描画は textContent のみ。innerHTML は使わない。
- ELEMENT_IDS（src/shared/events.ts）と index.html の data-id は 1:1（src/shared/elements.test.ts が検証）。
- tsconfig はクライアント（DOM lib）とサーバー（workers 型）で分割している。統合すると
  HTMLRewriter 系の型が DOM と衝突する。
- モデレーションは D1 からのイベント削除で行う（README 参照）。
