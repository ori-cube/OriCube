import React from "react";
import Link from "next/link";
import styles from "./index.module.scss";
import Image from "next/image";
import { Model } from "@/types/model";

type OrigamiListItemProps = Omit<
  Model,
  "searchKeyWord" | "procedure" | "color"
>;

export const OrigamiListItem: React.FC<OrigamiListItemProps> = ({
  id,
  name,
  imageUrl,
}) => {
  return (
    <Link href={{ pathname: `/${id}` }} className={styles.listItem}>
      <Image
        src={imageUrl ? imageUrl : ""}
        alt={`サムネイル: ${name}の折り紙画像`}
        width={500}
        height={400}
        className={styles.image}
      />
      <p>{name}</p>
    </Link>
  );
};
