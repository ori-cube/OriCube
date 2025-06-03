import styles from "./index.module.scss";
import React from "react";

type Props = {
  handleRegisterOrigami: () => void;
};

export const ShootingModal: React.FC<Props> = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>撮影モード</h2>
      <p className={styles.description}>
        撮影モードでは、折り紙の写真を撮影することができます。カメラの位置や角度を調整して、最適な写真を撮影してください。
      </p>
      <button className={styles.startButton}>撮影を開始</button>
    </div>
  );
};
