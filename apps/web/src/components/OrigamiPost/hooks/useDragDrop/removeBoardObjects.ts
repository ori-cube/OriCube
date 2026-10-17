import * as THREE from "three";
import { disposeObject3D } from "../../utils/disposeObject3D";

/**
 * シーン上の板とスナップポイントをすべて削除する
 *
 * @description
 * 対象は名前が "board" で始まるオブジェクト（板メッシュ・ピボットGroup）と
 * "snapPoint_" で始まるオブジェクト。削除時にgeometry/materialも破棄する
 */
export const removeBoardObjects = (scene: THREE.Scene): void => {
  const obsoleteObjects = scene.children.filter(
    (child) =>
      child.name.startsWith("board") || child.name.startsWith("snapPoint_")
  );

  obsoleteObjects.forEach((object) => {
    scene.remove(object);
    disposeObject3D(object);
  });
};
