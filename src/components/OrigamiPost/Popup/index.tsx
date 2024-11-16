"use client";

import React, { useEffect, useState } from "react";
import styles from "./index.module.scss";
import classNames from "classnames";

type PopupType = "success" | "error" | "info";

interface PopupProps {
  message: string;
  type?: PopupType; // メッセージの種類
  duration?: number; // 表示時間（ミリ秒）
  onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({
  message,
  type = "info",
  duration = 6000,
  onClose,
}) => {
  const [closing, setClosing] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 6000); // アニメーションの時間と一致させる
  };

  return (
    <div
      className={classNames(styles.popup, styles[type], {
        [styles.closing]: closing,
      })}
    >
      <p>{message}</p>
      <button className={styles.closeButton} onClick={handleClose}>
        &times;
      </button>
    </div>
  );
};

export default Popup;
