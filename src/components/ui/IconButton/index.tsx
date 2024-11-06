import React from "react";
import { IconType } from "react-icons";
import styles from "./index.module.scss";

interface Props {
  handleClick: () => void;
  Icon: IconType;
  color?: string;
  size?: number;
  disable: boolean;
}

export const IconButton: React.FC<Props> = ({
  handleClick,
  color = "#000",
  Icon,
  size = 44,
  disable = false,
}) => {
  return (
    <button
      onClick={handleClick}
      className={
        disable
          ? `${styles.button_disable} width: ${size}; height: ${size}`
          : `${styles.button} width: ${size}; height: ${size}`
      }
      disabled={disable}
    >
      <Icon size={28} color={disable ? "#aaa" : color} />
    </button>
  );
};
