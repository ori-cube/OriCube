import type { ReactNode } from "react";
import { Button, FloatingPanel, IconButton, type IconButtonProps } from "@oricube/design-system";
import styles from "./index.module.css";

/**
 * 元に戻す・やり直すのアイコン
 *
 * @description
 * 専用のアイコンはFigmaに未作成のため、既存の矢印を仮に割り当てている。
 * Figmaに追加して同期したら差し替える
 */
const ICONS = {
  undo: "ArrowLeftIcon",
  redo: "ArrowRightIcon",
} satisfies Record<string, IconButtonProps["icon"]>;

interface Props {
  /** 1手戻せるか */
  canUndo: boolean;
  /** 1手やり直せるか */
  canRedo: boolean;
  /** 裏返せるか */
  canFlip: boolean;
  /** 回して確認するモードを切り替えられるか */
  canToggleViewMode: boolean;
  /** 回して確認するモード中か */
  isViewing: boolean;
  /** 折り操作を1手戻す */
  onUndo: () => void;
  /** 戻した折り操作を1手やり直す */
  onRedo: () => void;
  /** 折り紙を裏返す（視点を180度回転する） */
  onFlip: () => void;
  /** 回して確認するモード（確認用の回転視点）を切り替える */
  onToggleViewMode: () => void;
  /** 指定した場合は裏返す・回して確認の代わりにパネルへ表示する（折り方の選択など） */
  children?: ReactNode;
}

/**
 * キャンバス下端にオーバーレイする操作帯
 *
 * @description
 * - 閲覧画面の「前へ」「次へ」と同じ位置に、手順を行き来する
 *   元に戻す・やり直すを大きな丸ボタンで置く
 * - 中央のパネルには裏返す・回して確認を置き、折り方の選択中は
 *   children（選択パネル）に置き換える。選択中は元に戻す・やり直すを隠し、
 *   選択パネルを横長にして紙と折り線を覆わないようにする
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
  children,
}: Props) {
  return (
    <div className={styles.bottom} role="group" aria-label="折り操作">
      {!children && <IconButton variant="floating" size="lg" icon={ICONS.undo} label="元に戻す" aria-keyshortcuts="Control+Z Meta+Z" className={styles.undo} onPress={onUndo} isDisabled={!canUndo} />}
      <FloatingPanel className={[styles.panel, children ? styles.wide : undefined].filter(Boolean).join(" ")}>
        {children ?? (
          <div className={styles.tools}>
            <Button variant="secondary" prefixIcon="RepeatIcon" text="裏返す" onClick={onFlip} disabled={!canFlip} />
            <Button variant="secondary" prefixIcon="SearchIcon" text="回して確認" selected={isViewing} onClick={onToggleViewMode} disabled={!canToggleViewMode} />
          </div>
        )}
      </FloatingPanel>
      {!children && <IconButton variant="floating" size="lg" icon={ICONS.redo} label="やり直す" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y" className={styles.redo} onPress={onRedo} isDisabled={!canRedo} />}
    </div>
  );
}
