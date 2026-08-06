"use client";

import { CameraView } from "@/types/model";
import styles from "./index.module.scss";

export interface PerspectivePanelProps {
  handleDirectionClick: (view: CameraView) => void;
}

export const PerspectivePanel: React.FC<PerspectivePanelProps> = (props: {
  handleDirectionClick: (view: CameraView) => void;
}) => {
  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        {/* 1行目: 空 / 上 / 空 */}
        <span />
        <button
          className={styles.btn}
          onClick={() => props.handleDirectionClick("up")}
        >
          上
        </button>
        <span />

        {/* 2行目: 左 / 正面 / 右 */}
        <button
          className={styles.btn}
          onClick={() => props.handleDirectionClick("left")}
        >
          左
        </button>
        <button
          className={styles.btn}
          onClick={() => props.handleDirectionClick("default")}
        >
          正面
        </button>
        <button
          className={styles.btn}
          onClick={() => props.handleDirectionClick("right")}
        >
          右
        </button>

        {/* 3行目: 空 / 下 / 空 */}
        <span />
        <button
          className={styles.btn}
          onClick={() => props.handleDirectionClick("down")}
        >
          下
        </button>
        <span />
      </div>
      <div style={{ marginTop: 8 }}>
        <button
          className={`${styles.btn} ${styles.btnWide}`}
          onClick={() => props.handleDirectionClick("back")}
        >
          裏面
        </button>
      </div>
    </div>
  );
};
