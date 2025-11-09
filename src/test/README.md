# 3D コンポーネント用テスト共通化ユーティリティ

このディレクトリには、Three.js を使用する 3D コンポーネントのテストを効率化するための共通ユーティリティが含まれています。

## 📁 ファイル構成

- `three-mocks.ts` - Three.js と OrbitControls のモック設定
- `test-utils.ts` - Vitest 用の共通テストユーティリティ
- `setup.ts` - 更新された WebGL モック設定

## 🎯 使用方法

### Vitest テスト

```typescript
import { describe, it, vi } from "vitest";
import { setupThreeMocks } from "@/test/three-mocks";
import { YourComponent } from "./YourComponent";

// Three.jsのモック設定
setupThreeMocks();

// Three.jsの実行をスキップするためのフックモック（例）
// ※ 実際のフック名は使用するコンポーネントに応じて変更してください
vi.mock("./hooks/useInitScene", () => ({
  useInitScene: vi.fn(() => {}),
}));

vi.mock("./hooks/useDragDrop", () => ({
  useDragDrop: vi.fn(() => {}),
}));

describe("YourComponent", () => {
  it("renders canvas element", () => {
    render(<YourComponent />);
    const canvas = document.querySelector(
      "#your-canvas-id"
    ) as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });
});
```

## 🔧 提供される機能

### three-mocks.ts

- `setupThreeMocks()` - Three.js と OrbitControls の基本的なモック設定
- Three.js の主要なクラスとメソッドをモック化

### test-utils.ts

- `test3DComponentRendering()` - 基本的なレンダリングテスト
- `test3DComponentProps()` - プロパティテスト
- `create3DTestSuite()` - 標準的なテストケース生成

## 🚨 注意事項

1. **フックのモック化**: Three.js を使用するフック（今回の例で言うと`useInitScene`, `useDragDrop`）は個別にモック化する必要があります。使用するフック名に応じて適宜変更してください
2. **Canvas 要素の取得**: `document.querySelector("#canvas-id")`を使用して canvas 要素を取得してください
3. **WebGL コンテキスト**: setup.ts で基本的な WebGL モックを提供していますが、複雑な WebGL 操作には追加のモックが必要な場合があります

## 📝 例

実装例は `src/components/v2/OrigamiPost/` を参照してください：

- `index.test.tsx` - テストの実装例
- `index.stories.tsx` - Storybook の実装例
