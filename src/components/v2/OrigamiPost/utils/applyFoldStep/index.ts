import * as THREE from "three";
import { Board, FoldStep, LayeredBoard } from "../../types";
import { separateBoard } from "../separateBoard";
import { selectMovingBoard } from "../selectMovingBoard";
import { rotateBoard } from "../rotateBoard";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";

/**
 * 折り操作の適用結果
 */
export interface FoldStepResult {
  /** 折り後の全ての板（リプレイの次の入力になる確定状態） */
  boards: LayeredBoard[];
  /** 動く片（回転前の座標・元のレイヤー。折りアニメーションの入力用） */
  movingBoards: LayeredBoard[];
  /** アニメーション中も動かない板（対象板の固定片 + 折り対象外の板） */
  staticBoards: LayeredBoard[];
}

/**
 * 現在の板群に1回の折り操作を適用する純関数
 *
 * @param boards - 現在の板の一覧
 * @param step - 折り操作
 * @returns 適用結果。折りが成立しない場合はnull
 *
 * @description
 * 折りのセマンティクス:
 * 1. dragVertexと同一位置に頂点を持つ板を「候補板」とし、視点側
 *    （表ならlayer降順）から先頭foldCount枚を折る対象にする
 * 2. 対象板それぞれを折り線で分割する。1枚でも分割できなければ
 *    折り全体を不成立としてnullを返す。対象外の板は折り線が
 *    幾何的に横切っていても動かさない（対象の紙だけをつまんで折るため）
 * 3. 各対象板のdragVertexと同じ側の片が「動く片」になる
 * 4. 動く片は折り線周りに180度回転（XY平面上では鏡映）した座標になる
 * 5. 動く片のレイヤーは、表折りなら現在の最大レイヤーの上に
 *    元の重なり順を逆転して積む（裏折りなら最小レイヤーの下に積む）
 */
export const applyFoldStep = (
  boards: LayeredBoard[],
  step: FoldStep
): FoldStepResult | null => {
  const { foldLine, dragVertex, foldCount, viewFront } = step;

  if (boards.length === 0) return null;

  // 候補板を視点側（手前）から順に並べ、先頭foldCount枚を対象にする
  const candidates = boards
    .filter((board) => hasVertexAt(board.polygon, dragVertex))
    .sort((a, b) => (viewFront ? b.layer - a.layer : a.layer - b.layer));

  if (foldCount < 1 || foldCount > candidates.length) return null;

  const targets = candidates.slice(0, foldCount);
  const targetSet = new Set(targets);

  const axisDirection = new THREE.Vector3()
    .subVectors(foldLine.end, foldLine.start)
    .normalize();

  // 各対象板を分割し、動く片・固定片に振り分ける
  const splits: {
    target: LayeredBoard;
    movingPiece: Board;
    staticPiece: Board;
  }[] = [];

  for (const target of targets) {
    const separated = separateBoard(target.polygon, foldLine);
    if (!separated) return null;

    const selected = selectMovingBoard(separated, dragVertex, foldLine);
    if (!selected) return null;

    splits.push({
      target,
      movingPiece: selected.movingBoard,
      staticPiece: selected.staticBoard,
    });
  }

  const layers = boards.map((board) => board.layer);
  const maxLayer = Math.max(...layers);
  const minLayer = Math.min(...layers);

  const resultBoards: LayeredBoard[] = [];
  const movingBoards: LayeredBoard[] = [];
  const staticBoards: LayeredBoard[] = [];

  // 折り対象外の板はそのまま残す
  for (const board of boards) {
    if (!targetSet.has(board)) {
      resultBoards.push(board);
      staticBoards.push(board);
    }
  }

  // 動く片は重なり順を逆転して視点側の外側に積む
  // （例: 2枚重ねを両方表折りすると、元の上の紙の片が下、下の紙の片が上で着地する）
  const sortedSplits = [...splits].sort((a, b) => a.target.layer - b.target.layer);

  sortedSplits.forEach((split, index) => {
    const newLayer = viewFront
      ? maxLayer + 1 + (sortedSplits.length - 1 - index)
      : minLayer - 1 - index;

    const staticBoard: LayeredBoard = {
      polygon: split.staticPiece,
      layer: split.target.layer,
    };

    // 180度回転はXY平面上では鏡映になる。浮動小数の誤差でzが微小に
    // ずれるとリプレイ時に判定が揺れるため、z=0に揃える
    const mirroredPolygon = rotateBoard(
      split.movingPiece,
      foldLine.start,
      axisDirection,
      Math.PI
    ).map((vertex) => new THREE.Vector3(vertex.x, vertex.y, 0));

    resultBoards.push(staticBoard, { polygon: mirroredPolygon, layer: newLayer });
    staticBoards.push(staticBoard);
    movingBoards.push({ polygon: split.movingPiece, layer: split.target.layer });
  });

  return { boards: resultBoards, movingBoards, staticBoards };
};

/**
 * 板が指定位置（XY平面上）に頂点を持つか判定する
 */
const hasVertexAt = (polygon: Board, position: THREE.Vector3): boolean =>
  polygon.some(
    (vertex) =>
      Math.abs(vertex.x - position.x) < SNAP_MERGE_TOLERANCE &&
      Math.abs(vertex.y - position.y) < SNAP_MERGE_TOLERANCE
  );
