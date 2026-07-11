import React, { useState } from "react";
import { FoldChoice } from "../hooks";
import styles from "./index.module.scss";

interface Props {
  /** 折る枚数の上限（頂点を共有する板の数） */
  maxFoldCount: number;
  /** 選択できる（折りが成立する）枚数の一覧 */
  validCounts: number[];
  /** 開いて畳むが選択できるか */
  squashAvailable: boolean;
  /** 花弁折りが選択できるか */
  petalAvailable: boolean;
  /** 選択した操作（枚数・開いて畳む・花弁折り）で折りを確定する */
  onConfirm: (choice: FoldChoice) => void;
  /** 折りを取りやめる */
  onCancel: () => void;
}

/**
 * 折り方（折る枚数・開いて畳む・花弁折り）を選択するフローティングカード
 *
 * @description
 * - 折りで頂点が重なり、複数の操作から選べる場合にキャンバス下部へ表示する
 * - 折りが成立しない枚数は選択できない
 * - 開いて畳む・花弁折りが成立する場合は枚数の選択肢に加えて表示する
 * - デフォルトは選択できる最小の枚数（枚数が選べない場合は開いて畳む、
 *   それもない場合は花弁折り）
 */
export function FoldCountSelector({
  maxFoldCount,
  validCounts,
  squashAvailable,
  petalAvailable,
  onConfirm,
  onCancel,
}: Props) {
  const [selectedChoice, setSelectedChoice] = useState<FoldChoice>(
    validCounts[0] ?? (squashAvailable ? "squash" : "petal")
  );

  const counts = Array.from({ length: maxFoldCount }, (_, index) => index + 1);

  return (
    <div className={styles.card} role="dialog" aria-label="折り方の選択">
      <p className={styles.label}>折る枚数</p>
      <div className={styles.counts}>
        {counts.map((count) => (
          <button
            key={count}
            type="button"
            className={
              count === selectedChoice
                ? styles.count_button_selected
                : styles.count_button
            }
            disabled={!validCounts.includes(count)}
            onClick={() => setSelectedChoice(count)}
          >
            {count}
          </button>
        ))}
      </div>
      {squashAvailable && (
        <button
          type="button"
          className={
            selectedChoice === "squash"
              ? styles.squash_button_selected
              : styles.squash_button
          }
          onClick={() => setSelectedChoice("squash")}
        >
          開いて畳む
        </button>
      )}
      {petalAvailable && (
        <button
          type="button"
          className={
            selectedChoice === "petal"
              ? styles.squash_button_selected
              : styles.squash_button
          }
          onClick={() => setSelectedChoice("petal")}
        >
          花弁折り
        </button>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.cancel_button} onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className={styles.confirm_button}
          onClick={() => onConfirm(selectedChoice)}
        >
          折る
        </button>
      </div>
    </div>
  );
}
