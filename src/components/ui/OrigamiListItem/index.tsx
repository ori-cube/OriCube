import React, { createContext, useContext } from "react";
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
  imageUrl: string;
  name: string;
  children?: React.ReactNode;
};

const OrigamiListItemContext = createContext<ListItemProps>(
  {} as ListItemProps
);

export const OrigamiListItem = (props: ListItemProps) => {
  return (
    <OrigamiListItemContext.Provider
      value={{ id: props.id, imageUrl: props.imageUrl, name: props.name }}
    >
      <Link href={`/${props.id}`} className={styles.listItem}>
        {props.children}
      </Link>
    </OrigamiListItemContext.Provider>
  );
};

const OrigamiImage = ({ className }: { className?: string }) => {
  const { imageUrl, name } = useContext(OrigamiListItemContext);
  return (
    <Image
      src={imageUrl}
      alt={`サムネイル: ${name}の折り紙画像`}
      width={500}
      height={400}
      className={`${styles.image} ${className}`}
    />
  );
};
OrigamiListItem.OrigamiImage = OrigamiImage;

const Title = ({ className }: { className?: string }) => {
  const { name } = useContext(OrigamiListItemContext);
  return <p className={`${ZenMaruFont.className} ${className}`}>{name}</p>;
};
OrigamiListItem.Title = Title;
