import { render } from "@testing-library/react";
import { expect } from "vitest";
import * as React from "react";
import type { ComponentType } from "react";
import "@testing-library/jest-dom";

/**
 * 3Dコンポーネント用テストユーティリティ
 *
 * Three.jsを使用する3Dコンポーネントの標準的なテストを提供します
 */

export interface Base3DProps {
  width?: number;
  height?: number;
  origamiColor?: string;
  size?: number;
  cameraPosition?: { x: number; y: number; z: number };
}

export interface Test3DComponentOptions<T extends Base3DProps = Base3DProps> {
  /** コンポーネントのprops */
  props?: T;
  /** 期待されるcanvasのid属性 */
  expectedCanvasId?: string;
  /** カスタムテスト関数 */
  customTests?: (element: HTMLElement) => void;
}

/**
 * 3Dコンポーネントの基本的なレンダリングテスト
 */
export const test3DComponentRendering = <T extends Base3DProps = Base3DProps>(
  Component: ComponentType<T>,
  options: Test3DComponentOptions<T> = {}
) => {
  const { props = {}, expectedCanvasId, customTests } = options;

  const renderResult = render(
    React.createElement(Component, props as T & React.Attributes)
  );
  const canvas =
    (document.querySelector("#origami-canvas") as HTMLCanvasElement) ||
    (document.querySelector("canvas") as HTMLCanvasElement);

  expect(canvas).toBeInTheDocument();

  if (expectedCanvasId) {
    expect(canvas).toHaveAttribute("id", expectedCanvasId);
  }

  if (customTests) {
    customTests(canvas);
  }

  return { canvas, ...renderResult };
};

/**
 * 3Dコンポーネントのpropsテスト
 */
export const test3DComponentProps = <T extends Base3DProps = Base3DProps>(
  Component: ComponentType<T>,
  testProps: T,
  expectedCanvasId?: string
) => {
  const { canvas } = test3DComponentRendering(Component, {
    props: testProps,
    expectedCanvasId,
  });

  if (testProps.width && testProps.height) {
    expect(canvas).toHaveStyle({
      width: `${testProps.width}px`,
      height: `${testProps.height}px`,
    });
  }

  return canvas;
};

/**
 * 3Dコンポーネントのデフォルトpropsテスト
 */
export const test3DComponentDefaults = <T extends Base3DProps = Base3DProps>(
  Component: ComponentType<T>,
  expectedCanvasId?: string
) => {
  return test3DComponentRendering(Component, { expectedCanvasId });
};

/**
 * 3Dコンポーネント用の標準的なテストケースを生成
 */
export const create3DTestSuite = <T extends Base3DProps = Base3DProps>(
  Component: ComponentType<T>,
  componentName: string,
  expectedCanvasId?: string
) => ({
  "renders canvas element": () => {
    test3DComponentRendering(Component, { expectedCanvasId });
  },

  "applies custom props": () => {
    const customProps = {
      origamiColor: "#FF0000",
      size: 150,
      width: 1000,
      height: 800,
      cameraPosition: { x: 10, y: 20, z: 30 },
    } as T;

    test3DComponentProps(Component, customProps, expectedCanvasId);
  },

  "has correct default props": () => {
    test3DComponentDefaults(Component, expectedCanvasId);
  },

  "applies custom styles": () => {
    const canvas = test3DComponentProps(
      Component,
      { width: 500, height: 400 } as T,
      expectedCanvasId
    );

    expect(canvas).toHaveStyle({ width: "500px", height: "400px" });
  },
});
