import React from "react";
import styles from "./index.module.scss";
import { ListItemProps, OrigamiListItem } from "../OrigamiListItem";

type OrigamiListProps = {
  origamiList: ListItemProps[];
};
export const OrigamiList = ({ origamiList }: OrigamiListProps) => {
  const items = origamiList;
  return (
    <div>
      {items.length === 0 ? (
        <p>アイテムがありません</p>
      ) : (
        <li className={styles.list}>
          {items.map((item) => (
            <ul className={styles.listItem} key={item?.id}>
              <OrigamiListItem
                id={item?.id}
                name={item?.name}
                imageUrl={item?.imageUrl}
              />
            </ul>
          ))}
        </li>
      )}
    </div>
  );
};
