import type { ProcedureThumbnail } from "@oricube/engine";
import { OrigamiThumbnail } from "../OrigamiThumbnail";
import styles from "./index.module.css";

export interface OrigamiCoverProps {
  /** 投稿時に撮影した画像。無い作品（モックなど）は null */
  thumbnailUrl: string | null;
  /** 手順から作る完成形の図。画像が無いときに描く */
  thumbnail: ProcedureThumbnail;
  color: string;
}

/**
 * 作品のカードに載せる正方形の表紙
 *
 * @description
 * 撮影した画像があればそれを、無ければ完成形の図を出す。作品名を併記する前提で装飾扱いにする
 */
export function OrigamiCover({ thumbnailUrl, thumbnail, color }: OrigamiCoverProps) {
  return thumbnailUrl
    ? <div className={[styles.cover, styles.photo].join(" ")}><img src={thumbnailUrl} alt="" loading="lazy" width={640} height={640} /></div>
    : <div className={styles.cover}><OrigamiThumbnail thumbnail={thumbnail} color={color} /></div>;
}
