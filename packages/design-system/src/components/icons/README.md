# Icons

Figma で定義されているアイコンを React コンポーネントとして提供します。

## 使い方

```tsx
import { PlusIcon } from "@oricube/design-system";

<PlusIcon size={24} />            // px / CSS サイズ
<PlusIcon style={{ color: "red" }} />  // 色は currentColor 経由
```

`size` は `number | string`。未指定なら `1em`（親フォントサイズに追従）。

## Figma からの同期

### 1. 環境変数を用意

ワークスペースルートの `.env` などに以下を設定:

| 変数 | 用途 |
|---|---|
| `FIGMA_TOKEN` | Figma → アカウント設定 → Personal access tokens で発行 |
| `FIGMA_FILE_KEY` | Figma URL `https://www.figma.com/design/<KEY>/...` の `<KEY>` |

アイコンが入っている Component Set の名前は `scripts/sync-icons.mjs` 内の定数 `FIGMA_ICONS_NAME` に直書きしている（既定値: `Icon`）。Figma 側でリネームしたらこの定数も合わせて更新する。

### 2. スクリプト実行

```sh
pnpm --filter @oricube/design-system sync-icons
```

`.env` を使う場合は `dotenv-cli` を挟む:

```sh
dotenv -e .env -- pnpm --filter @oricube/design-system sync-icons
```

## ディレクトリ運用ルール

- `svg/`, `generated/`, `index.ts` は **スクリプトの生成物**。手で編集しない（次回 sync で消える）。
- アプリから import されるのは `generated/` の .tsx のみ。`svg/` はコードからは参照されない。視覚確認用に残した。
