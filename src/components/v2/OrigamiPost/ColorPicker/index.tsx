import React from "react";
import styles from "./index.module.scss";

interface Props {
  /** 現在の折り紙の表面の色 */
  color: string;
  /** 色の変更ハンドラ */
  onColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * キャンバス右上にオーバーレイする折り紙の色選択パネル
 *
 * @description
 * - 表面の色のみ選択できる（裏面はBOARD_BACK_COLORの固定色）
 */
export function ColorPicker({ color, onColorChange }: Props) {
  return (
    <label className={styles.container}>
      <span className={styles.label}>色</span>
      <input
        type="color"
        className={styles.picker}
        value={color}
        onChange={onColorChange}
        aria-label="折り紙の色"
      />
    </label>
  );
}
