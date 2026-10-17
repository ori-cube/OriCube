import { useState } from "react";
import { Button, SegmentedControl, Slider } from "@oricube/design-system";
import { FoldChoice } from "../hooks";
import styles from "./index.module.css";

type FoldKind = "fold" | "squash" | "petal" | "insideReverse";

const KIND_LABELS: Record<FoldKind, string> = {
  fold: "枚数を選んで折る",
  squash: "開いて畳む",
  petal: "花弁折り",
  insideReverse: "中割り折り",
};

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
 * 折り方（折る枚数・開いて畳む・花弁折り・中割り折り）を選択するパネル
 *
 * @description
 * - 折りで頂点が重なり、複数の操作から選べる場合に下端の操作帯へ表示する
 * - 開いて畳む・花弁折り・中割り折りが成立する場合だけ「折り方」を選ばせ、
 *   通常の折りでは枚数と仕上げ角度を選ぶ
 * - 折りが成立しない枚数は表示したまま選択できない。重なりがなく1枚しか
 *   折れない場合は枚数を表示しない
 * - デフォルトは選択できる最小の枚数（枚数が選べない場合は開いて畳む →
 *   花弁折り → 中割り折りの順）
 * - 表示時に「折る」へフォーカスし、Enterで確定、Escapeで取りやめる
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
  const available: Record<FoldKind, boolean> = {
    fold: validCounts.length > 0,
    squash: squashAvailable,
    petal: petalAvailable,
    insideReverse: insideReverseAvailable,
  };
  const kinds = (Object.keys(KIND_LABELS) as FoldKind[]).filter(
    (kind) => kind === "fold" || available[kind]
  );
  const [kind, setKind] = useState<FoldKind>(
    () => kinds.find((candidate) => available[candidate]) ?? "fold"
  );
  const [count, setCount] = useState(validCounts[0] ?? 1);
  // 折り角（度）。180度未満は仕上げ角度（枚数選択時のみ有効）
  const [angleDeg, setAngleDeg] = useState(180);

  const choice: FoldChoice = kind === "fold" ? count : kind;
  const confirmAngle = kind === "fold" ? (angleDeg * Math.PI) / 180 : Math.PI;
  const counts = Array.from({ length: maxFoldCount }, (_, index) => index + 1);

  return (
    <section
      className={styles.selector}
      role="dialog"
      aria-label="折り方の選択"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onCancel();
      }}
    >
      {kinds.length > 1 && (
        <SegmentedControl
          label="折り方"
          value={kind}
          onChange={setKind}
          items={kinds.map((id) => ({ id, label: KIND_LABELS[id], isDisabled: !available[id] }))}
        />
      )}
      <div className={styles.row}>
        {kind === "fold" && maxFoldCount > 1 && (
          <SegmentedControl
            label="折る枚数（上から）"
            value={String(count)}
            onChange={(value) => setCount(Number(value))}
            items={counts.map((value) => ({ id: String(value), label: String(value), isDisabled: !validCounts.includes(value) }))}
          />
        )}
        {kind === "fold" && (
          <div className={styles.angle}>
            <Slider
              label="折り角度"
              minValue={90}
              maxValue={180}
              step={5}
              value={angleDeg}
              onChange={setAngleDeg}
              formatOptions={{ style: "unit", unit: "degree", unitDisplay: "narrow" }}
            />
          </div>
        )}
        <div className={styles.actions}>
          <Button variant="secondary" text="キャンセル" onClick={onCancel} />
          <Button text="折る" autoFocus onClick={() => onConfirm(choice, confirmAngle)} />
        </div>
      </div>
    </section>
  );
}
