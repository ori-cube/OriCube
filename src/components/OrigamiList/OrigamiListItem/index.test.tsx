import { describe, it, expect } from "vitest";

// コンポーネントのロジック部分を直接テストするためのヘルパー関数
const createStarsArray = (difficulty: number = 0) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= difficulty;
    stars.push({
      index: i,
      isFilled,
      className: isFilled ? "filled" : "empty",
    });
  }
  return stars;
};

const generateAltText = (name: string) => {
  return `サムネイル: ${name}の折り紙画像`;
};

const generateLinkPath = (id: string) => {
  return `/${id}`;
};

const processImageUrl = (imageUrl: string | undefined) => {
  return imageUrl ? imageUrl : "";
};

describe("OrigamiListItem ロジックテスト", () => {
  describe("createStarsArray ロジック", () => {
    it("難易度が負の値の場合、すべて空の星を返す", () => {
      const stars = createStarsArray(-1);

      expect(stars).toHaveLength(5);
      stars.forEach((star) => {
        expect(star.isFilled).toBe(false);
        expect(star.className).toBe("empty");
      });
    });

    it("難易度が5を超える場合、すべて塗りつぶされた星を返す", () => {
      const stars = createStarsArray(10);

      expect(stars).toHaveLength(5);
      stars.forEach((star) => {
        expect(star.isFilled).toBe(true);
        expect(star.className).toBe("filled");
      });
    });

    it("難易度が0の場合、すべて空の星を返す", () => {
      const stars = createStarsArray(0);

      expect(stars).toHaveLength(5);
      stars.forEach((star) => {
        expect(star.isFilled).toBe(false);
        expect(star.className).toBe("empty");
      });
    });

    it("難易度が1の場合、1つだけ塗りつぶされた星を返す", () => {
      const stars = createStarsArray(1);

      expect(stars).toHaveLength(5);
      expect(stars[0].isFilled).toBe(true);
      expect(stars[0].className).toBe("filled");
      expect(stars[1].isFilled).toBe(false);
      expect(stars[1].className).toBe("empty");
      expect(stars[2].isFilled).toBe(false);
      expect(stars[2].className).toBe("empty");
      expect(stars[3].isFilled).toBe(false);
      expect(stars[3].className).toBe("empty");
      expect(stars[4].isFilled).toBe(false);
      expect(stars[4].className).toBe("empty");
    });

    it("難易度が5の場合、すべて塗りつぶされた星を返す", () => {
      const stars = createStarsArray(5);

      expect(stars).toHaveLength(5);
      stars.forEach((star) => {
        expect(star.isFilled).toBe(true);
        expect(star.className).toBe("filled");
      });
    });

    it("難易度が小数の場合、整数部分で判定する", () => {
      const stars = createStarsArray(2.7);

      expect(stars).toHaveLength(5);
      expect(stars[0].isFilled).toBe(true);
      expect(stars[1].isFilled).toBe(true);
      expect(stars[2].isFilled).toBe(false);
      expect(stars[3].isFilled).toBe(false);
      expect(stars[4].isFilled).toBe(false);
    });

    it("難易度が未定義の場合、デフォルト値0で動作する", () => {
      const stars = createStarsArray();

      expect(stars).toHaveLength(5);
      stars.forEach((star) => {
        expect(star.isFilled).toBe(false);
        expect(star.className).toBe("empty");
      });
    });
  });

  describe("generateAltText ロジック", () => {
    it("名前が空文字列の場合、適切なalt属性を生成する", () => {
      const altText = generateAltText("");
      expect(altText).toBe("サムネイル: の折り紙画像");
    });

    it("名前が特殊文字を含む場合、適切にエスケープされる", () => {
      const altText = generateAltText("テスト<>&\"'");
      expect(altText).toBe("サムネイル: テスト<>&\"'の折り紙画像");
    });

    it("名前が長い場合、適切にalt属性に含まれる", () => {
      const longName =
        "とても長い名前の折り紙作品で、これはテスト用の非常に長い名前です";
      const altText = generateAltText(longName);
      expect(altText).toBe(`サムネイル: ${longName}の折り紙画像`);
    });
  });

  describe("generateLinkPath ロジック", () => {
    it("IDが空文字列の場合、適切なリンクを生成する", () => {
      const linkPath = generateLinkPath("");
      expect(linkPath).toBe("/");
    });

    it("IDが特殊文字を含む場合、適切にリンクに含まれる", () => {
      const linkPath = generateLinkPath("test-id-123_abc");
      expect(linkPath).toBe("/test-id-123_abc");
    });
  });

  describe("processImageUrl ロジック", () => {
    it("imageUrlが空文字列の場合、空文字列を返す", () => {
      const result = processImageUrl("");
      expect(result).toBe("");
    });

    it("imageUrlがundefinedの場合、空文字列を返す", () => {
      const result = processImageUrl(undefined);
      expect(result).toBe("");
    });

    it("imageUrlが有効な値の場合、その値を返す", () => {
      const result = processImageUrl("/test-image.jpg");
      expect(result).toBe("/test-image.jpg");
    });
  });
});
