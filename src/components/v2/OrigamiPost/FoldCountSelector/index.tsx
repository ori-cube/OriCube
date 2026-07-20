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
  /** 中割り折りが選択できるか */
  insideReverseAvailable: boolean;
  /**
   * 選択した操作（枚数・開いて畳む・花弁折り・中割り折り）で折りを確定する
   *
   * @param choice - 選択した操作
   * @param angle - 折り角（ラジアン。枚数選択時のみ意味を持ち、それ以外はπ）
   */
  onConfirm: (choice: FoldChoice, angle: number) => void;
  /** 折りを取りやめる */
  onCancel: () => void;
}

/**
 * 折り方（折る枚数・開いて畳む・花弁折り・中割り折り）を選択する
 * フローティングカード
 *
 * @description
 * - 折りで頂点が重なり、複数の操作から選べる場合にキャンバス下部へ表示する
 * - 折りが成立しない枚数は選択できない
 * - 開いて畳む・花弁折り・中割り折りが成立する場合は枚数の選択肢に加えて
 *   表示する
 * - デフォルトは選択できる最小の枚数（枚数が選べない場合は開いて畳む →
 *   花弁折り → 中割り折りの順）
 */
export function FoldCountSelector({
  maxFoldCount,
  validCounts,
  squashAvailable,
  petalAvailable,
  insideReverseAvailable,
  onConfirm,
  onCancel,
}: Props) {
  const [selectedChoice, setSelectedChoice] = useState<FoldChoice>(
    validCounts[0] ??
      (squashAvailable ? "squash" : petalAvailable ? "petal" : "insideReverse")
  );
  // 折り角（度）。180度未満は仕上げ角度（枚数選択時のみ有効）
  const [angleDeg, setAngleDeg] = useState(180);

  const counts = Array.from({ length: maxFoldCount }, (_, index) => index + 1);
  const isCountSelected = typeof selectedChoice === "number";
  const confirmAngle = isCountSelected
    ? (angleDeg * Math.PI) / 180
    : Math.PI;

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
      {insideReverseAvailable && (
        <button
          type="button"
          className={
            selectedChoice === "insideReverse"
              ? styles.squash_button_selected
              : styles.squash_button
          }
          onClick={() => setSelectedChoice("insideReverse")}
        >
          中割り折り
        </button>
      )}
      {isCountSelected && (
        <label className={styles.angle}>
          <span className={styles.label}>折り角度 {angleDeg}°</span>
          <input
            type="range"
            min={90}
            max={180}
            step={5}
            value={angleDeg}
            onChange={(event) => setAngleDeg(Number(event.target.value))}
            aria-label="折り角度"
          />
        </label>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.cancel_button} onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className={styles.confirm_button}
          onClick={() => onConfirm(selectedChoice, confirmAngle)}
        >
          折る
        </button>
      </div>
    </div>
  );
}
