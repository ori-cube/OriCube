import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrigamiListItem } from "./index";
import { Model } from "@/types/model";

// Next.jsのLinkコンポーネントをモック
vi.mock("next/link", () => ({
  default: function MockLink({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href?: { pathname: string };
    className?: string;
  }) {
    return (
      <a href={href?.pathname} className={className}>
        {children}
      </a>
    );
  },
}));

// Next.jsのImageコンポーネントをモック
vi.mock("next/image", () => ({
  default: function MockImage({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    );
  },
}));

// react-iconsのFaStarをモック
vi.mock("react-icons/fa", () => ({
  FaStar: ({ className, key }: { className?: string; key?: string }) => (
    <span key={key} className={className} data-testid="star">
      ★
    </span>
  ),
}));

describe("OrigamiListItem", () => {
  const mockModel: Omit<Model, "searchKeyWord" | "procedure" | "color"> = {
    id: "test-id",
    name: "テスト折り紙",
    imageUrl: "/test-image.jpg",
    difficulty: 3,
    tags: [
      { title: "初心者向け", colorStyle: "green" },
      { title: "楽しい", colorStyle: "blue" },
    ],
  };

  it("難易度に応じて正しい数の星が塗りつぶされる", () => {
    render(<OrigamiListItem {...mockModel} />);

    const stars = screen.getAllByTestId("star");
    expect(stars).toHaveLength(5);

    // 難易度3なので、最初の3つが塗りつぶされた星、残り2つが空の星
    expect(stars[0].className).toMatch(/filled/);
    expect(stars[1].className).toMatch(/filled/);
    expect(stars[2].className).toMatch(/filled/);
    expect(stars[3].className).toMatch(/empty/);
    expect(stars[4].className).toMatch(/empty/);
  });

  it("タグが正しく表示される", () => {
    render(<OrigamiListItem {...mockModel} />);

    expect(screen.getByText("初心者向け")).toBeInTheDocument();
    expect(screen.getByText("楽しい")).toBeInTheDocument();
  });

  it("画像とタイトルが正しく表示される", () => {
    render(<OrigamiListItem {...mockModel} />);

    const image = screen.getByAltText("サムネイル: テスト折り紙の折り紙画像");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/test-image.jpg");

    expect(screen.getByText("テスト折り紙")).toBeInTheDocument();
  });

  it("リンクが正しいパスに設定される", () => {
    render(<OrigamiListItem {...mockModel} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/test-id");
  });

  it("難易度が1の場合、1つだけ星が塗りつぶされる", () => {
    const modelWithDifficulty1 = { ...mockModel, difficulty: 1 };
    render(<OrigamiListItem {...modelWithDifficulty1} />);

    const stars = screen.getAllByTestId("star");
    expect(stars[0].className).toMatch(/filled/);
    expect(stars[1].className).toMatch(/empty/);
    expect(stars[2].className).toMatch(/empty/);
    expect(stars[3].className).toMatch(/empty/);
    expect(stars[4].className).toMatch(/empty/);
  });

  it("難易度が5の場合、すべての星が塗りつぶされる", () => {
    const modelWithDifficulty5 = { ...mockModel, difficulty: 5 };
    render(<OrigamiListItem {...modelWithDifficulty5} />);

    const stars = screen.getAllByTestId("star");
    stars.forEach((star) => {
      expect(star.className).toMatch(/filled/);
    });
  });

  it("タグがない場合でも正常に表示される", () => {
    const modelWithoutTags = { ...mockModel, tags: [] };
    render(<OrigamiListItem {...modelWithoutTags} />);

    expect(screen.getByText("テスト折り紙")).toBeInTheDocument();
    expect(
      screen.getByAltText("サムネイル: テスト折り紙の折り紙画像")
    ).toBeInTheDocument();
  });

  it("difficultyとtagsが未定義の場合、デフォルト値で動作する", () => {
    const modelWithoutOptionalFields = {
      id: "test-id",
      name: "テスト折り紙",
      imageUrl: "/test-image.jpg",
    };
    render(<OrigamiListItem {...modelWithoutOptionalFields} />);

    // デフォルト難易度0で空の星5つが表示される
    const stars = screen.getAllByTestId("star");
    expect(stars).toHaveLength(5);
    stars.forEach((star) => {
      expect(star.className).toMatch(/empty/);
    });

    // タグは表示されない
    expect(screen.getByText("テスト折り紙")).toBeInTheDocument();
    expect(
      screen.getByAltText("サムネイル: テスト折り紙の折り紙画像")
    ).toBeInTheDocument();
  });

  it("難易度が0の場合、空の星5つが表示される", () => {
    const modelWithDifficulty0 = { ...mockModel, difficulty: 0 };
    render(<OrigamiListItem {...modelWithDifficulty0} />);

    const stars = screen.getAllByTestId("star");
    expect(stars).toHaveLength(5);
    stars.forEach((star) => {
      expect(star.className).toMatch(/empty/);
    });
  });
});
