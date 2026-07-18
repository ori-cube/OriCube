import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { snapToNearestSnapPoint, SNAP_ATTRACTION_RADIUS } from "./index";

const target = (x: number, y: number): THREE.Vector3 =>
  new THREE.Vector3(x, y, 0);

describe("snapToNearestSnapPoint", () => {
  it("吸着半径内のスナップ先へ吸着する", () => {
    const snapTargets = [target(50, 50)];
    const position = new THREE.Vector3(
      50 + SNAP_ATTRACTION_RADIUS / 2,
      50,
      0
    );

    const result = snapToNearestSnapPoint(position, snapTargets);

    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
    expect(result.z).toBe(0);
  });

  it("吸着半径の外では入力の位置をそのまま返す", () => {
    const snapTargets = [target(50, 50)];
    const position = new THREE.Vector3(
      50 + SNAP_ATTRACTION_RADIUS * 2,
      50,
      0
    );

    const result = snapToNearestSnapPoint(position, snapTargets);

    expect(result).toBe(position);
  });

  it("複数が半径内にある場合は最も近いスナップ先へ吸着する", () => {
    const near = target(3, 0);
    const far = target(-5, 0);
    const position = new THREE.Vector3(0, 0, 0);

    const result = snapToNearestSnapPoint(position, [far, near]);

    expect(result.x).toBe(3);
    expect(result.y).toBe(0);
  });

  it("距離は斜め方向でもXY平面上のユークリッド距離で判定する", () => {
    // x, y それぞれは半径内だが、ユークリッド距離では半径を超える点
    const snapTargets = [target(0, 0)];
    const component = SNAP_ATTRACTION_RADIUS * 0.9;
    const position = new THREE.Vector3(component, component, 0);

    const result = snapToNearestSnapPoint(position, snapTargets);

    expect(result).toBe(position);
  });

  it("吸着時はスナップ先の座標のコピーを返す（元を書き換えない）", () => {
    const snapTarget = target(50, 50);
    const position = new THREE.Vector3(51, 51, 0);

    const result = snapToNearestSnapPoint(position, [snapTarget]);

    expect(result).not.toBe(snapTarget);
    result.x = 999;
    expect(snapTarget.x).toBe(50);
  });

  it("スナップ先が空の場合は入力の位置をそのまま返す", () => {
    const position = new THREE.Vector3(10, 20, 0);

    expect(snapToNearestSnapPoint(position, [])).toBe(position);
  });
});
