import * as THREE from "three";

// 折り線の色、裏面の色を取得する関数
export const calculateOutlineAndBackColors = (
  hexColor: string
): {
  outlineColor: THREE.Color;
  backMaterialColor: THREE.Color;
} => {
  // 元の色
  const base = new THREE.Color(hexColor);
  const baseHSL = { h: 0, s: 0, l: 0 };
  base.getHSL(baseHSL);

  // 枠線:色相を180°回転、輝度を反転
  const outlineH = (baseHSL.h + 0.5) % 1.0;
  const outlineL = 1 - baseHSL.l;
  const outlineColor = new THREE.Color().setHSL(outlineH, baseHSL.s, outlineL);

  // 裏面:outlineの輝度を反転した灰色
  const backMatL = 1 - outlineL;
  const backMaterialColor = new THREE.Color().setHSL(0, 0, backMatL);
  return { outlineColor, backMaterialColor };
};
