import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createBoardMesh } from "./index";
import { Board } from "../../types";

const createTriangleBoard = (): Board => [
  new THREE.Vector3(-50, -50, 0),
  new THREE.Vector3(50, -50, 0),
  new THREE.Vector3(0, 50, 0),
];

describe("createBoardMesh", () => {
  it("板メッシュと枠線を含むGroupを返す", () => {
    const group = createBoardMesh(createTriangleBoard(), "#4A90E2");

    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.children).toHaveLength(2);
    expect(group.children[0]).toBeInstanceOf(THREE.Mesh);
    expect(group.children[1]).toBeInstanceOf(THREE.LineSegments);
  });

  it("指定した名前がGroupに設定される", () => {
    const group = createBoardMesh(createTriangleBoard(), "#4A90E2", {
      name: "board_static",
    });

    expect(group.name).toBe("board_static");
  });

  it("マテリアルは半透明・両面描画で指定色になる", () => {
    const group = createBoardMesh(createTriangleBoard(), "#ff0000");
    const mesh = group.children[0];

    if (!(mesh instanceof THREE.Mesh)) throw new Error("Mesh not found");
    const material = mesh.material;
    if (!(material instanceof THREE.MeshLambertMaterial)) {
      throw new Error("MeshLambertMaterial not found");
    }

    expect(material.color.getHexString()).toBe("ff0000");
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(0.9);
    expect(material.polygonOffset).toBe(false);
  });

  it("enablePolygonOffset指定時はpolygonOffsetが有効になる", () => {
    const group = createBoardMesh(createTriangleBoard(), "#4A90E2", {
      enablePolygonOffset: true,
    });
    const mesh = group.children[0];

    if (!(mesh instanceof THREE.Mesh)) throw new Error("Mesh not found");
    const material = mesh.material;
    if (!(material instanceof THREE.MeshLambertMaterial)) {
      throw new Error("MeshLambertMaterial not found");
    }

    expect(material.polygonOffset).toBe(true);
    expect(material.polygonOffsetFactor).toBe(-1);
  });

  it("多角形の頂点数に応じた三角形分割が行われる", () => {
    // 四角形は2つの三角形（6頂点分のインデックス）に分割される
    const square: Board = [
      new THREE.Vector3(-50, -50, 0),
      new THREE.Vector3(50, -50, 0),
      new THREE.Vector3(50, 50, 0),
      new THREE.Vector3(-50, 50, 0),
    ];
    const group = createBoardMesh(square, "#4A90E2");
    const mesh = group.children[0];

    if (!(mesh instanceof THREE.Mesh)) throw new Error("Mesh not found");
    const index = mesh.geometry.getIndex();

    expect(index).not.toBeNull();
    expect(index?.count).toBe(6);
  });
});
