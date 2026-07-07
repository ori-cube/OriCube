import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createMorphBoardMesh, updateMorphBoardMeshPositions } from "./index";
import { Board } from "../../types";

const createTriangle = (): Board => [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(20, 0, 0),
  new THREE.Vector3(20, 20, 0),
];

describe("createMorphBoardMesh", () => {
  it("面メッシュと枠線をまとめたGroupを作成する", () => {
    const group = createMorphBoardMesh(createTriangle(), "#4A90E2", {
      name: "board_squash_moving_0",
    });

    expect(group.name).toBe("board_squash_moving_0");
    expect(group.children).toHaveLength(2);
    expect(group.children.some((child) => child instanceof THREE.Mesh)).toBe(
      true
    );
    expect(
      group.children.some((child) => child instanceof THREE.LineLoop)
    ).toBe(true);
  });

  it("作成時に三角形分割され、頂点は初期位置になる", () => {
    const quad: Board = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(10, 10, 0),
      new THREE.Vector3(0, 10, 0),
    ];
    const group = createMorphBoardMesh(quad, "#4A90E2");

    const mesh = group.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh
    );
    expect(mesh).toBeDefined();
    if (!mesh) return;

    // 四角形は2つの三角形（インデックス6個）に分割される
    expect(mesh.geometry.index?.count).toBe(6);

    const position = mesh.geometry.getAttribute("position");
    expect(position.count).toBe(4);
    expect(position.getX(1)).toBeCloseTo(10);
    expect(position.getY(2)).toBeCloseTo(10);
  });
});

describe("updateMorphBoardMeshPositions", () => {
  it("面と枠線の頂点がまとめて動く", () => {
    const group = createMorphBoardMesh(createTriangle(), "#4A90E2");

    updateMorphBoardMeshPositions(group, [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(20, 0, 5),
      new THREE.Vector3(20, 10, 10),
    ]);

    // 面と枠線はposition属性を共有しているため、両方に反映される
    for (const child of group.children) {
      if (
        !(child instanceof THREE.Mesh) &&
        !(child instanceof THREE.LineLoop)
      ) {
        throw new Error("想定外の子オブジェクトです");
      }
      const position = child.geometry.getAttribute("position");
      expect(position.getZ(1)).toBeCloseTo(5);
      expect(position.getY(2)).toBeCloseTo(10);
      expect(position.getZ(2)).toBeCloseTo(10);
      // needsUpdateはversionの加算で反映される
      expect(position.version).toBeGreaterThan(0);
    }
  });

  it("頂点数が作成時と異なる場合は何もしない（防御的処理）", () => {
    const group = createMorphBoardMesh(createTriangle(), "#4A90E2");

    updateMorphBoardMeshPositions(group, [
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(2, 2, 2),
    ]);

    const mesh = group.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh
    );
    expect(mesh).toBeDefined();
    if (!mesh) return;
    const position = mesh.geometry.getAttribute("position");
    expect(position.getX(0)).toBeCloseTo(0);
    expect(position.getX(1)).toBeCloseTo(20);
  });
});
