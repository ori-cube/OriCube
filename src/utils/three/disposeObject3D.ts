import * as THREE from "three";

/**
 * Object3Dとその子孫が保持するジオメトリ・マテリアルを破棄する
 *
 * @param object - 破棄対象のObject3D（Mesh, Group, LineSegmentsなど）
 *
 * @description
 * - シーンからremoveしただけではGPUリソースは解放されないため、
 *   remove時に必ずこの関数を呼び出してメモリリークを防ぐ
 * - traverseで子孫を含めて走査し、geometryとmaterialをdisposeする
 * - materialが配列の場合（マルチマテリアル）にも対応
 */
export const disposeObject3D = (object: THREE.Object3D): void => {
  const geometries = new Set<THREE.BufferGeometry>();
  const materialsToDispose = new Set<THREE.Material>();
  object.traverse((child) => {
    if (child instanceof THREE.DirectionalLight || child instanceof THREE.SpotLight) {
      child.shadow.dispose();
    }
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof THREE.Points
    ) {
      geometries.add(child.geometry);

      const materials: THREE.Material[] = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => materialsToDispose.add(material));
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materialsToDispose.forEach((material) => material.dispose());
};
