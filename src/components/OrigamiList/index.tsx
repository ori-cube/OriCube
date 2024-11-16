"use client";

import React from "react";
import styles from "./index.module.scss";
import { OrigamiListItem } from "./OrigamiListItem";
import { useOrigamiListPage } from "@/app/_provider";

export const OrigamiList = () => {
  const { filteredOrigamiList } = useOrigamiListPage();
  return (
    <div>
      {filteredOrigamiList.length === 0 ? (
        <p className={styles.notFound}>折り紙が見つかりませんでした。</p>
      ) : (
        <li className={styles.list}>
          {filteredOrigamiList.map((item) => (
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
