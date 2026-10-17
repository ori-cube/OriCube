import { IconButton, type IconButtonProps } from "@oricube/design-system";
import styles from "./index.module.scss";

/**
 * 操作ごとのアイコン
 *
 * @description
 * 元に戻す・やり直す・裏返す・ビューモード用のアイコンはFigmaに未作成のため、
 * 既存のアイコンを仮に割り当てている。Figmaに追加して同期したら差し替える
 */
const ICONS = {
  undo: "ArrowLeftIcon",
  redo: "ArrowRightIcon",
  flip: "RepeatIcon",
  viewMode: "SearchIcon",
} satisfies Record<string, IconButtonProps["icon"]>;

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
      <IconButton icon={ICONS.undo} label="元に戻す" onPress={onUndo} isDisabled={!canUndo} />
      <IconButton icon={ICONS.redo} label="やり直す" onPress={onRedo} isDisabled={!canRedo} />
      <IconButton icon={ICONS.flip} label="裏返す" onPress={onFlip} isDisabled={!canFlip} />
      <IconButton
        icon={ICONS.viewMode}
        label={isViewing ? "折りに戻る" : "ビューモード"}
        onPress={onToggleViewMode}
        isDisabled={!canToggleViewMode}
      />
    </div>
  );
}
