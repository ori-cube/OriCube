import * as THREE from "three";
import { Board } from "../../types";
import { BOARD_BACK_COLOR } from "../../constants";

/**
 * 紙の表裏それぞれの面メッシュを作成する
 *
 * @param board - 板の頂点列（XY平面上の巻き順を表裏の判定に使用）
 * @param geometry - 面が+Z向きに作られたジオメトリ（2つのメッシュで共有）
 * @param frontColor - 紙の表面の色（CSS色文字列）。裏面はBOARD_BACK_COLOR固定
 * @param materialParams - 2つのマテリアルに共通で適用するパラメータ
 * @returns [+Z側を描画するメッシュ, -Z側を描画するメッシュ]
 *
 * @description
 * - 折りはXY平面上の鏡映として板データへ反映されるため、頂点列の巻き順で
 *   紙の表がどちらを向いているかを判定できる（反時計回り＝表が+Z向き。
 *   奇数回裏返った板は時計回りになる）
 * - ジオメトリを共有したFrontSide（+Z側）とBackSide（-Z側）の2つの
 *   メッシュに表色・裏色を割り当てる。アニメーションでメッシュ自体が
 *   回転して裏返る場合も、見えている面に応じた色が自然に表示される
 */
export const createFaceMeshes = (
  board: Board,
  geometry: THREE.BufferGeometry,
  frontColor: string,
  materialParams: THREE.MeshLambertMaterialParameters
): [THREE.Mesh, THREE.Mesh] => {
  const contour = board.map((vertex) => new THREE.Vector2(vertex.x, vertex.y));
  const faceUp = !THREE.ShapeUtils.isClockWise(contour);

  const frontMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({
      ...materialParams,
      color: faceUp ? frontColor : BOARD_BACK_COLOR,
      side: THREE.FrontSide,
    })
  );
  const backMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({
      ...materialParams,
      color: faceUp ? BOARD_BACK_COLOR : frontColor,
      side: THREE.BackSide,
    })
  );

  return [frontMesh, backMesh];
};

/**
 * 板（多角形）のメッシュを作成する
 *
 * @param board - 板の頂点列（XY平面上、Z=0前提）
 * @param frontColor - 紙の表面の色（CSS色文字列）。裏面はBOARD_BACK_COLOR固定
 * @param options.name - Groupに設定する名前
 * @param options.enablePolygonOffset - 深度値をずらして同一平面での
 *        ちらつき（z-fighting）を防ぐ。折りで動く板に指定する
 * @param options.opacity - 板の不透明度（デフォルト: 1。
 *        ドラッグ中のプレビューのようなゴースト表示では下げる）
 * @returns 板メッシュと枠線をまとめたGroup
 *
 * @description
 * - THREE.Shape → ShapeGeometryで任意多角形を三角形分割して描画
 *   （earcut内蔵のため凹多角形にも対応。面は巻き順によらず+Z向きになる）
 * - マテリアルは不透明Lambert（opacity指定時のみ半透明）。表裏で色を
 *   分けるためcreateFaceMeshesの2メッシュ構成で描画する
 * - EdgesGeometryで黒い枠線を追加
 */
export const createBoardMesh = (
  board: Board,
  frontColor: string,
  options: {
    name?: string;
    enablePolygonOffset?: boolean;
    opacity?: number;
  } = {}
): THREE.Group => {
  const shape = new THREE.Shape();
  shape.moveTo(board[0].x, board[0].y);
  for (let i = 1; i < board.length; i++) {
    shape.lineTo(board[i].x, board[i].y);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  const opacity = options.opacity ?? 1;
  const [frontMesh, backMesh] = createFaceMeshes(board, geometry, frontColor, {
    transparent: opacity < 1,
    opacity,
    ...(options.enablePolygonOffset
      ? { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }
      : {}),
  });

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
  group.add(frontMesh);
  group.add(backMesh);
  group.add(wireframe);

  return group;
};
