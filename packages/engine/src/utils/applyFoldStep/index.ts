import * as THREE from "three";
import { Board, BoardPiece, FoldLine, FoldStep, LayeredBoard } from "../../types";
import { separateBoard } from "../separateBoard";
import { selectMovingBoard } from "../selectMovingBoard";
import { mirrorBoardAcrossLine } from "../rotateBoard";
import { isPointLeftOfLine } from "../isPointLeftOfLine";
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
 * 2. 対象板それぞれを折り線で分割する。折り線を跨がない（板全体が
 *    ドラッグ頂点側にある）板は分割せず丸ごと動く片にする（既存の折り目に
 *    沿って半分に畳む・めくる折り）。分割できなければ折り全体を不成立と
 *    してnullを返す。対象外の板は折り線が幾何的に横切っていても
 *    動かさない（対象の紙だけをつまんで折るため）
 * 3. 各対象板のdragVertexと同じ側の片が「動く片」になる
 * 4. 動く片が折り目でつながっている相手ごと動かない折り（紙が破れる折り）は
 *    不成立としてnullを返す
 * 5. どの板も分割されない折りは、動く片が動かない板と折り目（折り線上の
 *    ヒンジ）でつながっている場合だけ成立する（新しい折り目もヒンジもない
 *    操作はモデル全体が回転するだけで、折りではない）
 * 6. 動く片は折り線周りに180度回転（XY平面上では鏡映）した座標になる
 * 7. 動く片のレイヤーは、表折りなら現在の最大レイヤーの上に
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

  // 各対象板を分割し、動く片・固定片に振り分ける
  const splits: {
    target: LayeredBoard;
    movingPiece: BoardPiece;
    staticPiece: BoardPiece | null;
  }[] = [];

  for (const target of targets) {
    const split = splitTargetBoard(target, dragVertex, foldLine);
    if (!split) return null;
    splits.push({ target, ...split });
  }

  // 紙が破れる折り（動く片が折り目でつながっている相手を置き去りにする折り）
  // は不成立
  const movingPieces = splits.map((split) => split.movingPiece);
  const nonMovingPieces: BoardPiece[] = [
    ...splits.flatMap((split) =>
      split.staticPiece ? [split.staticPiece] : []
    ),
    ...boards.filter((board) => !targetSet.has(board)),
  ];
  if (isTearingFold(movingPieces, nonMovingPieces, foldLine)) return null;

  // どの板も分割されない折りは、動く片が動かない板と折り目でつながっている
  // 場合だけ成立する（つながっていれば折り目は折り線上にあることを
  // isTearingFoldが検証済み。新しい折り目もヒンジもない操作はモデル全体が
  // 回転するだけで、折りではない）
  const createsCrease = splits.some((split) => split.staticPiece !== null);
  if (!createsCrease && !isHingedToNonMoving(movingPieces, nonMovingPieces)) {
    return null;
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

    // 丸ごと動く板（分割されない板）には固定片がない
    if (split.staticPiece) {
      const staticBoard: LayeredBoard = {
        ...split.staticPiece,
        layer: split.target.layer,
      };
      resultBoards.push(staticBoard);
      staticBoards.push(staticBoard);
    }

    // sourcePolygon（展開図空間）は折りで変換されないためそのまま引き継ぐ
    resultBoards.push({
      polygon: mirrorBoardAcrossLine(split.movingPiece.polygon, foldLine),
      sourcePolygon: split.movingPiece.sourcePolygon,
      layer: newLayer,
    });
    movingBoards.push({ ...split.movingPiece, layer: split.target.layer });
  });

  return { boards: resultBoards, movingBoards, staticBoards };
};

/**
 * 対象板を折り線で動く片と固定片に分ける
 *
 * @returns 分割できない場合はnull。板全体がドラッグ頂点側にある場合は
 *          分割せず丸ごと動く片とし、staticPieceはnullになる
 *
 * @description
 * - 折り線が板を横切る場合は分割する（新しい折り目を作る折り）
 * - 板が折り線を跨がない場合は、既存の折り目に沿って板を丸ごと回す折り
 *   （半分に畳む・めくり）として板全体を動く片にする。候補板はドラッグ
 *   頂点（折り線上にない点）を持つため、折り線の反対側に全体がある
 *   ことはない
 */
const splitTargetBoard = (
  target: LayeredBoard,
  dragVertex: THREE.Vector3,
  foldLine: FoldLine
): { movingPiece: BoardPiece; staticPiece: BoardPiece | null } | null => {
  const dragVertexSide = isPointLeftOfLine(
    dragVertex,
    foldLine.start,
    foldLine.end
  );
  if (dragVertexSide === null) return null;

  const crossesFoldLine = target.polygon.some(
    (vertex) =>
      isPointLeftOfLine(vertex, foldLine.start, foldLine.end) ===
      !dragVertexSide
  );
  if (!crossesFoldLine) {
    return {
      movingPiece: {
        polygon: target.polygon,
        sourcePolygon: target.sourcePolygon,
      },
      staticPiece: null,
    };
  }

  const separated = separateBoard(
    target.polygon,
    target.sourcePolygon,
    foldLine
  );
  if (!separated) return null;
  return selectMovingBoard(separated, dragVertex, foldLine);
};

/**
 * 動く片のいずれかが、動かない板と折り目（共有境界線分）でつながっているか
 */
const isHingedToNonMoving = (
  movingPieces: BoardPiece[],
  nonMovingPieces: BoardPiece[]
): boolean =>
  movingPieces.some((movingPiece) =>
    nonMovingPieces.some(
      (nonMovingPiece) =>
        findSharedSourceSegments(
          movingPiece.sourcePolygon,
          nonMovingPiece.sourcePolygon
        ).length > 0
    )
  );

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
