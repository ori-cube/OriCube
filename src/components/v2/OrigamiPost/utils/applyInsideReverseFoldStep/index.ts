import * as THREE from "three";
import {
  BoardPiece,
  InsideReverseFoldStep,
  LayeredBoard,
} from "../../types";
import { separateBoard } from "../separateBoard";
import { selectMovingBoard } from "../selectMovingBoard";
import { mirrorBoardAcrossLine } from "../rotateBoard";
import { isPointLeftOfLine } from "../isPointLeftOfLine";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";
import { calculateFoldLineSpan } from "../calculateFoldLineSpan";
import { findFoldCandidates, distanceToFoldLine } from "../applyFoldStep";
import {
  findSharedSourceSegments,
  isConnectivityPreserved,
  mapSourceBoundaryPointToFolded,
} from "../findSharedSourceSegments";

/**
 * 中割り折り操作の適用結果
 */
export interface InsideReverseFoldStepResult {
  /** 折り後の全ての板（リプレイの次の入力になる確定状態） */
  boards: LayeredBoard[];
  /** アニメーション中も動かない板（動かす点の根元片 + 対象外の板） */
  staticBoards: LayeredBoard[];
  /** 動く先端片（回転前の座標・元のレイヤー。折りアニメーションの入力用） */
  movingBoards: LayeredBoard[];
}

/**
 * 現在の板群に中割り折り操作を適用する純関数
 *
 * @param boards - 現在の板の一覧
 * @param step - 中割り折り操作
 * @returns 適用結果。成立しない場合はnull
 *
 * @description
 * 中割り折り（インサイドリバースフォールド）のセマンティクス:
 * 1. dragVertexを持つ候補板を展開図連結で分け、視点側の先頭板を含む
 *    連結成分を「動かす点」とする（鶴の先端では首の点と尾の点が同一位置に
 *    重なっており、レイヤー枚数では分けられないため連結性で特定する）
 * 2. 折り線が点のスパイン（dragVertexを端点とする成分内の共有折り目）を
 *    横切ることを要求する。中割り折りの本質は折り筋の反転であり、
 *    スパインを横切らない折りは中割り折りではない
 * 3. 点の各板を折り線で分割し、dragVertex側の先端片をすべて折り線で
 *    鏡映する（全ての先端片が同一の変換を受ける）
 * 4. 最終状態で全ての片のペアの共有折り目が折り畳み空間でも一致すること
 *    （紙が破れないこと）を数値検証する
 * 5. 先端片は通常の折りと違い外側ではなく、点の前半分と後半分の間
 *    （折り筋が反転して差し込まれる位置）へ、半分ごとに重なり順を
 *    逆転して積む。挿入位置は整数レイヤーの隙間の小数レイヤーで表す
 *
 * 既知の制限: 点を前後半分に分ける位置はレイヤー順の中央で近似しており、
 * 挿入後の厳密な貫通判定は行わない（エンジン全体の既知の制限と同じ）
 */
export const applyInsideReverseFoldStep = (
  boards: LayeredBoard[],
  step: InsideReverseFoldStep
): InsideReverseFoldStepResult | null => {
  const { foldLine, dragVertex, viewFront } = step;

  if (distanceToFoldLine(dragVertex, foldLine) <= SNAP_MERGE_TOLERANCE) {
    return null;
  }

  const component = findMovingComponent(boards, dragVertex, viewFront);
  if (!component) return null;

  // 折り線がスパインを横切らない折りは中割り折りではない
  if (!crossesSpineCrease(component, dragVertex, foldLine)) return null;

  // 点の各板を折り線で分割する（dragVertex側が動く先端片）
  const splits: {
    target: LayeredBoard;
    movingPiece: BoardPiece;
    staticPiece: BoardPiece | null;
  }[] = [];
  for (const target of component) {
    const split = splitComponentBoard(target, dragVertex, foldLine);
    if (!split) return null;
    splits.push({ target, ...split });
  }

  // どの板も分割されない操作は点全体をめくるだけで、中割り折りではない
  if (!splits.some((split) => split.staticPiece !== null)) return null;

  const componentSet = new Set(component);
  const otherBoards = boards.filter((board) => !componentSet.has(board));

  // 先端片はすべて折り線で鏡映される
  const movingFinalPieces: BoardPiece[] = splits.map((split) => ({
    polygon: mirrorBoardAcrossLine(split.movingPiece.polygon, foldLine),
    sourcePolygon: split.movingPiece.sourcePolygon,
  }));

  const basePieces: LayeredBoard[] = splits.flatMap((split) =>
    split.staticPiece
      ? [{ ...split.staticPiece, layer: split.target.layer }]
      : []
  );

  // 紙が破れる（折り目でつながった片同士が確定後に離れる）場合は不成立
  if (
    !isConnectivityPreserved(movingFinalPieces, [
      ...basePieces,
      ...otherBoards,
    ])
  ) {
    return null;
  }

  // 先端片を点の前半分と後半分の間へ、半分ごとに重なり順を逆転して差し込む。
  // 例: 点のレイヤーが[前半 a,b | 後半 c,d]なら先端片は前からb,a,d,cの順で
  // aとcの間の小数レイヤーに置く（前半の先端は根元の裏へ、後半の先端は
  // 根元の手前へ巻き込まれるため、半分ごとに順序が逆転する）
  const halfIndex = Math.ceil(splits.length / 2);
  const frontHalf = splits.slice(0, halfIndex);
  const backHalf = splits.slice(halfIndex);
  const tipsFrontToBack = [
    ...frontHalf.slice().reverse(),
    ...backHalf.slice().reverse(),
  ];
  const gapTopLayer = splits[halfIndex - 1].target.layer;

  const staticBoards: LayeredBoard[] = [...otherBoards, ...basePieces];
  const movingBoards: LayeredBoard[] = [];
  const insertedBoards: LayeredBoard[] = [];

  tipsFrontToBack.forEach((split, index) => {
    const splitIndex = splits.indexOf(split);
    const insertedLayer =
      gapTopLayer - (index + 1) / (tipsFrontToBack.length + 1);
    insertedBoards.push({
      ...movingFinalPieces[splitIndex],
      layer: insertedLayer,
    });
    movingBoards.push({ ...split.movingPiece, layer: split.target.layer });
  });

  return {
    boards: [...staticBoards, ...insertedBoards],
    staticBoards,
    movingBoards,
  };
};

/**
 * ドラッグ操作から中割り折りステップを組み立てる
 *
 * @param props.boards - 現在の板の一覧
 * @param props.midpoint - 折り線が通る中点
 * @param props.direction - 折り線の方向ベクトル
 * @param props.dragVertex - ドラッグした頂点の元位置
 * @param props.viewFront - 表側（+Z側）から見ているか
 * @returns 動かす点を覆う折り線スパンを持つステップ。
 *          点が特定できない、または折り線が点を横切らない場合はnull
 */
export const buildInsideReverseFoldStep = (props: {
  boards: LayeredBoard[];
  midpoint: THREE.Vector3;
  direction: THREE.Vector3;
  dragVertex: THREE.Vector3;
  viewFront: boolean;
}): InsideReverseFoldStep | null => {
  const { boards, midpoint, direction, dragVertex, viewFront } = props;

  const component = findMovingComponent(boards, dragVertex, viewFront);
  if (!component) return null;

  const span = calculateFoldLineSpan(
    midpoint,
    direction,
    component.map((board) => board.polygon)
  );
  if (!span) return null;

  return {
    kind: "insideReverse",
    foldLine: span,
    dragVertex: new THREE.Vector3(dragVertex.x, dragVertex.y, 0),
    viewFront,
  };
};

/**
 * 動かす点（視点側の先頭候補板を含む展開図連結成分）を特定する
 *
 * @returns 点の板を視点側から順に並べた配列。候補が2枚未満、または
 *          成分が1枚だけ（折り重なった点ではない）の場合はnull
 */
const findMovingComponent = (
  boards: LayeredBoard[],
  dragVertex: THREE.Vector3,
  viewFront: boolean
): LayeredBoard[] | null => {
  const candidates = findFoldCandidates(boards, dragVertex, viewFront);
  if (candidates.length < 2) return null;

  // 候補板同士の共有折り目でUnion-Findし、連結成分に分ける
  const parent = candidates.map((_, index) => index);
  const findRoot = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    parent[index] = root;
    return root;
  };
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const shared = findSharedSourceSegments(
        candidates[i].sourcePolygon,
        candidates[j].sourcePolygon
      );
      if (shared.length > 0) parent[findRoot(i)] = findRoot(j);
    }
  }

  const movingRoot = findRoot(0);
  const component = candidates.filter(
    (_, index) => findRoot(index) === movingRoot
  );

  // 1枚だけの成分は折り重なった点ではない（通常の折りで表現できる）
  if (component.length < 2) return null;

  return component;
};

/**
 * 折り線が点のスパイン（dragVertexを端点とする成分内の共有折り目）を
 * 横切るかを判定する
 *
 * @description
 * 中割り折りは点の折り筋（スパイン）を山谷反転させて差し込む操作なので、
 * 折り線は反転する折り筋を横切っていなければならない。成分内の板同士の
 * 共有折り目のうち、折り畳み空間でdragVertexを端点とするものについて、
 * 両端点が折り線の反対側にあれば横切っている
 */
const crossesSpineCrease = (
  component: LayeredBoard[],
  dragVertex: THREE.Vector3,
  foldLine: { start: THREE.Vector3; end: THREE.Vector3 }
): boolean => {
  const isAtDragVertex = (point: THREE.Vector3): boolean =>
    Math.abs(point.x - dragVertex.x) < SNAP_MERGE_TOLERANCE &&
    Math.abs(point.y - dragVertex.y) < SNAP_MERGE_TOLERANCE;

  for (let i = 0; i < component.length; i++) {
    for (let j = i + 1; j < component.length; j++) {
      const sharedSegments = findSharedSourceSegments(
        component[i].sourcePolygon,
        component[j].sourcePolygon
      );
      for (const segment of sharedSegments) {
        const foldedStart = mapSourceBoundaryPointToFolded(
          component[i],
          segment.start
        );
        const foldedEnd = mapSourceBoundaryPointToFolded(
          component[i],
          segment.end
        );
        if (!foldedStart || !foldedEnd) continue;
        if (!isAtDragVertex(foldedStart) && !isAtDragVertex(foldedEnd)) {
          continue;
        }

        const startSide = isPointLeftOfLine(
          foldedStart,
          foldLine.start,
          foldLine.end
        );
        const endSide = isPointLeftOfLine(
          foldedEnd,
          foldLine.start,
          foldLine.end
        );
        if (startSide !== null && endSide !== null && startSide !== endSide) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * 点の板を折り線で分割し、dragVertex側の先端片と根元片に振り分ける
 *
 * @returns 分割できない場合はnull。板全体がdragVertex側にある場合は
 *          分割せず丸ごと先端片とし、staticPieceはnullになる
 */
const splitComponentBoard = (
  target: LayeredBoard,
  dragVertex: THREE.Vector3,
  foldLine: { start: THREE.Vector3; end: THREE.Vector3 }
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
