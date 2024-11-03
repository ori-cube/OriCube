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
  size = 28,
  disable = false,
}) => {
  return (
    <button
      onClick={handleClick}
      className={disable ? styles.button_disable : styles.button}
      disabled={disable}
    >
      <Icon size={size} color={disable ? "#aaa" : color} />
    </button>
  );
};
