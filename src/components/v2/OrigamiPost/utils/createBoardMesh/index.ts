import * as THREE from "three";
import { Board } from "../../types";

/**
 * 板（多角形）のメッシュを作成する
 *
 * @param board - 板の頂点列（XY平面上、Z=0前提）
 * @param color - 板の色（CSS色文字列）
 * @param options.name - Groupに設定する名前
 * @param options.enablePolygonOffset - 深度値をずらして同一平面での
 *        ちらつき（z-fighting）を防ぐ。折りで動く板に指定する
 * @returns 板メッシュと枠線をまとめたGroup
 *
 * @description
 * - THREE.Shape → ShapeGeometryで任意多角形を三角形分割して描画
 *   （earcut内蔵のため凹多角形にも対応）
 * - マテリアルは半透明Lambert・両面描画
 * - EdgesGeometryで黒い枠線を追加
 */
export const createBoardMesh = (
  board: Board,
  color: string,
  options: { name?: string; enablePolygonOffset?: boolean } = {}
): THREE.Group => {
  const shape = new THREE.Shape();
  shape.moveTo(board[0].x, board[0].y);
  for (let i = 1; i < board.length; i++) {
    shape.lineTo(board[i].x, board[i].y);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshLambertMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    ...(options.enablePolygonOffset
      ? { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }
      : {}),
  });
  const mesh = new THREE.Mesh(geometry, material);

  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
  });
  const wireframe = new THREE.LineSegments(edges, lineMaterial);

  const group = new THREE.Group();
  if (options.name) {
    group.name = options.name;
  }
  group.add(mesh);
  group.add(wireframe);

  return group;
};
