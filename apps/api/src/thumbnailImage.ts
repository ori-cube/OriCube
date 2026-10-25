import type { ProcedureThumbnail } from "@oricube/engine";

/** 出力する画像の一辺。一覧のカードと OGP（summary カード）で使う正方形 */
export const THUMBNAIL_SIZE = 640;

/** 一覧のサムネイル（apps/web の OrigamiThumbnail）と同じ色。背景は --background-subtle、裏面は BOARD_BACK_COLOR */
const BACKGROUND = "#f4f4f4";
const BACK_COLOR = "#ffffff";
/** 面の輪郭（OrigamiThumbnail の stroke: rgba(0, 0, 0, 0.3)、幅 1px） */
const EDGE_ALPHA = 0.3;
const EDGE_HALF_WIDTH = 0.5;
/** 1ピクセルの行を縦に分ける数。横は面積で求めるので、縦だけ分けてなめらかにする */
const SUBROWS = 4;

type Rgb = [number, number, number];
type Point = [number, number];

const parseHex = (hex: string): Rgb => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as Rgb;

/** RGB の画素（0〜255 の小数）。重ねて塗るので、量子化は書き出すときに1回だけ行う */
const createRaster = (size: number, background: Rgb) => {
  const pixels = new Float32Array(size * size * 3);
  for (let index = 0; index < pixels.length; index++) pixels[index] = background[index % 3];
  return pixels;
};

/** 塗りの作業用の配列。1行ぶんを使い回す */
const createScanline = (size: number) => ({
  /** 端の画素にかかる割合 */
  coverage: new Float32Array(size + 1),
  /** 区間の内側の画素。差分で持ち、行を塗るときに累積する（区間の長さによらず一定の手間にする） */
  delta: new Float32Array(size + 1),
  crossingX: new Float64Array(64),
  crossingWinding: new Int8Array(64),
});

/**
 * 多角形を塗る（非ゼロ規則・アンチエイリアスあり）
 *
 * @description
 * 行ごとに、縦に分けた走査線と辺の交点から塗る区間を求め、横方向は区間がかかる長さを覆う割合にする
 */
const fillPolygon = (pixels: Float32Array, size: number, scanline: ReturnType<typeof createScanline>, points: Point[], color: Rgb, alpha: number) => {
  const { coverage, delta } = scanline;
  let { crossingX, crossingWinding } = scanline;
  if (crossingX.length < points.length) {
    crossingX = scanline.crossingX = new Float64Array(points.length);
    crossingWinding = scanline.crossingWinding = new Int8Array(points.length);
  }
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const top = Math.max(0, Math.floor(minY));
  const bottom = Math.min(size, Math.ceil(maxY));
  const weight = 1 / SUBROWS;
  for (let row = top; row < bottom; row++) {
    let left = size;
    let right = -1;
    for (let sub = 0; sub < SUBROWS; sub++) {
      const y = row + (sub + 0.5) * weight;
      // 交点を x の順に並べる（数が少ないので挿入ソート）
      let count = 0;
      for (let index = 0; index < points.length; index++) {
        const [x0, y0] = points[index];
        const [x1, y1] = points[index + 1 === points.length ? 0 : index + 1];
        if ((y0 <= y) === (y1 <= y)) continue;
        const x = x0 + (y - y0) * (x1 - x0) / (y1 - y0);
        let at = count++;
        while (at > 0 && crossingX[at - 1] > x) { crossingX[at] = crossingX[at - 1]; crossingWinding[at] = crossingWinding[at - 1]; at--; }
        crossingX[at] = x;
        crossingWinding[at] = y1 > y0 ? 1 : -1;
      }
      let winding = 0;
      for (let index = 0; index < count - 1; index++) {
        winding += crossingWinding[index];
        if (winding === 0) continue;
        const start = Math.max(0, crossingX[index]);
        const end = Math.min(size, crossingX[index + 1]);
        if (end <= start) continue;
        const first = Math.floor(start);
        const last = Math.floor(end);
        left = Math.min(left, first);
        right = Math.max(right, last);
        if (first === last) { coverage[first] += (end - start) * weight; continue; }
        coverage[first] += (first + 1 - start) * weight;
        delta[first + 1] += weight;
        delta[last] -= weight;
        coverage[last] += (end - last) * weight;
      }
    }
    let inside = 0;
    for (let column = left; column <= right; column++) {
      inside += delta[column];
      const amount = Math.min(1, coverage[column] + inside) * alpha;
      coverage[column] = 0;
      delta[column] = 0;
      if (amount <= 0 || column === size) continue;
      const offset = (row * size + column) * 3;
      pixels[offset] += (color[0] - pixels[offset]) * amount;
      pixels[offset + 1] += (color[1] - pixels[offset + 1]) * amount;
      pixels[offset + 2] += (color[2] - pixels[offset + 2]) * amount;
    }
  }
};

/** 辺を細い四角形として塗る */
const strokePolygon = (pixels: Float32Array, size: number, scanline: ReturnType<typeof createScanline>, points: Point[]) => {
  points.forEach(([x0, y0], index) => {
    const [x1, y1] = points[(index + 1) % points.length];
    const length = Math.hypot(x1 - x0, y1 - y0);
    if (length === 0) return;
    const nx = -(y1 - y0) / length * EDGE_HALF_WIDTH;
    const ny = (x1 - x0) / length * EDGE_HALF_WIDTH;
    fillPolygon(pixels, size, scanline, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], [0, 0, 0], EDGE_ALPHA);
  });
};

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type: string, data: Uint8Array) => {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(new TextEncoder().encode(type), 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
};

/** 8bit RGB の PNG にする。圧縮は Workers・Node.js 共通の CompressionStream（zlib 形式）を使う */
const encodePng = async (pixels: Float32Array, size: number) => {
  const rowLength = size * 3 + 1;
  const raw = new Uint8Array(rowLength * size);
  for (let row = 0; row < size; row++) {
    // 各行の先頭はフィルターの種類（0: なし）
    for (let index = 0; index < size * 3; index++) raw[row * rowLength + 1 + index] = Math.round(pixels[row * size * 3 + index]);
  }
  const compressed = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  header.set([8, 2, 0, 0, 0], 8); // 8bit・RGB・deflate・既定のフィルター・インターレースなし
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pngChunk("IHDR", header), pngChunk("IDAT", compressed), pngChunk("IEND", new Uint8Array())];
  const png = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  parts.reduce((offset, part) => { png.set(part, offset); return offset + part.length; }, 0);
  return png;
};

/**
 * 完成形の図（engine の createProcedureThumbnail）を PNG にする
 *
 * @description
 * 投稿者が送る画像は受け付けず、サーバーが手順から描く（一覧・OGP の画像に任意の画像を置かせない）。
 * 一覧の SVG（OrigamiThumbnail）と同じ色・陰影・輪郭で描く。依存を増やさないよう、塗りと PNG の書き出しはここで行う
 */
export const renderThumbnailPng = (thumbnail: ProcedureThumbnail, color: string, size = THUMBNAIL_SIZE) => {
  const pixels = createRaster(size, parseHex(BACKGROUND));
  const scanline = createScanline(size);
  const [viewX, viewY, viewSize] = thumbnail.viewBox;
  const scale = size / viewSize;
  const front = parseHex(color);
  const back = parseHex(BACK_COLOR);
  for (const face of thumbnail.faces) {
    const points = face.points.map(([x, y]): Point => [(x - viewX) * scale, (y - viewY) * scale]);
    // 傾いた面ほど暗くする（OrigamiThumbnail の影の重ね塗りと同じ割合）
    const shadow = Math.round((1 - face.shade) * 30) / 100;
    const base = face.side === "front" ? front : back;
    fillPolygon(pixels, size, scanline, points, base.map((channel) => channel * (1 - shadow)) as Rgb, 1);
    strokePolygon(pixels, size, scanline, points);
  }
  return encodePng(pixels, size);
};
