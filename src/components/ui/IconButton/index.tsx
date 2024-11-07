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
}

export const IconButton: React.FC<Props> = ({
  handleClick,
  color = "#000",
  Icon,
  size = ButtonSizeProp.medium,
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
      <Icon size={size} color={disable ? "#aaa" : color} />
    </button>
  );
};
