import React from "react";
import { HiArrowUturnLeft, HiArrowUturnRight } from "react-icons/hi2";
import { IconButton } from "@/components/ui/IconButton";
import styles from "./index.module.scss";

interface Props {
  /** 1手戻せるか */
  canUndo: boolean;
  /** 1手やり直せるか */
  canRedo: boolean;
  /** 折り操作を1手戻す */
  onUndo: () => void;
  /** 戻した折り操作を1手やり直す */
  onRedo: () => void;
}

/**
 * キャンバス左上にオーバーレイする操作ツールバー
 *
 * @description
 * - Undo / Redo ボタンを縦に並べる
 * - 操作できない状態（履歴の端・折りアニメーション中など）は
 *   呼び出し側が canUndo / canRedo で無効化する
 */
export function Toolbar({ canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="折り操作">
      <IconButton
        Icon={HiArrowUturnLeft}
        handleClick={onUndo}
        disable={!canUndo}
        ariaLabel="元に戻す"
      />
      <IconButton
        Icon={HiArrowUturnRight}
        handleClick={onRedo}
        disable={!canRedo}
        ariaLabel="やり直す"
      />
    </div>
  );
}
