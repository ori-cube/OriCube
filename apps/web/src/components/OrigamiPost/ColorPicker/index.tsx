import { ColorField } from "@oricube/design-system";
import styles from "./index.module.scss";

interface Props {
  /** 現在の折り紙の表面の色 */
  color: string;
  /** 色の変更ハンドラ */
  onColorChange: (color: string | null) => void;
}

/**
 * キャンバス右上にオーバーレイする折り紙の色選択パネル
 *
 * @description
 * - 表面の色のみ選択できる（裏面はBOARD_BACK_COLORの固定色）
 */
export function ColorPicker({ color, onColorChange }: Props) {
  return (
    <div className={styles.container}>
      <ColorField label="折り紙の色" value={color} onChange={onColorChange} />
    </div>
  );
}
