import * as THREE from "three";
import type { PointV2, ProcedureV2 } from "./model-v2";
import { createViewerTimeline } from "./playback";

/** サムネイルの1面。points は SVG 座標（y は下向き） */
export interface ThumbnailFace {
  points: [number, number][];
  /** 見えている紙の面。front は作品の色、back は裏面の白 */
  side: "front" | "back";
  /** 面の傾きによる明るさ（0〜1。正面を向くほど 1） */
  shade: number;
}

/** 完成形を正面から見た平行投影。奥の面から順に並ぶ */
export interface ProcedureThumbnail {
  viewBox: [number, number, number, number];
  faces: ThumbnailFace[];
}

/** 閲覧画面が重なりを浮かせる距離（BOARD_LAYER_OFFSET）と同じ比率で奥行きを付ける */
const LAYER_DEPTH = 0.05;

const round = (value: number) => Math.round(value * 10) / 10 || 0;

const polygonNormal = (polygon: PointV2[]) => {
  const points = polygon.map((point) => new THREE.Vector3(...point));
  for (let index = 1; index < points.length - 1; index++) {
    const normal = new THREE.Vector3().crossVectors(points[index].clone().sub(points[0]), points[index + 1].clone().sub(points[0]));
    if (normal.lengthSq() > 1e-12) return normal.normalize();
  }
  return new THREE.Vector3(0, 0, 1);
};

/**
 * 完成形のサムネイルを作る
 *
 * @description
 * - 閲覧画面の最終状態（仕上げ角度と最後の向き）を、カメラ正面から平行投影する
 * - 頂点の並びが紙の表裏を表すため、投影後の向きで作品の色と裏面の白を分ける
 * - 重なりは面の重心の奥行きで並べる簡易的な描画順なので、立体的に交差する面は近似になる
 * - サムネイル画像の保存ができるまで、一覧で軽く表示するために使う
 */
export const createProcedureThumbnail = (procedure: ProcedureV2, timeline = createViewerTimeline(procedure)): ProcedureThumbnail => {
  const { finalBoards, finalViewFront } = timeline;
  const view = finalViewFront ? 1 : -1;
  const faces = finalBoards.map((board, index) => {
    const normal = polygonNormal(board.polygon);
    const flatSign = Math.sign(polygonNormal(procedure.finalBoards[index].polygon).z) || 1;
    const centroid = board.polygon.reduce((sum, point) => sum + point[2], 0) / board.polygon.length;
    return {
      depth: (centroid + normal.z * flatSign * board.layer * LAYER_DEPTH) * view,
      face: {
        points: board.polygon.map(([x, y]): [number, number] => [round(x * view), round(-y)]),
        side: normal.z * view > 0 ? "front" : "back",
        shade: Math.round(Math.abs(normal.z) * 100) / 100,
      } satisfies ThumbnailFace,
    };
  });
  faces.sort((left, right) => left.depth - right.depth);

  const xs = faces.flatMap(({ face }) => face.points.map(([x]) => x));
  const ys = faces.flatMap(({ face }) => face.points.map(([, y]) => y));
  const half = procedure.size / 2;
  const [minX, maxX, minY, maxY] = xs.length ? [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] : [-half, half, -half, half];
  const extent = Math.max(maxX - minX, maxY - minY, 1);
  const padding = extent * 0.08;
  const side = round(extent + padding * 2);
  return {
    viewBox: [round((minX + maxX) / 2 - side / 2), round((minY + maxY) / 2 - side / 2), side, side],
    faces: faces.map(({ face }) => face),
  };
};
