"use client";

import type { ReactNode } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Button } from "../Button";
import styles from "./ConfirmDialog.module.css";

export type ConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  /** 確認の内容。何が起きるか・取り消せるかを書く */
  children: ReactNode;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  /** 実行中は両方のボタンを無効にし、閉じさせない */
  isPending?: boolean;
  /** 削除など取り消せない操作。実行ボタンを危険を示す色にする */
  destructive?: boolean;
  /** 失敗したときの案内。ダイアログの中に表示する */
  errorMessage?: string;
};

/**
 * 操作の前に確認するダイアログ（role="alertdialog"）
 *
 * @description
 * React Aria の Modal で、開いている間はフォーカスを中に閉じ込め、背景を操作できなくする。
 * 初期フォーカスは「やめる」側に置き、Esc とやめるボタンで閉じる。実行中（isPending）は閉じない
 */
export function ConfirmDialog({ isOpen, onOpenChange, title, children, confirmText, cancelText = "やめる", onConfirm, isPending = false, destructive = false, errorMessage }: ConfirmDialogProps) {
  const close = (next: boolean) => { if (!isPending) onOpenChange(next); };
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={close} isDismissable={!isPending} isKeyboardDismissDisabled={isPending} className={styles.overlay}>
      <Modal className={styles.modal}>
        <Dialog role="alertdialog" className={styles.dialog}>
          <Heading slot="title" className={styles.title}>{title}</Heading>
          <div className={styles.body}>{children}</div>
          {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
          <div className={styles.actions}>
            <Button text={cancelText} variant="secondary" onClick={() => close(false)} disabled={isPending} autoFocus />
            <Button text={confirmText} className={destructive ? styles.destructive : undefined} onClick={onConfirm} disabled={isPending} />
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
