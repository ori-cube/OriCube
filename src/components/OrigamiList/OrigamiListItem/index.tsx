import React from "react";
import Link from "next/link";
import styles from "./index.module.scss";
import Image from "next/image";
import { Zen_Maru_Gothic } from "next/font/google";

const ZenMaruFont = Zen_Maru_Gothic({
  weight: "700",
  subsets: ["latin"],
});

export type ListItemProps = {
  id?: string;
  name?: string;
  imageUrl: string;
};

export const OrigamiListItem: React.FC<ListItemProps> = ({
  id,
  name,
  imageUrl,
}) => {
  return (
    <Link href={`/${id}`} className={styles.listItem}>
      <Image
        src={imageUrl}
        alt={`サムネイル: ${name}の折り紙画像`}
        width={500}
        height={400}
        className={styles.image}
      />
      <p className={ZenMaruFont.className}>{name}</p>
    </Link>
  );
};
