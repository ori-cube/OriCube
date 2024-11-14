// PlayButton.tsx

import React from "react";
import styles from "./index.module.scss"; // SASS ファイルをインポート

interface Props {
  handleClick: () => void;
  color?: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  disable?: boolean;
  isLoopStandby: boolean;
}

export const PlayButton: React.FC<Props> = ({
  handleClick,
  color = "#000",
  Icon,
  disable = false,
  isLoopStandby,
}) => {
  return (
    <button onClick={handleClick} className={styles.button} disabled={disable}>
      {isLoopStandby ? (
        <div className={styles.circle}>
          <div className={styles.circle_inner}>
            <Icon size={28} color={disable ? "#aaa" : color} />
          </div>
        </div>
      ) : (
        <Icon size={28} color={disable ? "#aaa" : color} />
      )}
    </button>
  );
};
