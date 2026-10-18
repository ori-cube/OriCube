import type { ProcedureThumbnail } from "@oricube/engine";
import { BOARD_BACK_COLOR } from "../OrigamiPost/constants";
import styles from "./index.module.css";

export interface OrigamiThumbnailProps {
  thumbnail: ProcedureThumbnail;
  color: string;
  className?: string;
}

/**
 * 完成形を正面から見た図（engine の createProcedureThumbnail）を SVG で描く
 *
 * @description
 * 一覧で作品ごとに WebGL を起動しないよう、平らな多角形として描く。名前を併記する前提で装飾扱いにする
 */
export function OrigamiThumbnail({ thumbnail, color, className }: OrigamiThumbnailProps) {
  return <svg className={[styles.thumbnail, className].filter(Boolean).join(" ")} viewBox={thumbnail.viewBox.join(" ")} aria-hidden focusable="false">
    {thumbnail.faces.map((face, index) => {
      const points = face.points.map((point) => point.join(",")).join(" ");
      // 傾いた面ほど暗くして、重なった面の境目を見分けやすくする（下の面が透けないよう塗りは不透明にする）
      const shadow = Math.round((1 - face.shade) * 30) / 100;
      return <g key={index}>
        <polygon className={styles.face} points={points} fill={face.side === "front" ? color : BOARD_BACK_COLOR} />
        {shadow > 0 && <polygon className={styles.shadow} points={points} fillOpacity={shadow} />}
      </g>;
    })}
  </svg>;
}
