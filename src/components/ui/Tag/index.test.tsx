import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tag } from "./index";
import { ColorStyle } from "../../../types/model";

describe("Tag", () => {
  it("タイトルが正しく表示される", () => {
    render(<Tag title="テストタグ" colorStyle="green" />);
    expect(screen.getByText("テストタグ")).toBeInTheDocument();
  });

  it("colorStyleに応じたクラスが適用される", () => {
    const { container } = render(
      <Tag title="テストタグ" colorStyle="purple-blue" />
    );
    const tagElement = container.firstChild as HTMLElement;
    expect(tagElement.className).toMatch(/purple-blue/);
  });

  it("異なるcolorStyleで正しくクラスが適用される", () => {
    const { container } = render(
      <Tag title="テストタグ" colorStyle="red-pink" />
    );
    const tagElement = container.firstChild as HTMLElement;
    expect(tagElement.className).toMatch(/red-pink/);
  });

  it("すべてのcolorStyleで正しく表示される", () => {
    const colorStyles: ColorStyle[] = [
      "purple-blue",
      "red-pink",
      "green",
      "blue",
      "orange",
      "yellow",
    ];

    colorStyles.forEach((colorStyle) => {
      const { container } = render(
        <Tag title={`${colorStyle}タグ`} colorStyle={colorStyle} />
      );
      const tagElement = container.firstChild as HTMLElement;
      expect(tagElement.className).toMatch(new RegExp(colorStyle));
      expect(screen.getByText(`${colorStyle}タグ`)).toBeInTheDocument();
    });
  });

  it("タグの基本クラスが適用される", () => {
    const { container } = render(<Tag title="テストタグ" colorStyle="green" />);
    const tagElement = container.firstChild as HTMLElement;
    expect(tagElement.className).toMatch(/tag/);
  });
});
