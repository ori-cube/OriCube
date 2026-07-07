import * as THREE from "three";
import { Board, BoardPiece, FoldLine, FoldStep, LayeredBoard } from "../../types";
import { separateBoard } from "../separateBoard";
import { selectMovingBoard } from "../selectMovingBoard";
import { rotateBoard } from "../rotateBoard";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";
import {
  findSharedSourceSegments,
  mapSourceBoundaryPointToFolded,
} from "../findSharedSourceSegments";

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
 * 4. 動く片が折り目でつながっている相手ごと動かない折り（紙が破れる折り）は
 *    不成立としてnullを返す
 * 5. 動く片は折り線周りに180度回転（XY平面上では鏡映）した座標になる
 * 6. 動く片のレイヤーは、表折りなら現在の最大レイヤーの上に
 *    元の重なり順を逆転して積む（裏折りなら最小レイヤーの下に積む）
 */
export const applyFoldStep = (
  boards: LayeredBoard[],
  step: FoldStep
): FoldStepResult | null => {
  const { foldLine, dragVertex, foldCount, viewFront } = step;

  if (boards.length === 0) return null;

  // 候補板を視点側（手前）から順に並べ、先頭foldCount枚を対象にする
  const candidates = findFoldCandidates(boards, dragVertex, viewFront);

  if (foldCount < 1 || foldCount > candidates.length) return null;

  const targets = candidates.slice(0, foldCount);
  const targetSet = new Set(targets);

  const axisDirection = new THREE.Vector3()
    .subVectors(foldLine.end, foldLine.start)
    .normalize();

  // 各対象板を分割し、動く片・固定片に振り分ける
  const splits: {
    target: LayeredBoard;
    movingPiece: BoardPiece;
    staticPiece: BoardPiece;
  }[] = [];

  for (const target of targets) {
    const separated = separateBoard(
      target.polygon,
      target.sourcePolygon,
      foldLine
    );
    if (!separated) return null;

    const selected = selectMovingBoard(separated, dragVertex, foldLine);
    if (!selected) return null;

    splits.push({
      target,
      movingPiece: selected.movingPiece,
      staticPiece: selected.staticPiece,
    });
  }

  // 紙が破れる折り（動く片が折り目でつながっている相手を置き去りにする折り）
  // は不成立
  const movingPieces = splits.map((split) => split.movingPiece);
  const nonMovingPieces: BoardPiece[] = [
    ...splits.map((split) => split.staticPiece),
    ...boards.filter((board) => !targetSet.has(board)),
  ];
  if (isTearingFold(movingPieces, nonMovingPieces, foldLine)) return null;

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
      ...split.staticPiece,
      layer: split.target.layer,
    };

    // 180度回転はXY平面上では鏡映になる。浮動小数の誤差でzが微小に
    // ずれるとリプレイ時に判定が揺れるため、z=0に揃える。
    // sourcePolygon（展開図空間）は折りで変換されないためそのまま引き継ぐ
    const mirroredPolygon = rotateBoard(
      split.movingPiece.polygon,
      foldLine.start,
      axisDirection,
      Math.PI
    ).map((vertex) => new THREE.Vector3(vertex.x, vertex.y, 0));

    resultBoards.push(staticBoard, {
      polygon: mirroredPolygon,
      sourcePolygon: split.movingPiece.sourcePolygon,
      layer: newLayer,
    });
    staticBoards.push(staticBoard);
    movingBoards.push({ ...split.movingPiece, layer: split.target.layer });
  });

  return { boards: resultBoards, movingBoards, staticBoards };
};

/**
 * 折りで紙が破れるかを判定する
 *
 * @param movingPieces - 各対象板の動く片（回転前の座標）
 * @param nonMovingPieces - 動かない片（対象板の固定片 + 折り対象外の板）
 * @param foldLine - 折り線（無限直線として扱う）
 * @returns 破れる場合はtrue
 *
 * @description
 * 動く片と動かない片が展開図上で境界線分（折り目）を共有する場合、
 * その線分は折り畳み空間で折り線上に載っていなければならない
 * （載っていればヒンジとして回転するだけなので破れない）。
 *
 * - 動く片同士は同一の回転を受けるため接続が保たれる → チェック不要
 * - 対象板の「動く片 vs 自分の固定片」の共有辺は今回のカット辺で
 *   折り線上にあるため、この一般則で自動的にパスする（特別扱い不要）
 * - 折り線上の点は180度回転で不動なので、回転前の座標でチェックしてよい
 */
const isTearingFold = (
  movingPieces: BoardPiece[],
  nonMovingPieces: BoardPiece[],
  foldLine: FoldLine
): boolean => {
  for (const movingPiece of movingPieces) {
    for (const nonMovingPiece of nonMovingPieces) {
      const sharedSegments = findSharedSourceSegments(
        movingPiece.sourcePolygon,
        nonMovingPiece.sourcePolygon
      );

      for (const segment of sharedSegments) {
        for (const sourceEndpoint of [segment.start, segment.end]) {
          const foldedPoint = mapSourceBoundaryPointToFolded(
            movingPiece,
            sourceEndpoint
          );
          // 写像できない場合は頂点対応が崩れている（起こり得ない）。
          // 破れの見逃しより折りの不成立に倒す
          if (!foldedPoint) return true;

          if (
            distanceToFoldLine(foldedPoint, foldLine) > SNAP_MERGE_TOLERANCE
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
};

/**
 * 折り畳み空間の点から折り線（無限直線）までの距離を計算する
 */
export const distanceToFoldLine = (
  point: THREE.Vector3,
  foldLine: FoldLine
): number => {
  const direction = new THREE.Vector3().subVectors(foldLine.end, foldLine.start);
  const toPoint = new THREE.Vector3().subVectors(point, foldLine.start);
  return (
    Math.abs(direction.x * toPoint.y - direction.y * toPoint.x) /
    direction.length()
  );
};

/**
 * 折りの候補板（指定位置に頂点を持つ板）を視点側から順に返す
 *
 * @param boards - 現在の板の一覧
 * @param dragVertex - ドラッグした頂点の元位置
 * @param viewFront - 表側（+Z側）から見ているか
 * @returns 視点に近い順（表ならlayer降順）に並べた候補板
 */
export const findFoldCandidates = (
  boards: LayeredBoard[],
  dragVertex: THREE.Vector3,
  viewFront: boolean
): LayeredBoard[] =>
  boards
    .filter((board) => hasVertexAt(board.polygon, dragVertex))
    .sort((a, b) => (viewFront ? b.layer - a.layer : a.layer - b.layer));

/**
 * 板が指定位置（XY平面上）に頂点を持つか判定する
 */
const hasVertexAt = (polygon: Board, position: THREE.Vector3): boolean =>
  polygon.some(
    (vertex) =>
      Math.abs(vertex.x - position.x) < SNAP_MERGE_TOLERANCE &&
      Math.abs(vertex.y - position.y) < SNAP_MERGE_TOLERANCE
  );
