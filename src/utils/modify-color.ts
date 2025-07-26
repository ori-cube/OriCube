import * as THREE from "three";

// 色のアウトラインを取得する関数
export const getOutlineColor = (hexColor: string): THREE.Color => {
  const color = new THREE.Color(hexColor);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);

  // 色相(h)を180度回転させ、補色を取得 (0.5を加算)
  hsl.h = (hsl.h + 0.5) % 1.0;

  return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
};
