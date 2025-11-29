# Icon コンポーネント

Figma デザインシステムから取得したアイコンコンポーネントです。

## アイコンの取得方法

1. **Figma MCP でアイコンのノード ID を取得**: Figma でアイコンを選択し、`get_design_context`を使用してアイコンの情報を取得
2. **SVG ファイルの URL を取得**: `get_design_context`の結果から、localhost サーバー上の SVG ファイルの URL を取得
3. **SVG コードを取得**: 取得した URL から`curl`コマンドで実際の SVG コードを取得
4. **Icon コンポーネントに追加**:
   - `IconName`型に新しいアイコン名を追加
   - `switch`文に新しいケースを追加（取得した SVG コードを使用、CSS 変数は`currentColor`に置き換え）
   - Storybook ストーリーに追加
