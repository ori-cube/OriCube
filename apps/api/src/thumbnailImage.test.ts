import { describe, expect, it } from "vitest";
import type { ProcedureThumbnail } from "@oricube/engine";
import { renderThumbnailPng } from "./thumbnailImage";

/** テスト用に PNG（8bit RGB・フィルターなし）を画素に戻す */
const decode = async (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const chunks: Uint8Array[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = view.getUint32(offset);
    if (new TextDecoder().decode(png.subarray(offset + 4, offset + 8)) === "IDAT") chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = new Uint8Array(await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer());
  const pixel = (x: number, y: number) => [...raw.subarray(y * (width * 3 + 1) + 1 + x * 3, y * (width * 3 + 1) + 4 + x * 3)];
  return { width, height, pixel };
};

/** viewBox いっぱいの中央に、一辺が半分の正方形を1面置く */
const square = (side: "front" | "back", shade = 1): ProcedureThumbnail => ({
  viewBox: [-100, -100, 200, 200],
  faces: [{ points: [[-50, -50], [50, -50], [50, 50], [-50, 50]], side, shade }],
});

describe("renderThumbnailPng", () => {
  it("指定した大きさの PNG を返す", async () => {
    const png = await renderThumbnailPng(square("front"), "#ed7070", 64);
    expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const { width, height } = await decode(png);
    expect([width, height]).toEqual([64, 64]);
  });

  it("表は作品の色、裏は白で塗り、外側は背景の色にする", async () => {
    const front = await decode(await renderThumbnailPng(square("front"), "#ed7070", 64));
    expect(front.pixel(32, 32)).toEqual([0xed, 0x70, 0x70]);
    expect(front.pixel(2, 2)).toEqual([0xf4, 0xf4, 0xf4]);
    const back = await decode(await renderThumbnailPng(square("back"), "#ed7070", 64));
    expect(back.pixel(32, 32)).toEqual([0xff, 0xff, 0xff]);
  });

  it("傾いた面は暗くし、輪郭を描く", async () => {
    const { pixel } = await decode(await renderThumbnailPng(square("back", 0), "#ed7070", 64));
    expect(pixel(32, 32)).toEqual([179, 179, 179]);
    // 輪郭（x = 16 の辺）は面より暗い
    expect(pixel(16, 32)[0]).toBeLessThan(179);
  });
});
