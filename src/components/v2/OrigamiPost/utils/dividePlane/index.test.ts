import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { dividePlane } from "./index";

describe("dividePlane", () => {
  describe("正方形の分割", () => {
    it("正方形を中央で水平に分割", () => {
      // 100x100の正方形
      const plane = [
        new THREE.Vector3(-50, 0, -50), // 左奥
        new THREE.Vector3(50, 0, -50), // 右奥
        new THREE.Vector3(50, 0, 50), // 右手前
        new THREE.Vector3(-50, 0, 50), // 左手前
      ];

      // 折り線: X軸方向（Y=0, Z=0）
      const foldLineStart = new THREE.Vector3(-50, 0, 0);
      const foldLineEnd = new THREE.Vector3(50, 0, 0);

      // originalPointは奥側（Z < 0）
      const originalPoint = new THREE.Vector3(0, 0, -25);

      const result = dividePlane(
        plane,
        foldLineStart,
        foldLineEnd,
        originalPoint
      );

      // movingPartは奥側（2つの頂点 + 2つの交点 = 4つ）
      expect(result.movingPart.length).toBe(4);
      // fixedPartは手前側（2つの頂点 + 2つの交点 = 4つ）
      expect(result.fixedPart.length).toBe(4);

      // movingPartに originalPoint が含まれることを確認（近似）
      const hasOriginalPoint = result.movingPart.some((v) => v.z < 0);
      expect(hasOriginalPoint).toBe(true);
    });

    it("正方形を対角線で分割", () => {
      // 100x100の正方形
      const plane = [
        new THREE.Vector3(-50, 0, -50), // 左奥
        new THREE.Vector3(50, 0, -50), // 右奥
        new THREE.Vector3(50, 0, 50), // 右手前
        new THREE.Vector3(-50, 0, 50), // 左手前
      ];

      // 折り線: 左奥から右手前への対角線
      const foldLineStart = new THREE.Vector3(-50, 0, -50);
      const foldLineEnd = new THREE.Vector3(50, 0, 50);

      // originalPointは右奥側
      const originalPoint = new THREE.Vector3(25, 0, -25);

      const result = dividePlane(
        plane,
        foldLineStart,
        foldLineEnd,
        originalPoint
      );

      // 各部分は3頂点（三角形）
      expect(result.movingPart.length).toBe(3);
      expect(result.fixedPart.length).toBe(3);
    });
  });
});
