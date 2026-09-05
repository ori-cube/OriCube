import * as THREE from "three";
import { FoldLine, LayeredBoard } from "../../types";
import { calculateFoldLine } from "../calculateFoldLine";
import { calculateFoldLineSpan } from "../calculateFoldLineSpan";
import { applyFoldStep, findFoldCandidates } from "../applyFoldStep";
import { mirrorBoardAcrossLine } from "../rotateBoard";

export interface FoldPreview {
  foldLine: FoldLine;
  /** 成立する最少枚数の動く片（鏡映後の座標・元のレイヤー） */
  movingBoards: LayeredBoard[];
}

/** ドロップ時と同じ成立判定で、つながった面を置き去りにしない予告を作る。 */
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
  for (let foldCount = 1; foldCount <= candidates.length; foldCount++) {
    const span = calculateFoldLineSpan(
      foldLineInfo.midpoint,
      foldLineInfo.direction,
      candidates.slice(0, foldCount).map((candidate) => candidate.polygon)
    );
    if (!span) continue;

    const result = applyFoldStep(boards, {
      kind: "fold",
      foldLine: span,
      dragVertex,
      foldCount,
      viewFront,
    });
    if (!result) continue;

    return {
      foldLine: span,
      movingBoards: result.movingBoards.map((board) => ({
        ...board,
        polygon: mirrorBoardAcrossLine(board.polygon, span),
      })),
    };
  }

  // 通常の折りが成立しない位置では、実行できない形を予告しない。
  // 特殊折りの選択肢はドロップ時に判定する。
  return null;
};
