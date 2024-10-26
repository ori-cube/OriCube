import React from "react";
import { IconType } from "react-icons";
import styles from "./index.module.scss";

interface Props {
  handleClick: () => void;
  Icon: IconType;
  color?: string;
}

export const IconButton: React.FC<Props> = ({
  handleClick,
  color = "#000",
  Icon,
}) => {
  return (
    <button onClick={handleClick} className={styles.button}>
      <Icon size={28} color={color} />
    </button>
  );
};
