import React from "react";
import { IconType } from "react-icons";
import styles from "./index.module.scss";
import { ButtonSizeProp } from "@/types/button";

interface Props {
  handleClick: () => void;
  Icon: IconType;
  color?: string;
  size?: ButtonSizeProp;
  disable: boolean;
  /** アイコンのみのボタンをスクリーンリーダーへ説明するラベル */
  ariaLabel?: string;
}

export const IconButton: React.FC<Props> = ({
  handleClick,
  color = "#000",
  Icon,
  disable = false,
  ariaLabel,
}) => {
  return (
    <button
      onClick={handleClick}
      className={disable ? `${styles.button_disable}` : `${styles.button}`}
      disabled={disable}
      aria-label={ariaLabel}
    >
      <Icon size={28} color={disable ? "#aaa" : color} />
    </button>
  );
};
