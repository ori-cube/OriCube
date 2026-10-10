import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { removeObjects } from "./removeObjects";
import { disposeObject3D } from "./disposeObject3D";

describe("3Dリソースの解放", () => {
  it("残す折り線を保ち、取り除く板のリソースと親への参照を解放する", () => {
    const scene = new THREE.Scene();
    const axis = new THREE.Object3D();
    axis.name = "Axis";
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    scene.add(axis, mesh);
    const geometryDispose = vi.spyOn(mesh.geometry, "dispose");
    const materialDispose = vi.spyOn(mesh.material, "dispose");
    removeObjects(scene, (object) => object.name !== "Axis");
    expect(scene.children).toEqual([axis]);
    expect(mesh.parent).toBeNull();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
  });

  it("共有された板のリソースは一度ずつ解放し、影も破棄する", () => {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    const light = new THREE.DirectionalLight();
    group.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material), light);
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const shadowDispose = vi.spyOn(light.shadow, "dispose");
    disposeObject3D(group);
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(shadowDispose).toHaveBeenCalledOnce();
  });
});
