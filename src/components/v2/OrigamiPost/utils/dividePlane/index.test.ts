import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { dividePlane } from "./index";

describe("dividePlane", () => {
  describe("正方形の分割（XY平面）", () => {
    it("正方形を中央で水平に分割", () => {
      // 100x100の正方形（XY平面、Z=0）
      const plane = [
        new THREE.Vector3(-50, -50, 0), // 左下
        new THREE.Vector3(50, -50, 0), // 右下
        new THREE.Vector3(50, 50, 0), // 右上
        new THREE.Vector3(-50, 50, 0), // 左上
      ];

      // 折り線: X軸方向（Y=0, Z=0）
      const foldLineStart = new THREE.Vector3(-50, 0, 0);
      const foldLineEnd = new THREE.Vector3(50, 0, 0);

      // originalPointは下側（Y < 0）
      const originalPoint = new THREE.Vector3(0, -25, 0);

      const { movingPart, fixedPart } = dividePlane({
        plane,
        foldLineStart,
        foldLineEnd,
        originalPoint,
      });

      // movingPartは下側（2つの頂点 + 2つの交点 = 4つ）
      expect(movingPart.length).toBe(4);
      // fixedPartは上側（2つの頂点 + 2つの交点 = 4つ）
      expect(fixedPart.length).toBe(4);

      // movingPartに originalPoint が含まれることを確認（Y < 0）
      const hasOriginalPoint = movingPart.some((v) => v.y < 0);
      expect(hasOriginalPoint).toBe(true);
    });

    it("正方形を対角線で分割", () => {
      // 100x100の正方形（XY平面、Z=0）
      const plane = [
        new THREE.Vector3(-50, -50, 0), // 左下
        new THREE.Vector3(50, -50, 0), // 右下
        new THREE.Vector3(50, 50, 0), // 右上
        new THREE.Vector3(-50, 50, 0), // 左上
      ];

      // 折り線: 左下から右上への対角線
      const foldLineStart = new THREE.Vector3(-50, -50, 0);
      const foldLineEnd = new THREE.Vector3(50, 50, 0);

      // originalPointは右下側
      const originalPoint = new THREE.Vector3(25, -25, 0);

      const { movingPart, fixedPart } = dividePlane({
        plane,
        foldLineStart,
        foldLineEnd,
        originalPoint,
      });

      // 各部分は3頂点（三角形）
      expect(movingPart.length).toBe(3);
      expect(fixedPart.length).toBe(3);
    });
  });
});
