import * as THREE from "three";
import { disposeObject3D } from "../disposeObject3D";

/**
 * 折り線を可視化する
 *
 * @param scene - Three.jsのシーン
 * @param start - 折り線の始点
 * @param end - 折り線の終点
 * @param options.color - 折り線の色（デフォルト: 赤）
 * @param options.radius - 円柱の半径（デフォルト: 0.5）
 * @param options.name - オブジェクト名（デフォルト: "foldLine"。
 *        開いて畳むのヒンジ線のように複数の線を表示する場合は
 *        "foldLine"で始まる別名を指定する）
 *
 * @description
 * - 同名の既存の折り線があれば置き換える
 * - 2点を結ぶ円柱のジオメトリで折り線を描画
 */
export const visualizeFoldLine = (
  scene: THREE.Scene,
  start: THREE.Vector3,
  end: THREE.Vector3,
  options: { color?: string; radius?: number; name?: string } = {}
): void => {
  const { color = "#ff0000", radius = 0.5, name = "foldLine" } = options;

  const existingLine = scene.getObjectByName(name);
  if (existingLine) {
    scene.remove(existingLine);
    disposeObject3D(existingLine);
  }

  // 2点間の距離を計算
  const distance = start.distanceTo(end);

  // 円柱のジオメトリを作成（高さは距離、半径は指定値）
  const geometry = new THREE.CylinderGeometry(radius, radius, distance, 16);
  const material = new THREE.MeshBasicMaterial({ color });
  const cylinder = new THREE.Mesh(geometry, material);

  // 2点の中点に配置
  const midpoint = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5);
  cylinder.position.copy(midpoint);

  // 2点を結ぶ方向に回転
  // デフォルトの円柱はY軸方向なので、start→endの方向ベクトルに合わせる
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const axis = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
  const angle = Math.acos(new THREE.Vector3(0, 1, 0).dot(direction));

  // 回転を適用して折り紙上に折り線が表示されるようにする
  if (axis.length() > 0) {
    cylinder.quaternion.setFromAxisAngle(axis, angle);
  }

  // 名前を設定してシーンに追加
  cylinder.name = name;
  scene.add(cylinder);
};

/**
 * シーン上の折り線（名前が"foldLine"で始まるもの）をすべて削除する
 * （リソースも破棄）
 */
export const removeFoldLine = (scene: THREE.Scene): void => {
  const foldLines = scene.children.filter((child) =>
    child.name.startsWith("foldLine")
  );
  foldLines.forEach((foldLine) => {
    scene.remove(foldLine);
    disposeObject3D(foldLine);
  });
};
