# 入力部品

`SearchField` は検索アイコン、ラベル、クリア操作を持つ検索入力。`onChange` は文字列を受け取り、クリア時は空文字列を返して入力へフォーカスを戻す。ヘッダーなどで `hideLabel` を指定してもアクセシブルな名前は維持する。

`TextArea` は複数行入力。`label`、任意の `description` と `errorMessage` を入力に関連付ける。`onChange` は文字列を受け取る。TextInput と共通のフィールドスタイル・意味トークンを使用する。

React Aria の操作と意味付けを design-system 内で包み、画面はこのパッケージの部品を使用する。表示状態はそれぞれの Storybook で確認できる。
