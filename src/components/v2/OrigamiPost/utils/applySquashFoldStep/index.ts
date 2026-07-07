import * as THREE from "three";
import {
  Board,
  BoardPiece,
  FoldLine,
  LayeredBoard,
  SquashFoldStep,
} from "../../types";
import { separateBoard } from "../separateBoard";
import { selectMovingBoard } from "../selectMovingBoard";
import { rotateBoard } from "../rotateBoard";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";
import { calculateFoldLineSpan } from "../calculateFoldLineSpan";
import { findFoldCandidates, distanceToFoldLine } from "../applyFoldStep";
import {
  findSharedSourceSegments,
  mapSourceBoundaryPointToFolded,
} from "../findSharedSourceSegments";

/**
 * 開いて畳むで動く片の動き方
 *
 * - mirrorFoldLine: 折り線で鏡映される片（手前フラップのドラッグ頂点側）
 * - openRotate: 折り線で鏡映された後ヒンジで鏡映される片
 *   （奥フラップのドラッグ頂点側。ポケットが開く部分）
 * - mirrorHinge: ヒンジで鏡映される片（奥フラップの反対側）
 */
export type SquashMotion = "mirrorFoldLine" | "openRotate" | "mirrorHinge";

/**
 * 開いて畳むで動く片
 */
export interface SquashPiece {
  /** 動く片（回転前の座標） */
  piece: BoardPiece;
  /** 確定後の片（XY平面上、z=0） */
  finalPiece: BoardPiece;
  /** 元のレイヤー（アニメーション中のZオフセットに使用） */
  layer: number;
  /** 確定後のレイヤー */
  finalLayer: number;
  /** 動き方（アニメーションの頂点分類に使用） */
  motion: SquashMotion;
}

/**
 * 開いて畳む操作の適用結果
 */
export interface SquashFoldStepResult {
  /** 折り後の全ての板（リプレイの次の入力になる確定状態） */
  boards: LayeredBoard[];
  /** アニメーション中も動かない板（手前フラップの固定片 + 対象外の板） */
  staticBoards: LayeredBoard[];
  /** 動く3片（回転前の座標と確定後の座標の組） */
  movingPieces: SquashPiece[];
  /** ヒンジ（奥フラップと固定側の折り目）のスパン */
  hinge: FoldLine;
  /** スパインの折り線側の端点（折り線とヒンジが交わる点） */
  spineApex: THREE.Vector3;
}

/**
 * 現在の板群に開いて畳む操作を適用する純関数
 *
 * @param boards - 現在の板の一覧
 * @param step - 開いて畳む操作
 * @returns 適用結果。成立しない場合はnull
 *
 * @description
 * 開いて畳む（スクワッシュフォールド）のセマンティクス:
 * 1. dragVertexを持つ視点側2枚をフラップとする（手前=X、奥=Y）
 * 2. XとYがdragVertexを端点とする折り目（スパインV-A）でつながっており、
 *    スパインの反対側の端点Aが折り線上にあることを要求する
 * 3. Yと固定側の板の折り目（ヒンジ）が、Aを通る1本の直線h上に
 *    あることを要求する（基本ケースの条件）
 * 4. X・Yそれぞれを折り線で分割し、3つの動く片が別々の変換を受ける:
 *    - Xのドラッグ頂点側: 折り線で鏡映
 *    - Yの反対側: ヒンジhで鏡映（ヒンジ周りに180度回転）
 *    - Yのドラッグ頂点側: 折り線で鏡映した後ヒンジhで鏡映（開く部分）
 * 5. 最終状態の全ての片のペアについて、展開図上で共有する折り目が
 *    折り畳み空間でも一致すること（紙が破れないこと）を数値検証する
 * 6. 動く片はヒンジ側の片から順に視点側の外側へ積む
 */
export const applySquashFoldStep = (
  boards: LayeredBoard[],
  step: SquashFoldStep
): SquashFoldStepResult | null => {
  const { foldLine, dragVertex, viewFront } = step;

  const candidates = findFoldCandidates(boards, dragVertex, viewFront);
  if (candidates.length < 2) return null;

  const [frontFlap, backFlap] = candidates;

  const spineApex = detectSpineApex(frontFlap, backFlap, dragVertex, foldLine);
  if (!spineApex) return null;

  const otherBoards = boards.filter(
    (board) => board !== frontFlap && board !== backFlap
  );
  const hinge = detectHinge(backFlap, otherBoards, spineApex, foldLine);
  if (!hinge) return null;

  // フラップ2枚をそれぞれ折り線で分割する
  const frontSplit = splitByFoldLine(frontFlap, dragVertex, foldLine);
  const backSplit = splitByFoldLine(backFlap, dragVertex, foldLine);
  if (!frontSplit || !backSplit) return null;

  const foldAxis = lineDirection(foldLine);
  const hingeAxis = lineDirection(hinge);

  // 3つの動く片の確定後の座標を計算する
  const frontUpperFinal: BoardPiece = {
    polygon: mirrorAcrossLine(
      frontSplit.movingPiece.polygon,
      foldLine.start,
      foldAxis
    ),
    sourcePolygon: frontSplit.movingPiece.sourcePolygon,
  };
  const backLowerFinal: BoardPiece = {
    polygon: mirrorAcrossLine(
      backSplit.staticPiece.polygon,
      hinge.start,
      hingeAxis
    ),
    sourcePolygon: backSplit.staticPiece.sourcePolygon,
  };
  const backUpperFinal: BoardPiece = {
    polygon: mirrorAcrossLine(
      mirrorAcrossLine(backSplit.movingPiece.polygon, foldLine.start, foldAxis),
      hinge.start,
      hingeAxis
    ),
    sourcePolygon: backSplit.movingPiece.sourcePolygon,
  };

  // 動く片はヒンジ側の片から順に視点側の外側へ積む
  const layers = boards.map((board) => board.layer);
  const maxLayer = Math.max(...layers);
  const minLayer = Math.min(...layers);
  const outwardLayer = (offset: number): number =>
    viewFront ? maxLayer + offset : minLayer - offset;

  const movingPieces: SquashPiece[] = [
    {
      piece: backSplit.staticPiece,
      finalPiece: backLowerFinal,
      layer: backFlap.layer,
      finalLayer: outwardLayer(1),
      motion: "mirrorHinge",
    },
    {
      piece: backSplit.movingPiece,
      finalPiece: backUpperFinal,
      layer: backFlap.layer,
      finalLayer: outwardLayer(2),
      motion: "openRotate",
    },
    {
      piece: frontSplit.movingPiece,
      finalPiece: frontUpperFinal,
      layer: frontFlap.layer,
      finalLayer: outwardLayer(3),
      motion: "mirrorFoldLine",
    },
  ];

  const staticBoards: LayeredBoard[] = [
    ...otherBoards,
    { ...frontSplit.staticPiece, layer: frontFlap.layer },
  ];

  // 紙が破れる（折り目でつながった片同士が確定後に離れる）場合は不成立
  if (
    !isConnectivityPreserved(
      movingPieces.map((moving) => moving.finalPiece),
      staticBoards
    )
  ) {
    return null;
  }

  const resultBoards: LayeredBoard[] = [
    ...staticBoards,
    ...movingPieces.map((moving) => ({
      ...moving.finalPiece,
      layer: moving.finalLayer,
    })),
  ];

  return {
    boards: resultBoards,
    staticBoards,
    movingPieces,
    hinge,
    spineApex,
  };
};

/**
 * ドラッグ操作から開いて畳むステップを組み立てる
 *
 * @param props.boards - 現在の板の一覧
 * @param props.midpoint - 折り線が通る中点
 * @param props.direction - 折り線の方向ベクトル
 * @param props.dragVertex - ドラッグした頂点の元位置
 * @param props.viewFront - 表側（+Z側）から見ているか
 * @returns フラップ2枚を覆う折り線スパンを持つステップ。
 *          候補が2枚未満、または折り線がフラップを横切らない場合はnull
 */
export const buildSquashFoldStep = (props: {
  boards: LayeredBoard[];
  midpoint: THREE.Vector3;
  direction: THREE.Vector3;
  dragVertex: THREE.Vector3;
  viewFront: boolean;
}): SquashFoldStep | null => {
  const { boards, midpoint, direction, dragVertex, viewFront } = props;

  const candidates = findFoldCandidates(boards, dragVertex, viewFront);
  if (candidates.length < 2) return null;

  const span = calculateFoldLineSpan(midpoint, direction, [
    candidates[0].polygon,
    candidates[1].polygon,
  ]);
  if (!span) return null;

  return {
    kind: "squash",
    foldLine: span,
    dragVertex: new THREE.Vector3(dragVertex.x, dragVertex.y, 0),
    viewFront,
  };
};

/**
 * フラップ2枚のスパイン（共有折り目）を検出し、折り線側の端点Aを返す
 *
 * @description
 * 基本ケースの成立条件:
 * - フラップ同士の共有折り目がちょうど1本
 * - 折り畳み空間で一端がドラッグ頂点に一致し、他端Aが折り線上にある
 *   （Aが折り線上にないと平らに畳めない）
 * - ドラッグ頂点自体は折り線上にない
 */
const detectSpineApex = (
  frontFlap: BoardPiece,
  backFlap: BoardPiece,
  dragVertex: THREE.Vector3,
  foldLine: FoldLine
): THREE.Vector3 | null => {
  const sharedSegments = findSharedSourceSegments(
    frontFlap.sourcePolygon,
    backFlap.sourcePolygon
  );
  if (sharedSegments.length !== 1) return null;

  const foldedStart = mapSourceBoundaryPointToFolded(
    frontFlap,
    sharedSegments[0].start
  );
  const foldedEnd = mapSourceBoundaryPointToFolded(
    frontFlap,
    sharedSegments[0].end
  );
  if (!foldedStart || !foldedEnd) return null;

  const isAtDragVertex = (point: THREE.Vector3): boolean =>
    Math.abs(point.x - dragVertex.x) < SNAP_MERGE_TOLERANCE &&
    Math.abs(point.y - dragVertex.y) < SNAP_MERGE_TOLERANCE;

  let apex: THREE.Vector3;
  if (isAtDragVertex(foldedStart)) apex = foldedEnd;
  else if (isAtDragVertex(foldedEnd)) apex = foldedStart;
  else return null;

  if (distanceToFoldLine(dragVertex, foldLine) <= SNAP_MERGE_TOLERANCE) {
    return null;
  }
  if (distanceToFoldLine(apex, foldLine) > SNAP_MERGE_TOLERANCE) return null;

  return new THREE.Vector3(apex.x, apex.y, 0);
};

/**
 * 奥フラップと固定側の板が共有する折り目（ヒンジ）を検出する
 *
 * @description
 * 基本ケースでは、奥フラップの固定側との折り目はすべてスパインの端点Aを
 * 通る1本の直線上になければならない。折り線と同一の直線は開く動きに
 * ならない（通常の折りで表現できる）ため不成立とする。
 * 戻り値は回転軸と可視化に使うスパン（Aと折り目の端点を含む区間）
 */
const detectHinge = (
  backFlap: BoardPiece,
  otherBoards: LayeredBoard[],
  spineApex: THREE.Vector3,
  foldLine: FoldLine
): FoldLine | null => {
  const endpoints: THREE.Vector3[] = [];

  for (const board of otherBoards) {
    const sharedSegments = findSharedSourceSegments(
      backFlap.sourcePolygon,
      board.sourcePolygon
    );
    for (const segment of sharedSegments) {
      for (const sourceEndpoint of [segment.start, segment.end]) {
        const folded = mapSourceBoundaryPointToFolded(backFlap, sourceEndpoint);
        // 写像できない場合は頂点対応が崩れている（起こり得ない）ため不成立
        if (!folded) return null;
        endpoints.push(folded);
      }
    }
  }

  // 奥フラップが固定側とつながっていなければ、開いても畳む先がない
  if (endpoints.length === 0) return null;

  // Aから最も遠い端点でヒンジの方向を決める
  let farthest: THREE.Vector3 | null = null;
  let maxDistance = 0;
  for (const endpoint of endpoints) {
    const distance = endpoint.distanceTo(spineApex);
    if (distance > maxDistance) {
      maxDistance = distance;
      farthest = endpoint;
    }
  }
  if (!farthest || maxDistance < SNAP_MERGE_TOLERANCE) return null;

  const hingeDirection = new THREE.Vector3()
    .subVectors(farthest, spineApex)
    .normalize();

  // すべての折り目の端点がAを通る1本の直線上に載っていること
  let minParameter = 0;
  let maxParameter = 0;
  for (const endpoint of endpoints) {
    const toEndpoint = new THREE.Vector3().subVectors(endpoint, spineApex);
    const distanceToHingeLine = Math.abs(
      hingeDirection.x * toEndpoint.y - hingeDirection.y * toEndpoint.x
    );
    if (distanceToHingeLine > SNAP_MERGE_TOLERANCE) return null;

    const parameter = toEndpoint.dot(hingeDirection);
    minParameter = Math.min(minParameter, parameter);
    maxParameter = Math.max(maxParameter, parameter);
  }

  const pointAtParameter = (parameter: number): THREE.Vector3 =>
    new THREE.Vector3(
      spineApex.x + hingeDirection.x * parameter,
      spineApex.y + hingeDirection.y * parameter,
      0
    );
  const hinge: FoldLine = {
    start: pointAtParameter(minParameter),
    end: pointAtParameter(maxParameter),
  };

  // ヒンジも折り線もAを通るため、平行なら同一直線（退化）
  const foldDirection = lineDirection(foldLine);
  if (
    Math.abs(
      hingeDirection.x * foldDirection.y - hingeDirection.y * foldDirection.x
    ) < 1e-6
  ) {
    return null;
  }

  return hinge;
};

/**
 * 板を折り線で分割し、ドラッグ頂点側の片と反対側の片に振り分ける
 */
const splitByFoldLine = (
  board: LayeredBoard,
  dragVertex: THREE.Vector3,
  foldLine: FoldLine
): { movingPiece: BoardPiece; staticPiece: BoardPiece } | null => {
  const separated = separateBoard(board.polygon, board.sourcePolygon, foldLine);
  if (!separated) return null;
  return selectMovingBoard(separated, dragVertex, foldLine);
};

/**
 * 最終状態の全ての片のペアについて、紙の接続が保たれるかを検証する
 *
 * @param movingFinalPieces - 動く片の確定後の座標
 * @param staticPieces - 動かない板（座標は現在のまま）
 * @returns 接続が保たれる場合はtrue
 *
 * @description
 * 2つの片が展開図上で共有する折り目の各端点を、それぞれの片の
 * 頂点対応で折り畳み空間へ写像し、両者が一致することを要求する。
 * これはapplyFoldStepの破れ判定を「片ごとに異なる変換」へ一般化した
 * もので、スパイン・カット辺・ヒンジ・想定外の接続をまとめて検証する。
 * 動かない板同士は座標が変わらないため検証不要。
 */
const isConnectivityPreserved = (
  movingFinalPieces: BoardPiece[],
  staticPieces: BoardPiece[]
): boolean => {
  for (let i = 0; i < movingFinalPieces.length; i++) {
    const others = [...movingFinalPieces.slice(i + 1), ...staticPieces];
    for (const other of others) {
      if (!staysAttached(movingFinalPieces[i], other)) return false;
    }
  }
  return true;
};

/**
 * 2つの片が展開図上で共有する折り目が、折り畳み空間でも一致するか
 */
const staysAttached = (pieceA: BoardPiece, pieceB: BoardPiece): boolean => {
  const sharedSegments = findSharedSourceSegments(
    pieceA.sourcePolygon,
    pieceB.sourcePolygon
  );

  for (const segment of sharedSegments) {
    for (const sourceEndpoint of [segment.start, segment.end]) {
      const foldedA = mapSourceBoundaryPointToFolded(pieceA, sourceEndpoint);
      const foldedB = mapSourceBoundaryPointToFolded(pieceB, sourceEndpoint);
      if (!foldedA || !foldedB) return false;
      if (foldedA.distanceTo(foldedB) > SNAP_MERGE_TOLERANCE) return false;
    }
  }

  return true;
};

/**
 * 板を直線周りに180度回転（XY平面上では鏡映）し、z=0に揃える
 *
 * @description
 * 180度回転では軸方向の符号は結果に影響しない。浮動小数の誤差でzが
 * 微小にずれるとリプレイ時の判定が揺れるため、z=0に揃える
 */
const mirrorAcrossLine = (
  polygon: Board,
  linePoint: THREE.Vector3,
  axisDirection: THREE.Vector3
): Board =>
  rotateBoard(polygon, linePoint, axisDirection, Math.PI).map(
    (vertex) => new THREE.Vector3(vertex.x, vertex.y, 0)
  );

/**
 * 折り線の正規化済み方向ベクトルを返す
 */
const lineDirection = (line: FoldLine): THREE.Vector3 =>
  new THREE.Vector3().subVectors(line.end, line.start).normalize();
