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
          ? `${styles.button_disable} width: ${44}; height: ${44}`
          : `${styles.button} width: ${44}; height: ${44}`
      }
      disabled={disable}
    >
      <Icon size={28} color={disable ? "#aaa" : color} />
    </button>
  );
};
