import * as THREE from "three";
import { OrigamiStep } from "../../types";

const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);

/**
 * 鶴の基本形 + 足細め4回（表裏×左右）までの折り手順
 *
 * @description
 * - 実際のドラッグ&ドロップ操作のダンプから再構成したフィクスチャ
 *   （一辺100の正方形が前提）
 * - リプレイすると40枚の板になり、細くした先端(50,50)は表裏あわせて
 *   16枚の板が重なる。この状態が中割り折り（首・尾を起こす操作）の入力になる
 */
export const craneNarrowedLegsSteps: OrigamiStep[] = [
  {
    kind: "fold",
    foldLine: { start: v(-50, 50), end: v(50, -50) },
    dragVertex: v(-50, -50),
    foldCount: 1,
    viewFront: true,
  },
  {
    kind: "fold",
    foldLine: { start: v(50, 50), end: v(0, 0) },
    dragVertex: v(-50, 50),
    foldCount: 2,
    viewFront: true,
  },
  {
    kind: "squash",
    foldLine: { start: v(0, 0), end: v(50, 0) },
    dragVertex: v(50, -50),
    viewFront: true,
  },
  {
    kind: "squash",
    foldLine: { start: v(0, 0), end: v(50, 0) },
    dragVertex: v(50, -50),
    viewFront: false,
  },
  {
    kind: "petal",
    foldLine: { start: v(29.2893, 0), end: v(0, 29.2893) },
    dragVertex: v(50, 50),
    viewFront: false,
  },
  {
    kind: "petal",
    foldLine: { start: v(29.2893, 0), end: v(0, 29.2893) },
    dragVertex: v(50, 50),
    viewFront: true,
  },
  {
    kind: "fold",
    foldLine: { start: v(11.7317, -7.2726), end: v(50, 50) },
    dragVertex: v(29.2893, 0),
    foldCount: 5,
    viewFront: true,
  },
  {
    kind: "fold",
    foldLine: { start: v(50, 50), end: v(-7.2726, 11.7317) },
    dragVertex: v(0, 29.2893),
    foldCount: 5,
    viewFront: true,
  },
  {
    kind: "fold",
    foldLine: { start: v(11.7317, -7.2726), end: v(50, 50) },
    dragVertex: v(29.2893, 0),
    foldCount: 5,
    viewFront: false,
  },
  {
    kind: "fold",
    foldLine: { start: v(50, 50), end: v(-7.2726, 11.7317) },
    dragVertex: v(0, 29.2893),
    foldCount: 5,
    viewFront: false,
  },
];
