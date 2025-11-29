import React from "react";
import styles from "./index.module.scss";
import { ColorStyle } from "@/types/model";

type Tag = (props: { title: string; colorStyle: ColorStyle }) => JSX.Element;

export const Tag: Tag = ({ title, colorStyle }) => {
  return <span className={`${styles.tag} ${styles[colorStyle]}`}>{title}</span>;
};
