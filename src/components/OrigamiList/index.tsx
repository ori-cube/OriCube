import React from "react";
import styles from "./index.module.scss";
import { OrigamiListItem } from "../OrigamiListItem";

type Props = {};

export const OrigamiList: React.FC<Props> = () => {
  const items = [
    {
      id: "1",
      name: "Origami 1",
      imageUrl: "https://placehold.jp/100x80.png",
    },
    {
      id: "2",
      name: "Origami 2",
      imageUrl: "https://placehold.jp/100x80.png",
    },
    {
      id: "3",
      name: "Origami 3",
      imageUrl: "https://placehold.jp/100x80.png",
    },
    {
      id: "4",
      name: "Origami 4",
      imageUrl: "https://placehold.jp/100x80.png",
    },
    {
      id: "5",
      name: "Origami 5",
      imageUrl: "https://placehold.jp/100x80.png",
    },
  ];

  return (
    <li className={styles.list}>
      {items.map((item) => (
        <ul className={styles.listItem}>
          <OrigamiListItem
            key={item.id}
            id={item.id}
            name={item.name}
            imageUrl={item.imageUrl}
          />
        </ul>
      ))}
    </li>
  );
};
