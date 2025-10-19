import React from "react";
import Link from "next/link";
import styles from "./index.module.scss";
import Image from "next/image";
import { Model } from "@/types/model";
import { Tag } from "@/components/ui";
import { FaStar } from "react-icons/fa";

type OrigamiListItem = (
  props: Omit<Model, "searchKeyWord" | "procedure" | "color">
) => JSX.Element;

export const OrigamiListItem: OrigamiListItem = ({
  id,
  name,
  imageUrl,
  difficulty = 0, // デフォルト値0を設定（未設定の場合は0）
  tags = [], // デフォルト値として空配列を設定
}) => {
  return (
    <Link href={{ pathname: `/${id}` }} className={styles.listItem}>
      <div className={styles.difficultyContainer}>
        <span className={styles.difficultyLabel}>むずかしさ</span>
        <div className={styles.difficultyStars}>
          {Array.from({ length: 5 }, (_, index) => {
            const starNumber = index + 1;
            const isFilled = starNumber <= difficulty;
            return (
              <FaStar
                key={starNumber}
                className={`${styles.star} ${
                  isFilled ? styles.filled : styles.empty
                }`}
              />
            );
          })}
        </div>
      </div>
      <Image
        src={imageUrl ? imageUrl : ""}
        alt={`サムネイル: ${name}の折り紙画像`}
        width={500}
        height={400}
        className={styles.image}
      />
      <p className={styles.title}>{name}</p>
      {tags && tags.length > 0 && (
        <div className={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <Tag key={index} title={tag.title} colorStyle={tag.colorStyle} />
          ))}
        </div>
      )}
    </Link>
  );
};
