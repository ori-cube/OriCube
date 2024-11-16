import React from "react";
import { IconType } from "react-icons";
import styles from "./index.module.scss";

interface Props {
  handleClick: () => void;
  Icon: IconType;
  color?: string;
  active: boolean;
}

export const LoopButton: React.FC<Props> = ({
  handleClick,
  color = "#000",
  Icon,
  active,
}) => {
  return (
    <button
      onClick={handleClick}
      className={active ? `${styles.button_active}` : `${styles.button}`}
    >
      <Icon size={28} color={color} />
    </button>
  );
};
