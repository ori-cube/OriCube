import type { ProcedureThumbnail } from "@oricube/engine";
import { OrigamiThumbnail } from "../OrigamiThumbnail";
import styles from "./index.module.css";

export interface OrigamiCoverProps {
  /** 手順から作る完成形の図（サーバーが一覧・OGP に描くものと同じ） */
  thumbnail: ProcedureThumbnail;
  color: string;
}

/**
 * 作品のカードに載せる正方形の表紙
 *
 * @description
 * 完成形の図を出す。作品名を併記する前提で装飾扱いにする
 */
export function OrigamiCover({ thumbnail, color }: OrigamiCoverProps) {
  return <div className={styles.cover}><OrigamiThumbnail thumbnail={thumbnail} color={color} /></div>;
}
