import React from "react";
import styles from "./index.module.scss";
import { ListItemProps, OrigamiListItem } from "./OrigamiListItem";
import { Zen_Maru_Gothic } from "next/font/google";

const ZenMaruFont = Zen_Maru_Gothic({
  weight: "500",
  subsets: ["latin"],
});

type OrigamiListProps = {
  origamiList: ListItemProps[];
};
export const OrigamiList = ({ origamiList }: OrigamiListProps) => {
  const items = origamiList;
  return (
    <div>
      {items.length === 0 ? (
        <p className={`${ZenMaruFont.className} ${styles.notFound}`}>
          折り紙が見つかりませんでした。
        </p>
      ) : (
        <li className={styles.list}>
          {items.map((item) => (
            <ul className={styles.listItem} key={item?.id}>
              <OrigamiListItem
                id={item?.id}
                name={item?.name}
                imageUrl={item?.imageUrl}
              >
                <OrigamiListItem.OrigamiImage />
                <OrigamiListItem.Title />
              </OrigamiListItem>
            </ul>
          ))}
        </li>
      )}
    </div>
  );
};
