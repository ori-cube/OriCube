import React from "react";
import {
  HiArrowUturnLeft,
  HiArrowUturnRight,
  HiArrowsRightLeft,
  HiCubeTransparent,
} from "react-icons/hi2";
import { IconButton } from "@/components/ui/IconButton";
import styles from "./index.module.scss";

interface Props {
  /** 1手戻せるか */
  canUndo: boolean;
  /** 1手やり直せるか */
  canRedo: boolean;
  /** 裏返せるか */
  canFlip: boolean;
  /** ビューモードを切り替えられるか */
  canToggleViewMode: boolean;
  /** ビューモード中か */
  isViewing: boolean;
  /** 折り操作を1手戻す */
  onUndo: () => void;
  /** 戻した折り操作を1手やり直す */
  onRedo: () => void;
  /** 折り紙を裏返す（視点を180度回転する） */
  onFlip: () => void;
  /** ビューモード（確認用の回転視点）を切り替える */
  onToggleViewMode: () => void;
}

/**
 * キャンバス左上にオーバーレイする操作ツールバー
 *
 * @description
 * - Undo / Redo / 裏返す / ビューモードのボタンを縦に並べる
 * - 操作できない状態（履歴の端・折りアニメーション中など）は
 *   呼び出し側が canUndo / canRedo / canFlip / canToggleViewMode で
 *   無効化する
 */
export function Toolbar({
  canUndo,
  canRedo,
  canFlip,
  canToggleViewMode,
  isViewing,
  onUndo,
  onRedo,
  onFlip,
  onToggleViewMode,
}: Props) {
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
      <IconButton
        Icon={HiArrowsRightLeft}
        handleClick={onFlip}
        disable={!canFlip}
        ariaLabel="裏返す"
      />
      <IconButton
        Icon={HiCubeTransparent}
        handleClick={onToggleViewMode}
        disable={!canToggleViewMode}
        ariaLabel={isViewing ? "折りに戻る" : "ビューモード"}
      />
    </div>
  );
}
