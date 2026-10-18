"use client";

import { useId } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import styles from "./SegmentedControl.module.css";

export type SegmentedControlItem<T extends string> = {
  id: T;
  label: string;
  /** 選択肢として見せたまま選べなくする */
  isDisabled?: boolean;
};

export type SegmentedControlProps<T extends string> = {
  /** 選択肢の組の名前。画面に表示し、読み上げにも使う */
  label: string;
  items: SegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * 少数の選択肢から1つを選ぶ横並びのボタン群。選んだ項目は常に1つ残る。
 * React Aria の ToggleButtonGroup で radiogroup として伝え、矢印キーで移動できる。
 */
export function SegmentedControl<T extends string>({ label, items, value, onChange, className }: SegmentedControlProps<T>) {
  const labelId = useId();
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <span id={labelId} className={styles.label}>{label}</span>
      <ToggleButtonGroup
        aria-labelledby={labelId}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
          const [next] = keys;
          if (next !== undefined) onChange(next as T);
        }}
        className={styles.group}
      >
        {items.map((item) => (
          <ToggleButton key={item.id} id={item.id} isDisabled={item.isDisabled} className={styles.item}>
            {item.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
