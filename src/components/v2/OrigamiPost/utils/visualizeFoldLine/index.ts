import * as THREE from "three";

/**
 * 折り線を可視化する
 *
 * @param scene - Three.jsのシーン
 * @param start - 折り線の始点
 * @param end - 折り線の終点
 * @param color - 折り線の色（デフォルト: 赤）
 * @param radius - 円柱の半径（デフォルト: 0.5）
 *
 * @description
 * - 既存の折り線があれば削除
 * - 2点を結ぶ円柱のジオメトリで折り線を描画
 * - 折り線の名前は "foldLine" で固定
 */
export const visualizeFoldLine = (
  scene: THREE.Scene,
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: string = "#ff0000",
  radius: number = 0.5
): void => {
  // 既存の折り線を削除
  const existingFoldLine = scene.getObjectByName("foldLine");
  if (existingFoldLine) {
    scene.remove(existingFoldLine);
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
  cylinder.name = "foldLine";
  scene.add(cylinder);
};
