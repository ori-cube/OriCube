import * as THREE from "three";
import { Board, FoldLine, LayeredBoard } from "../../types";
import { calculateFoldLine } from "../calculateFoldLine";
import { calculateFoldLineSpan } from "../calculateFoldLineSpan";
import { findFoldCandidates } from "../applyFoldStep";
import { separateBoard } from "../separateBoard";
import { selectMovingBoard } from "../selectMovingBoard";
import { mirrorBoardAcrossLine } from "../rotateBoard";

/**
 * ドラッグ中の折りプレビュー
 */
export interface FoldPreview {
  /** 折り線のスパン（全候補板を覆う表示用の区間） */
  foldLine: FoldLine;
  /** 折り線で鏡映した後の動く片（最前面の候補板のみ） */
  movingPolygon: Board;
  /** 動く片の元になった板のレイヤー（表示高さの計算に使用） */
  layer: number;
}

/**
 * ドラッグ中の位置から折りのプレビュー形状を計算する
 *
 * @param props.boards - 現在の板の一覧
 * @param props.dragVertex - ドラッグした頂点の元位置
 * @param props.draggedPosition - ドラッグ中の現在位置（吸着後）
 * @param props.viewFront - 表側（+Z側）から見ているか
 * @returns 折り線スパンと、最前面の候補板を折り線で鏡映した片。
 *          折り線が引けない・候補板がない場合はnull
 *
 * @description
 * 毎フレーム呼ばれる前提の軽量な計算に限定する。折り操作の成立検証
 * （枚数ごとの破れ判定や特殊折りの判定）はドロップ時にのみ行い、
 * プレビューは「最前面の1枚がどんな形に折れるか」だけを示す:
 * - 折り線が最前面の板を横切る場合はドラッグ頂点側の片を鏡映する
 * - 横切らない場合（板全体がドラッグ頂点側にある場合）は板全体を鏡映する
 */
export const computeFoldPreview = (props: {
  boards: LayeredBoard[];
  dragVertex: THREE.Vector3;
  draggedPosition: THREE.Vector3;
  viewFront: boolean;
}): FoldPreview | null => {
  const { boards, dragVertex, draggedPosition, viewFront } = props;

  const foldLineInfo = calculateFoldLine(dragVertex, draggedPosition);
  if (!foldLineInfo) return null;

  const candidates = findFoldCandidates(boards, dragVertex, viewFront);
  if (candidates.length === 0) return null;

  const span = calculateFoldLineSpan(
    foldLineInfo.midpoint,
    foldLineInfo.direction,
    candidates.map((candidate) => candidate.polygon)
  );
  if (!span) return null;

  const top = candidates[0];
  const separated = separateBoard(top.polygon, top.sourcePolygon, span);
  if (!separated) {
    // 折り線が最前面の板を横切らない場合は板全体が動く
    return {
      foldLine: span,
      movingPolygon: mirrorBoardAcrossLine(top.polygon, span),
      layer: top.layer,
    };
  }

  const selected = selectMovingBoard(separated, dragVertex, span);
  if (!selected) return null;

  return {
    foldLine: span,
    movingPolygon: mirrorBoardAcrossLine(selected.movingPiece.polygon, span),
    layer: top.layer,
  };
};
