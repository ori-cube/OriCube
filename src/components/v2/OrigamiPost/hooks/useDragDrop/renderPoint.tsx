import * as THREE from "three";
import { Point } from "../../types";

type RenderSnapPoint = (props: {
  scene: THREE.Scene;
  point: Point;
  name: string;
  color?: number;
  scale?: number;
}) => void;

/**
 * スナップポイント（頂点）をThree.jsシーンに描画する関数
 *
 * @description
 * - 指定された位置に球体のメッシュを作成
 * - デフォルトは青色（0x007b94）、スケール0.3
 * - 指定された名前でシーンに追加
 *
 * @param props.scene - 描画対象のThree.jsシーン
 * @param props.point - 描画位置の座標 [x, y, z]
 * @param props.name - メッシュの名前（識別用）
 * @param props.color - 球体の色（16進数、デフォルト: 0x007b94）
 * @param props.scale - 球体のスケール（デフォルト: 0.3）
 */
export const renderSnapPoint: RenderSnapPoint = ({
  scene,
  point,
  name,
  color = 0x007b94,
  scale = 1,
}) => {
  const geometry = new THREE.SphereGeometry(1, 32, 32).scale(
    scale,
    scale,
    scale
  );
  const material = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(point.x, point.y, point.z);
  mesh.name = name;
  scene.add(mesh);
};

/**
 * ドラッグ中の点をThree.jsシーンに描画する関数
 *
 * @description
 * - ドラッグ中の点を赤色（0xff0000）で表示
 * - 通常のスナップポイントより大きいスケール（0.5）
 * - ドラッグ状態を視覚的に区別
 *
 * @param props.scene - 描画対象のThree.jsシーン
 * @param props.point - 描画位置の座標 [x, y, z]
 * @param props.name - メッシュの名前（識別用）
 */
export const renderDraggedPoint: RenderSnapPoint = ({ scene, point, name }) => {
  renderSnapPoint({
    scene,
    point,
    name,
    color: 0xff0000, // 赤色でドラッグ中の点を表示
    scale: 1,
  });
};
