// components/IconButton/IconButton.tsx

import React from "react";
import styles from "./index.module.scss";
import { IconType } from "react-icons";
import { HiMiniPlay } from "react-icons/hi2";

interface Props {
  handleClick: () => void;
  color?: string;
  Icon: IconType;
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
    <button
      onClick={handleClick}
      className={disable ? styles.button_disable : styles.button}
      disabled={disable}
    >
      {isLoopStandby ? (
        <>
          {/*下側の灰色アイコン */}
          <HiMiniPlay size={28} color="#aaa" className={styles.iconBottom} />
          {/* 上層の青色アイコン */}
          {!disable && (
            <HiMiniPlay size={28} color={color} className={styles.iconTop} />
          )}
        </>
      ) : (
        <Icon size={28} color={disable ? "#aaa" : color} />
      )}
    </button>
  );
};
