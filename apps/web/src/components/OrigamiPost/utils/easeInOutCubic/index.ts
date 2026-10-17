/**
 * アニメーションの進行度（0〜1）を「ゆっくり始まり、中盤で加速し、
 * ゆっくり終わる」曲線に変換するイージング関数
 *
 * @description
 * 経過時間をそのまま使うと等速で機械的な動きになるため、
 * 手の動きに近い緩急をつける。3次曲線を前半・後半で
 * つないだ標準的なease-in-out（https://easings.net/#easeInOutCubic）
 */
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
