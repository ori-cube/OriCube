import React, { useState } from "react";
import styles from "./index.module.scss";

interface Props {
  /** 折る枚数の上限（頂点を共有する板の数） */
  maxFoldCount: number;
  /** 選択できる（折りが成立する）枚数の一覧 */
  validCounts: number[];
  /** 選択した枚数で折りを確定する */
  onConfirm: (count: number) => void;
  /** 折りを取りやめる */
  onCancel: () => void;
}

/**
 * 折る枚数を選択するフローティングカード
 *
 * @description
 * - 折りで頂点が重なり、複数の板を折れる場合にキャンバス下部へ表示する
 * - 折りが成立しない枚数は選択できない
 * - デフォルトは選択できる最小の枚数（通常は最前面の1枚）
 */
export function FoldCountSelector({
  maxFoldCount,
  validCounts,
  onConfirm,
  onCancel,
}: Props) {
  const [selectedCount, setSelectedCount] = useState(validCounts[0] ?? 1);

  const counts = Array.from({ length: maxFoldCount }, (_, index) => index + 1);

  return (
    <div className={styles.card} role="dialog" aria-label="折る枚数の選択">
      <p className={styles.label}>折る枚数</p>
      <div className={styles.counts}>
        {counts.map((count) => (
          <button
            key={count}
            type="button"
            className={
              count === selectedCount
                ? styles.count_button_selected
                : styles.count_button
            }
            disabled={!validCounts.includes(count)}
            onClick={() => setSelectedCount(count)}
          >
            {count}
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.cancel_button} onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className={styles.confirm_button}
          onClick={() => onConfirm(selectedCount)}
        >
          折る
        </button>
      </div>
    </div>
  );
}
