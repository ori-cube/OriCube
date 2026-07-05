import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { disposeObject3D } from "./index";

describe("disposeObject3D", () => {
  it("Meshのジオメトリとマテリアルを破棄する", () => {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);

    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");

    disposeObject3D(mesh);

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
  });

  it("Groupの子孫のMeshとLineSegmentsをすべて破棄する", () => {
    const meshGeometry = new THREE.BufferGeometry();
    const meshMaterial = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(meshGeometry, meshMaterial);

    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial();
    const line = new THREE.LineSegments(lineGeometry, lineMaterial);

    const group = new THREE.Group();
    group.add(mesh);
    group.add(line);

    const disposeSpies = [
      vi.spyOn(meshGeometry, "dispose"),
      vi.spyOn(meshMaterial, "dispose"),
      vi.spyOn(lineGeometry, "dispose"),
      vi.spyOn(lineMaterial, "dispose"),
    ];

    disposeObject3D(group);

    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });

  it("マテリアルが配列の場合はすべて破棄する", () => {
    const geometry = new THREE.BufferGeometry();
    const materials = [
      new THREE.MeshBasicMaterial(),
      new THREE.MeshBasicMaterial(),
    ];
    const mesh = new THREE.Mesh(geometry, materials);

    const materialDisposeSpies = materials.map((material) =>
      vi.spyOn(material, "dispose")
    );

    disposeObject3D(mesh);

    materialDisposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });

  it("ジオメトリ・マテリアルを持たないObject3Dではエラーにならない", () => {
    const group = new THREE.Group();
    group.add(new THREE.Object3D());

    expect(() => disposeObject3D(group)).not.toThrow();
  });
});
