import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { snapToNearestSnapPoint, SNAP_ATTRACTION_RADIUS } from "./index";
import { SnapPoint } from "../collectSnapPoints";

const createSnapPoint = (x: number, y: number): SnapPoint => ({
  position: new THREE.Vector3(x, y, 0),
  boardCount: 1,
});

describe("snapToNearestSnapPoint", () => {
  it("吸着半径内のスナップポイントへ吸着する", () => {
    const snapPoints = [createSnapPoint(50, 50)];
    const position = new THREE.Vector3(
      50 + SNAP_ATTRACTION_RADIUS / 2,
      50,
      0
    );

    const result = snapToNearestSnapPoint(position, snapPoints);

    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
    expect(result.z).toBe(0);
  });

  it("吸着半径の外では入力の位置をそのまま返す", () => {
    const snapPoints = [createSnapPoint(50, 50)];
    const position = new THREE.Vector3(
      50 + SNAP_ATTRACTION_RADIUS * 2,
      50,
      0
    );

    const result = snapToNearestSnapPoint(position, snapPoints);

    expect(result).toBe(position);
  });

  it("複数が半径内にある場合は最も近いスナップポイントへ吸着する", () => {
    const near = createSnapPoint(3, 0);
    const far = createSnapPoint(-5, 0);
    const position = new THREE.Vector3(0, 0, 0);

    const result = snapToNearestSnapPoint(position, [far, near]);

    expect(result.x).toBe(3);
    expect(result.y).toBe(0);
  });

  it("距離は斜め方向でもXY平面上のユークリッド距離で判定する", () => {
    // x, y それぞれは半径内だが、ユークリッド距離では半径を超える点
    const snapPoints = [createSnapPoint(0, 0)];
    const component = SNAP_ATTRACTION_RADIUS * 0.9;
    const position = new THREE.Vector3(component, component, 0);

    const result = snapToNearestSnapPoint(position, snapPoints);

    expect(result).toBe(position);
  });

  it("吸着時はスナップポイントの座標のコピーを返す（元を書き換えない）", () => {
    const snapPoint = createSnapPoint(50, 50);
    const position = new THREE.Vector3(51, 51, 0);

    const result = snapToNearestSnapPoint(position, [snapPoint]);

    expect(result).not.toBe(snapPoint.position);
    result.x = 999;
    expect(snapPoint.position.x).toBe(50);
  });

  it("スナップポイントが空の場合は入力の位置をそのまま返す", () => {
    const position = new THREE.Vector3(10, 20, 0);

    expect(snapToNearestSnapPoint(position, [])).toBe(position);
  });
});
