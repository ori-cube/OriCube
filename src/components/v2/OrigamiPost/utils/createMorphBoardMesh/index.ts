import * as THREE from "three";
import { Board } from "../../types";

/**
 * 頂点を毎フレーム動かせる板メッシュ（モーフ板）を作成する
 *
 * @param board - 板の頂点列（初期位置）
 * @param color - 板の色（CSS色文字列）
 * @param options.name - Groupに設定する名前
 * @returns 板メッシュと枠線をまとめたGroup
 *
 * @description
 * - 開いて畳むアニメーションでは片が途中経過で平面でなくなるため、
 *   ShapeGeometryの作り直しではなくposition属性の書き換えで動かす
 *   （updateMorphBoardMeshPositionsを使う）
 * - 三角形分割は頂点数が変わらない前提で作成時に一度だけ行う
 * - 面と枠線（LineLoop）はposition属性を共有し、1回の書き換えで両方動く
 * - 動く板はpolygonOffsetを有効にしてz-fightingを防ぐ（createBoardMeshの
 *   動く片と同じ設定）
 * - 頂点が毎フレーム動くためフラスタムカリングは無効化する
 */
export const createMorphBoardMesh = (
  board: Board,
  color: string,
  options: { name?: string } = {}
): THREE.Group => {
  const contour = board.map((vertex) => new THREE.Vector2(vertex.x, vertex.y));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);

  const positionAttribute = new THREE.BufferAttribute(
    new Float32Array(board.length * 3),
    3
  );
  writePositions(positionAttribute, board);

  const meshGeometry = new THREE.BufferGeometry();
  meshGeometry.setAttribute("position", positionAttribute);
  meshGeometry.setIndex(triangles.flat());
  meshGeometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(meshGeometry, material);
  mesh.frustumCulled = false;

  const outlineGeometry = new THREE.BufferGeometry();
  outlineGeometry.setAttribute("position", positionAttribute);
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
  });
  const outline = new THREE.LineLoop(outlineGeometry, outlineMaterial);
  outline.frustumCulled = false;

  const group = new THREE.Group();
  if (options.name) {
    group.name = options.name;
  }
  group.add(mesh);
  group.add(outline);

  return group;
};

/**
 * モーフ板の全頂点の座標を書き換える
 *
 * @param group - createMorphBoardMeshで作成したGroup
 * @param positions - 新しい頂点座標（作成時と同じ頂点数であること）
 *
 * @description
 * 面と枠線はposition属性を共有しているため、面メッシュの属性を
 * 書き換えるだけで両方に反映される
 */
export const updateMorphBoardMeshPositions = (
  group: THREE.Object3D,
  positions: Board
): void => {
  const mesh = group.children.find(
    (child): child is THREE.Mesh => child instanceof THREE.Mesh
  );
  if (!mesh) return;

  const attribute = mesh.geometry.getAttribute("position");
  if (!(attribute instanceof THREE.BufferAttribute)) return;
  if (attribute.count !== positions.length) return;

  writePositions(attribute, positions);
  attribute.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
};

/**
 * 頂点列をposition属性へ書き込む
 */
const writePositions = (
  attribute: THREE.BufferAttribute,
  board: Board
): void => {
  board.forEach((vertex, index) => {
    attribute.setXYZ(index, vertex.x, vertex.y, vertex.z);
  });
};
