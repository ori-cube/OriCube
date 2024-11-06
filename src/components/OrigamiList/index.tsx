"use client";

import React from "react";
import styles from "./index.module.scss";
import { OrigamiListItem } from "./OrigamiListItem";
import { Zen_Maru_Gothic } from "next/font/google";
import { useOrigamiListPage } from "@/app/_provider";

const ZenMaruFont = Zen_Maru_Gothic({
  weight: "500",
  subsets: ["latin"],
});

export const OrigamiList = () => {
  const { filteredOrigamiList } = useOrigamiListPage();
  return (
    <div>
      {filteredOrigamiList.length === 0 ? (
        <p className={`${ZenMaruFont.className} ${styles.notFound}`}>
          折り紙が見つかりませんでした。
        </p>
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
