import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { rotateBoard } from "./index";
import { Board } from "../../types";

// 右半分の板（x >= 0）
const createRightBoard = (): Board => [
  new THREE.Vector3(0, -50, 0),
  new THREE.Vector3(50, -50, 0),
  new THREE.Vector3(50, 50, 0),
  new THREE.Vector3(0, 50, 0),
];

// 中央の縦の折り線の軸（Y軸方向、原点を通る）
const axisPoint = new THREE.Vector3(0, -50, 0);
const axisDirection = new THREE.Vector3(0, 1, 0);

describe("rotateBoard", () => {
  it("180度回転で板が軸を挟んで反対側に折り返される", () => {
    const rotated = rotateBoard(
      createRightBoard(),
      axisPoint,
      axisDirection,
      Math.PI
    );

    // x座標が反転し、y座標は変わらず、z=0に戻る
    const expected = [
      [0, -50, 0],
      [-50, -50, 0],
      [-50, 50, 0],
      [0, 50, 0],
    ];
    rotated.forEach((vertex, i) => {
      expect(vertex.x).toBeCloseTo(expected[i][0]);
      expect(vertex.y).toBeCloseTo(expected[i][1]);
      expect(vertex.z).toBeCloseTo(expected[i][2]);
    });
  });

  it("90度回転で板が垂直に立ち上がる", () => {
    const rotated = rotateBoard(
      createRightBoard(),
      axisPoint,
      axisDirection,
      Math.PI / 2
    );

    // 軸上の頂点は動かず、軸から離れた頂点はz方向へ移動する
    expect(rotated[0].x).toBeCloseTo(0);
    expect(rotated[0].z).toBeCloseTo(0);
    expect(rotated[1].x).toBeCloseTo(0);
    expect(Math.abs(rotated[1].z)).toBeCloseTo(50);
  });

  it("軸上の頂点は回転しても動かない", () => {
    const board: Board = [
      new THREE.Vector3(0, -50, 0),
      new THREE.Vector3(0, 50, 0),
      new THREE.Vector3(50, 0, 0),
    ];

    const rotated = rotateBoard(board, axisPoint, axisDirection, Math.PI);

    expect(rotated[0].toArray()[0]).toBeCloseTo(0);
    expect(rotated[0].toArray()[1]).toBeCloseTo(-50);
    expect(rotated[1].toArray()[0]).toBeCloseTo(0);
    expect(rotated[1].toArray()[1]).toBeCloseTo(50);
  });

  it("元の板の頂点は変更されない（イミュータブル）", () => {
    const board = createRightBoard();
    const original = board.map((vertex) => vertex.clone());

    rotateBoard(board, axisPoint, axisDirection, Math.PI);

    board.forEach((vertex, i) => {
      expect(vertex.equals(original[i])).toBe(true);
    });
  });
});
