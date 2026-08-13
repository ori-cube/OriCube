/**
 * 板を重なり順（layer）に応じて浮かせるZオフセット
 *
 * @description
 * 折り重なった板を完全に同一平面に置くとz-fightingが起きるため、
 * layer 1つにつきこの距離だけ+Z方向へ浮かせて描画する
 */
export const BOARD_LAYER_OFFSET = 0.05;

/**
 * 紙の裏面の色
 *
 * @description
 * 表面はユーザーが選択できるが、裏面はこの固定色で描画する
 */
export const BOARD_BACK_COLOR = "#DFDFDF";
