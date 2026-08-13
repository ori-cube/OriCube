import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createBoardMesh } from "./index";
import { Board } from "../../types";
import { BOARD_BACK_COLOR } from "../../constants";

// 反時計回り（表が+Z向き）の三角形
const createTriangleBoard = (): Board => [
  new THREE.Vector3(-50, -50, 0),
  new THREE.Vector3(50, -50, 0),
  new THREE.Vector3(0, 50, 0),
];

const findFaceMaterials = (
  group: THREE.Group
): { front: THREE.MeshLambertMaterial; back: THREE.MeshLambertMaterial } => {
  const materials = group.children
    .filter((child): child is THREE.Mesh => child instanceof THREE.Mesh)
    .map((mesh) => mesh.material);

  const isLambert = (
    material: THREE.Material | THREE.Material[]
  ): material is THREE.MeshLambertMaterial =>
    material instanceof THREE.MeshLambertMaterial;

  const front = materials
    .filter(isLambert)
    .find((material) => material.side === THREE.FrontSide);
  const back = materials
    .filter(isLambert)
    .find((material) => material.side === THREE.BackSide);
  if (!front || !back) throw new Error("表裏のマテリアルが見つかりません");
  return { front, back };
};

describe("createBoardMesh", () => {
  it("表裏の板メッシュと枠線を含むGroupを返す", () => {
    const group = createBoardMesh(createTriangleBoard(), "#4A90E2");

    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.children).toHaveLength(3);
    expect(group.children[0]).toBeInstanceOf(THREE.Mesh);
    expect(group.children[1]).toBeInstanceOf(THREE.Mesh);
    expect(group.children[2]).toBeInstanceOf(THREE.LineSegments);
  });

  it("指定した名前がGroupに設定される", () => {
    const group = createBoardMesh(createTriangleBoard(), "#4A90E2", {
      name: "board_static",
    });

    expect(group.name).toBe("board_static");
  });

  it("反時計回りの板は+Z側が指定色、-Z側が裏面色になる", () => {
    const group = createBoardMesh(createTriangleBoard(), "#ff0000");
    const { front, back } = findFaceMaterials(group);

    expect(front.color.getHexString()).toBe("ff0000");
    expect(back.color.getHexString()).toBe(
      BOARD_BACK_COLOR.replace("#", "").toLowerCase()
    );
    expect(front.transparent).toBe(false);
    expect(front.opacity).toBe(1);
    expect(front.polygonOffset).toBe(false);
  });

  it("時計回り（裏返った）の板は+Z側が裏面色、-Z側が指定色になる", () => {
    // 折りはXY平面上の鏡映なので、裏返った板は頂点列が時計回りになる
    const mirroredBoard = createTriangleBoard().reverse();
    const group = createBoardMesh(mirroredBoard, "#ff0000");
    const { front, back } = findFaceMaterials(group);

    expect(front.color.getHexString()).toBe(
      BOARD_BACK_COLOR.replace("#", "").toLowerCase()
    );
    expect(back.color.getHexString()).toBe("ff0000");
  });

  it("opacity指定時は表裏両方が半透明になる", () => {
    const group = createBoardMesh(createTriangleBoard(), "#4A90E2", {
      opacity: 0.45,
    });
    const { front, back } = findFaceMaterials(group);

    expect(front.transparent).toBe(true);
    expect(front.opacity).toBe(0.45);
    expect(back.transparent).toBe(true);
    expect(back.opacity).toBe(0.45);
  });

  it("enablePolygonOffset指定時はpolygonOffsetが有効になる", () => {
    const group = createBoardMesh(createTriangleBoard(), "#4A90E2", {
      enablePolygonOffset: true,
    });
    const { front, back } = findFaceMaterials(group);

    expect(front.polygonOffset).toBe(true);
    expect(front.polygonOffsetFactor).toBe(-1);
    expect(back.polygonOffset).toBe(true);
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
