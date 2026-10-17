# 入力部品

`SearchField` は検索アイコン、ラベル、クリア操作を持つ検索入力。`onChange` は文字列を受け取り、クリア時は空文字列を返して入力へフォーカスを戻す。ヘッダーなどで `hideLabel` を指定してもアクセシブルな名前は維持する。

`TextArea` は複数行入力。`label`、任意の `description` と `errorMessage` を入力に関連付ける。`onChange` は文字列を受け取る。TextInput と共通のフィールドスタイル・意味トークンを使用する。

React Aria の操作と意味付けを design-system 内で包み、画面はこのパッケージの部品を使用する。表示状態はそれぞれの Storybook で確認できる。

`ColorField` は不透明なRGB色を、ブラウザー標準の色選択と16進コード入力から編集する。`label`、`description`、`isDisabled`、`isReadOnly` を使用できる。`value` / `defaultValue` は色の文字列または `null`。初期値を省略した場合は黒になる。`onChange` は確定した色を `#RRGGBB` 形式で返し、空にした場合は `null` を返す。コード入力はEnterまたはフォーカス移動で確定し、無効なコードは直前の色に戻して、エラーと入力例を文章で表示・ライブ通知する。色コード以外の貼り付けにも通知する。編集を再開するか色見本から選択すると通知を消す。空入力はエラーにせず、必須入力や送信の制限は設けない。色を必ず保持する画面では `null` を状態に反映しない。`name` を指定するとコード入力の値がフォームに送信される。

`SegmentedControl` は少数の選択肢から1つを選ぶ横並びのボタン群。必須の `label`, `items`（`id`, `label`, 任意の `isDisabled`）, `value`, `onChange`。React Aria の ToggleButtonGroup で radiogroup として伝え、矢印キーで移動できる。選択を空にはできない。選べない項目は表示したまま無効にし、薄く表示する。項目が多い場合は折り返す。各項目は44px四方を確保する。
