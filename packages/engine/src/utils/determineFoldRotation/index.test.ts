import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { determineFoldRotation } from "./index";
import { rotateBoard } from "../rotateBoard";
import { Board, FoldLine } from "../../types";

// 中央の縦の折り線
const verticalFoldLine: FoldLine = {
  start: new THREE.Vector3(0, -50, 0),
  end: new THREE.Vector3(0, 50, 0),
};

// 右半分の板
const rightBoard: Board = [
  new THREE.Vector3(0, -50, 0),
  new THREE.Vector3(50, -50, 0),
  new THREE.Vector3(50, 50, 0),
  new THREE.Vector3(0, 50, 0),
];

// 左半分の板
const leftBoard: Board = [
  new THREE.Vector3(-50, -50, 0),
  new THREE.Vector3(0, -50, 0),
  new THREE.Vector3(0, 50, 0),
  new THREE.Vector3(-50, 50, 0),
];

describe("determineFoldRotation", () => {
  it("正規化された軸ベクトルを返す", () => {
    const axis = determineFoldRotation(verticalFoldLine, rightBoard);

    expect(axis).not.toBeNull();
    expect(axis?.length()).toBeCloseTo(1);
  });

  it("正の回転角で動く板が+Z側へ持ち上がる（右の板）", () => {
    const axis = determineFoldRotation(verticalFoldLine, rightBoard);

    expect(axis).not.toBeNull();
    if (!axis) return;

    // 90度回転すると折り線上以外の頂点はすべて+Z側にある
    const rotated = rotateBoard(
      rightBoard,
      verticalFoldLine.start,
      axis,
      Math.PI / 2
    );
    rotated.forEach((vertex) => expect(vertex.z).toBeGreaterThanOrEqual(-1e-6));
    expect(Math.max(...rotated.map((vertex) => vertex.z))).toBeCloseTo(50);
  });

  it("正の回転角で動く板が+Z側へ持ち上がる（左の板は軸が反転する）", () => {
    const rightAxis = determineFoldRotation(verticalFoldLine, rightBoard);
    const leftAxis = determineFoldRotation(verticalFoldLine, leftBoard);

    expect(rightAxis).not.toBeNull();
    expect(leftAxis).not.toBeNull();
    if (!rightAxis || !leftAxis) return;

    // 左右で軸の向きは反対になる
    expect(leftAxis.dot(rightAxis)).toBeCloseTo(-1);

    const rotated = rotateBoard(
      leftBoard,
      verticalFoldLine.start,
      leftAxis,
      Math.PI / 2
    );
    rotated.forEach((vertex) => expect(vertex.z).toBeGreaterThanOrEqual(-1e-6));
    expect(Math.max(...rotated.map((vertex) => vertex.z))).toBeCloseTo(50);
  });

  it("斜めの折り線でも+Z側へ持ち上がる軸を返す", () => {
    // 対角線の折り線で、右下の三角形が動く場合
    const diagonalFoldLine: FoldLine = {
      start: new THREE.Vector3(-50, -50, 0),
      end: new THREE.Vector3(50, 50, 0),
    };
    const triangle: Board = [
      new THREE.Vector3(-50, -50, 0),
      new THREE.Vector3(50, -50, 0),
      new THREE.Vector3(50, 50, 0),
    ];

    const axis = determineFoldRotation(diagonalFoldLine, triangle);

    expect(axis).not.toBeNull();
    if (!axis) return;

    const rotated = rotateBoard(
      triangle,
      diagonalFoldLine.start,
      axis,
      Math.PI / 2
    );
    rotated.forEach((vertex) => expect(vertex.z).toBeGreaterThanOrEqual(-1e-6));
    expect(Math.max(...rotated.map((vertex) => vertex.z))).toBeGreaterThan(0);
  });

  it("持ち上げ方向に-Zを指定すると軸が反転し、動く板が-Z側へ持ち上がる", () => {
    const frontAxis = determineFoldRotation(verticalFoldLine, rightBoard);
    const backAxis = determineFoldRotation(
      verticalFoldLine,
      rightBoard,
      new THREE.Vector3(0, 0, -1)
    );

    expect(frontAxis).not.toBeNull();
    expect(backAxis).not.toBeNull();
    if (!frontAxis || !backAxis) return;

    // 持ち上げ方向を反転すると軸の向きも反対になる
    expect(backAxis.dot(frontAxis)).toBeCloseTo(-1);

    // 90度回転すると折り線上以外の頂点はすべて-Z側にある
    const rotated = rotateBoard(
      rightBoard,
      verticalFoldLine.start,
      backAxis,
      Math.PI / 2
    );
    rotated.forEach((vertex) => expect(vertex.z).toBeLessThanOrEqual(1e-6));
    expect(Math.min(...rotated.map((vertex) => vertex.z))).toBeCloseTo(-50);
  });

  it("動く板の全頂点が折り線上にある場合はnullを返す", () => {
    const degenerateBoard: Board = [
      new THREE.Vector3(0, -50, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 50, 0),
    ];

    expect(determineFoldRotation(verticalFoldLine, degenerateBoard)).toBeNull();
  });

  it("折り線が退化している場合はnullを返す", () => {
    const degenerateFoldLine: FoldLine = {
      start: new THREE.Vector3(0, 0, 0),
      end: new THREE.Vector3(0, 0, 0),
    };

    expect(determineFoldRotation(degenerateFoldLine, rightBoard)).toBeNull();
  });
});
