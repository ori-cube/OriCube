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
  difficulty = 1, // デフォルト値1を設定
  tags = [], // デフォルト値として空配列を設定
}) => {
  // 難易度に応じて星の色を決定
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= difficulty;
      stars.push(
        <FaStar
          key={i}
          className={`${styles.star} ${
            isFilled ? styles.filled : styles.empty
          }`}
        />
      );
    }
    return stars;
  };

  return (
    <Link href={{ pathname: `/${id}` }} className={styles.listItem}>
      <div className={styles.difficultyStars}>{renderStars()}</div>
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
