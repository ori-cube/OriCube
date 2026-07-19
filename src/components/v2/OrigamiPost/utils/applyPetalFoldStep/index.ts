import * as THREE from "three";
import {
  BoardPiece,
  FoldLine,
  LayeredBoard,
  PetalFoldStep,
} from "../../types";
import { separateBoard } from "../separateBoard";
import { selectMovingBoard } from "../selectMovingBoard";
import { mirrorBoardAcrossLine } from "../rotateBoard";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";
import { findFoldCandidates, distanceToFoldLine } from "../applyFoldStep";
import {
  findSharedSourceSegments,
  isConnectivityPreserved,
  mapSourceBoundaryPointToFolded,
} from "../findSharedSourceSegments";

/**
 * 花弁折りで動く片の動き方
 *
 * - mirrorFoldLine: 折り線で鏡映される片（フラップの中央片。先端の持ち上げ）
 * - mirrorKite: かぶせ折り線で鏡映される片（相方の耳片。内側への畳み込み）
 * - kiteThenFoldLine: かぶせ折り線で鏡映された後折り線で鏡映される片
 *   （フラップのサイド片）
 */
export type PetalMotion = "mirrorFoldLine" | "mirrorKite" | "kiteThenFoldLine";

/**
 * 花弁折りで動く片
 */
export interface PetalPiece {
  /** 動く片（回転前の座標） */
  piece: BoardPiece;
  /** 確定後の片（XY平面上、z=0） */
  finalPiece: BoardPiece;
  /** 元のレイヤー（アニメーション中のZオフセットに使用） */
  layer: number;
  /** 確定後のレイヤー */
  finalLayer: number;
  /** 確定位置まで同一角度θで順に適用する回転軸（1〜2本） */
  axes: FoldLine[];
  /** 動き方（アニメーションの頂点分類に使用） */
  motion: PetalMotion;
  /** 属する側（kiteLines・tuckCreasesのインデックスに対応） */
  sideIndex: 0 | 1;
}

/**
 * 花弁折り操作の適用結果
 */
export interface PetalFoldStepResult {
  /** 折り後の全ての板（リプレイの次の入力になる確定状態） */
  boards: LayeredBoard[];
  /** アニメーション中も動かない板（フラップの固定片 + 対象外の板） */
  staticBoards: LayeredBoard[];
  /** 動く6片（回転前の座標と確定後の座標の組） */
  movingPieces: PetalPiece[];
  /** 正準化された折り線（かぶせ折り線との交点間のスパン） */
  foldLine: FoldLine;
  /** 左右のかぶせ折り線（ドラッグ頂点→折り目交点のスパン） */
  kiteLines: [FoldLine, FoldLine];
  /** 左右の畳み込み折り目（折り目交点→corner。サイド片と耳片の共有辺） */
  tuckCreases: [FoldLine, FoldLine];
  /** スパイン（ドラッグ頂点→スパイン端点のスパン） */
  spine: FoldLine;
}

/**
 * 花弁折りの対象構造（片側分）
 */
interface PetalSide {
  /** 前面のフラップ */
  flap: LayeredBoard;
  /** フラップと折り目でつながる裏の相方 */
  partner: LayeredBoard;
  /** 相方との折り目の、スパイン端点と反対側の端点 */
  corner: THREE.Vector3;
}

/**
 * ジェスチャに依存しない花弁折りの対象構造
 */
interface PetalStructure {
  /** 左右の対象（sides[0]が視点側の最前面フラップ） */
  sides: [PetalSide, PetalSide];
  /** スパインのドラッグ頂点と反対側の端点 */
  spineApex: THREE.Vector3;
  /** 正準化された折り線がスパインと交わる点 */
  foldCenter: THREE.Vector3;
  /** 正準化された折り線（かぶせ折り線との交点間のスパン） */
  foldLine: FoldLine;
  /** 左右のかぶせ折り線との交点（sidesと同順） */
  creaseIntersections: [THREE.Vector3, THREE.Vector3];
}

/**
 * 現在の板群に花弁折り操作を適用する純関数
 *
 * @param boards - 現在の板の一覧
 * @param step - 花弁折り操作
 * @returns 適用結果。成立しない場合はnull
 *
 * @description
 * 花弁折り（ペタルフォールド）のセマンティクス:
 * 1. dragVertexを持つ視点側2枚をフラップとし、スパイン（V-C）で
 *    つながっていることを要求する
 * 2. 各フラップがちょうど1枚の相方と折り目（C-corner）でつながって
 *    いることを要求する（基本ケースの条件）
 * 3. 折り線hは構造から正準化する: スパイン上でVから距離|V-corner|の
 *    点Aを通る垂線（かぶせ折りが平らに畳める位置は一意に決まる）
 * 4. 左右それぞれ、フラップをかぶせ折り線k（V→hと折り目の交点P）と
 *    hで3片に、相方をkで2片に分割し、動く片が別々の変換を受ける:
 *    - フラップの中央片（A-P-V）: hで鏡映（先端の持ち上げ）
 *    - フラップのサイド片（P-corner-V）: kで鏡映した後hで鏡映
 *    - 相方の耳片（P-corner-V）: kで鏡映（内側への畳み込み）
 * 5. 最終状態の全ての片のペアについて、展開図上で共有する折り目が
 *    折り畳み空間でも一致すること（紙が破れないこと）を数値検証する。
 *    かぶせ折りの成立条件（cornerの鏡映がh上に載る）もここで検証される
 * 6. 動く片は耳→サイド→中央の順に視点側の外側へ積む
 */
export const applyPetalFoldStep = (
  boards: LayeredBoard[],
  step: PetalFoldStep
): PetalFoldStepResult | null => {
  const { foldLine, dragVertex, viewFront } = step;

  const structure = detectPetalStructure(boards, dragVertex, viewFront);
  if (!structure) return null;

  // 保存された折り線が正準化された折り線と一致することを検証する
  // （リプレイの決定性は正準化された構造側の座標で担保する）
  const canonicalPoints = [
    structure.foldCenter,
    ...structure.creaseIntersections,
  ];
  if (
    canonicalPoints.some(
      (point) => distanceToFoldLine(point, foldLine) > SNAP_MERGE_TOLERANCE
    )
  ) {
    return null;
  }

  const targetSet = new Set(
    structure.sides.flatMap((side) => [side.flap, side.partner])
  );
  const otherBoards = boards.filter((board) => !targetSet.has(board));

  const layers = boards.map((board) => board.layer);
  const maxLayer = Math.max(...layers);
  const minLayer = Math.min(...layers);
  const outwardLayer = (offset: number): number =>
    viewFront ? maxLayer + offset : minLayer - offset;

  const movingPieces: PetalPiece[] = [];
  const staticBoards: LayeredBoard[] = [...otherBoards];

  // sides[1]（奥側）から積むと、sides[0]（最前面）の片が外側になる
  const sideIndices: (0 | 1)[] = [1, 0];
  for (const sideIndex of sideIndices) {
    const side = structure.sides[sideIndex];
    const kiteLine: FoldLine = {
      start: new THREE.Vector3(dragVertex.x, dragVertex.y, 0),
      end: structure.creaseIntersections[sideIndex],
    };

    // フラップをかぶせ折り線でサイド片と中央側に分割する
    const flapSplit = splitPiece(side.flap, side.corner, kiteLine);
    if (!flapSplit) return null;
    const { movingPiece: sidePiece, staticPiece: flapRest } = flapSplit;

    // 中央側を折り線で中央片（ドラッグ頂点側）と固定片に分割する
    const restSplit = splitPiece(flapRest, dragVertex, structure.foldLine);
    if (!restSplit) return null;
    const { movingPiece: centralPiece, staticPiece: upperPiece } = restSplit;

    // 相方をかぶせ折り線で耳片と固定片に分割する
    const partnerSplit = splitPiece(side.partner, side.corner, kiteLine);
    if (!partnerSplit) return null;
    const { movingPiece: earPiece, staticPiece: bodyPiece } = partnerSplit;

    const centralFinal: BoardPiece = {
      polygon: mirrorBoardAcrossLine(centralPiece.polygon, structure.foldLine),
      sourcePolygon: centralPiece.sourcePolygon,
    };
    const sideFinal: BoardPiece = {
      polygon: mirrorBoardAcrossLine(
        mirrorBoardAcrossLine(sidePiece.polygon, kiteLine),
        structure.foldLine
      ),
      sourcePolygon: sidePiece.sourcePolygon,
    };
    const earFinal: BoardPiece = {
      polygon: mirrorBoardAcrossLine(earPiece.polygon, kiteLine),
      sourcePolygon: earPiece.sourcePolygon,
    };

    // 耳 → サイド → 中央の順に外側へ。左右では奥側（sides[1]）が内側
    const stackOffset = sideIndex === 0 ? 2 : 1;
    movingPieces.push(
      {
        piece: earPiece,
        finalPiece: earFinal,
        layer: side.partner.layer,
        finalLayer: outwardLayer(stackOffset),
        axes: [kiteLine],
        motion: "mirrorKite",
        sideIndex,
      },
      {
        piece: sidePiece,
        finalPiece: sideFinal,
        layer: side.flap.layer,
        finalLayer: outwardLayer(2 + stackOffset),
        axes: [kiteLine, structure.foldLine],
        motion: "kiteThenFoldLine",
        sideIndex,
      },
      {
        piece: centralPiece,
        finalPiece: centralFinal,
        layer: side.flap.layer,
        finalLayer: outwardLayer(4 + stackOffset),
        axes: [structure.foldLine],
        motion: "mirrorFoldLine",
        sideIndex,
      }
    );
    staticBoards.push(
      { ...upperPiece, layer: side.flap.layer },
      { ...bodyPiece, layer: side.partner.layer }
    );
  }

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
    foldLine: structure.foldLine,
    kiteLines: [
      {
        start: new THREE.Vector3(dragVertex.x, dragVertex.y, 0),
        end: structure.creaseIntersections[0],
      },
      {
        start: new THREE.Vector3(dragVertex.x, dragVertex.y, 0),
        end: structure.creaseIntersections[1],
      },
    ],
    tuckCreases: [
      {
        start: structure.creaseIntersections[0],
        end: structure.sides[0].corner,
      },
      {
        start: structure.creaseIntersections[1],
        end: structure.sides[1].corner,
      },
    ],
    spine: {
      start: new THREE.Vector3(dragVertex.x, dragVertex.y, 0),
      end: structure.spineApex,
    },
  };
};

/**
 * ドラッグ操作から花弁折りステップを組み立てる
 *
 * @param props.boards - 現在の板の一覧
 * @param props.midpoint - ドラッグから計算した折り線が通る中点
 * @param props.direction - ドラッグから計算した折り線の方向ベクトル
 * @param props.dragVertex - ドラッグした頂点の元位置
 * @param props.viewFront - 表側（+Z側）から見ているか
 * @param props.acceptanceRadius - ジェスチャの折り線が正準化された
 *        折り線の中心からこの距離以内にあれば花弁折りとみなす
 * @returns 正準化された折り線を持つステップ。構造が成立しない、
 *          またはジェスチャが花弁折りを示していない場合はnull
 *
 * @description
 * 花弁折りの折り線はスナップポイントに吸着できない位置を通るため、
 * ドラッグから計算した折り線をそのまま使わず、構造から正準化した
 * 折り線をステップに保存する（リプレイはドラッグ精度に依存しない）
 */
export const buildPetalFoldStep = (props: {
  boards: LayeredBoard[];
  midpoint: THREE.Vector3;
  direction: THREE.Vector3;
  dragVertex: THREE.Vector3;
  viewFront: boolean;
  acceptanceRadius: number;
}): PetalFoldStep | null => {
  const { boards, midpoint, direction, dragVertex, viewFront } = props;

  const structure = detectPetalStructure(boards, dragVertex, viewFront);
  if (!structure) return null;

  // ジェスチャの折り線が正準化された折り線の近くを通ること
  const gestureLine: FoldLine = {
    start: midpoint,
    end: new THREE.Vector3().addVectors(midpoint, direction),
  };
  if (
    distanceToFoldLine(structure.foldCenter, gestureLine) >
    props.acceptanceRadius
  ) {
    return null;
  }

  return {
    kind: "petal",
    foldLine: structure.foldLine,
    dragVertex: new THREE.Vector3(dragVertex.x, dragVertex.y, 0),
    viewFront,
  };
};

/**
 * 板群から花弁折りの対象構造を検出し、折り線を正準化する
 *
 * @returns 対象構造。基本ケースの条件を満たさない場合はnull
 *
 * @description
 * 基本ケースの成立条件:
 * - dragVertexを持つ候補が4枚以上で、視点側の2枚（フラップ）が
 *   dragVertexを端点とするスパインをちょうど1本共有する
 * - 各フラップは、フラップ2枚を除く候補のうちちょうど1枚（相方）と
 *   折り目を共有し、その折り目はスパイン端点Cとcornerを結ぶ
 * - 左右の|V-corner|が等しい（対称なかぶせ折りだけを対象にする）
 * - 折り線はスパイン上でVから|V-corner|の点を通る垂線。その点が
 *   スパインの内部にあり、折り線が左右の折り目の内部と交わること
 */
const detectPetalStructure = (
  boards: LayeredBoard[],
  dragVertex: THREE.Vector3,
  viewFront: boolean
): PetalStructure | null => {
  const candidates = findFoldCandidates(boards, dragVertex, viewFront);
  if (candidates.length < 4) return null;

  const [flapA, flapB] = candidates;

  const spineApex = detectSpineApex(flapA, flapB, dragVertex);
  if (!spineApex) return null;

  const restCandidates = candidates.slice(2);
  const sideA = detectPetalSide(flapA, restCandidates, spineApex, dragVertex);
  const sideB = detectPetalSide(flapB, restCandidates, spineApex, dragVertex);
  if (!sideA || !sideB) return null;
  if (sideA.partner === sideB.partner) return null;

  // 左右の腕の長さが等しい対称な構造だけを対象にする
  const dragOrigin = new THREE.Vector3(dragVertex.x, dragVertex.y, 0);
  const armA = sideA.corner.distanceTo(dragOrigin);
  const armB = sideB.corner.distanceTo(dragOrigin);
  if (Math.abs(armA - armB) > SNAP_MERGE_TOLERANCE) return null;
  const armLength = (armA + armB) / 2;

  // 折り線はスパイン上でVから腕の長さの点Aを通る垂線
  // （かぶせ折りでcornerがスパイン上のAへ写るための必要条件）
  const spineLength = spineApex.distanceTo(dragOrigin);
  if (armLength < SNAP_MERGE_TOLERANCE) return null;
  if (armLength > spineLength - SNAP_MERGE_TOLERANCE) return null;

  const spineDirection = new THREE.Vector3()
    .subVectors(spineApex, dragOrigin)
    .normalize();
  const foldCenter = dragOrigin
    .clone()
    .addScaledVector(spineDirection, armLength);
  const foldDirection = new THREE.Vector3(
    -spineDirection.y,
    spineDirection.x,
    0
  );

  // 折り線と左右の折り目（C-corner）の交点。折り目の内部で交わること
  const intersectionA = intersectWithCrease(
    foldCenter,
    foldDirection,
    spineApex,
    sideA.corner
  );
  const intersectionB = intersectWithCrease(
    foldCenter,
    foldDirection,
    spineApex,
    sideB.corner
  );
  if (!intersectionA || !intersectionB) return null;

  return {
    sides: [sideA, sideB],
    spineApex,
    foldCenter,
    foldLine: { start: intersectionA, end: intersectionB },
    creaseIntersections: [intersectionA, intersectionB],
  };
};

/**
 * フラップ2枚のスパイン（共有折り目）を検出し、反対側の端点を返す
 *
 * @description
 * - フラップ同士の共有折り目がちょうど1本で、折り畳み空間で一端が
 *   ドラッグ頂点に一致することを要求する
 */
const detectSpineApex = (
  flapA: BoardPiece,
  flapB: BoardPiece,
  dragVertex: THREE.Vector3
): THREE.Vector3 | null => {
  const sharedSegments = findSharedSourceSegments(
    flapA.sourcePolygon,
    flapB.sourcePolygon
  );
  if (sharedSegments.length !== 1) return null;

  const foldedStart = mapSourceBoundaryPointToFolded(
    flapA,
    sharedSegments[0].start
  );
  const foldedEnd = mapSourceBoundaryPointToFolded(
    flapA,
    sharedSegments[0].end
  );
  if (!foldedStart || !foldedEnd) return null;

  let apex: THREE.Vector3;
  if (isSamePosition(foldedStart, dragVertex)) apex = foldedEnd;
  else if (isSamePosition(foldedEnd, dragVertex)) apex = foldedStart;
  else return null;

  return new THREE.Vector3(apex.x, apex.y, 0);
};

/**
 * フラップの相方（折り目でつながる裏の板）と折り目の端点を検出する
 *
 * @description
 * フラップと折り目を共有する候補がちょうど1枚で、共有折り目が
 * ちょうど1本、その一端がスパイン端点に一致することを要求する
 * （それ以外の構造は基本ケース外として不成立）
 */
const detectPetalSide = (
  flap: LayeredBoard,
  restCandidates: LayeredBoard[],
  spineApex: THREE.Vector3,
  dragVertex: THREE.Vector3
): PetalSide | null => {
  let detected: PetalSide | null = null;

  for (const candidate of restCandidates) {
    const sharedSegments = findSharedSourceSegments(
      flap.sourcePolygon,
      candidate.sourcePolygon
    );
    if (sharedSegments.length === 0) continue;
    if (sharedSegments.length !== 1) return null;
    if (detected) return null;

    const foldedStart = mapSourceBoundaryPointToFolded(
      flap,
      sharedSegments[0].start
    );
    const foldedEnd = mapSourceBoundaryPointToFolded(
      flap,
      sharedSegments[0].end
    );
    if (!foldedStart || !foldedEnd) return null;

    let corner: THREE.Vector3;
    if (isSamePosition(foldedStart, spineApex)) corner = foldedEnd;
    else if (isSamePosition(foldedEnd, spineApex)) corner = foldedStart;
    else return null;
    if (isSamePosition(corner, dragVertex)) return null;

    detected = {
      flap,
      partner: candidate,
      corner: new THREE.Vector3(corner.x, corner.y, 0),
    };
  }

  return detected;
};

/**
 * 折り線と折り目（スパイン端点-corner）の交点を計算する
 *
 * @returns 交点。平行、または交点が折り目の内部にない場合はnull
 */
const intersectWithCrease = (
  foldCenter: THREE.Vector3,
  foldDirection: THREE.Vector3,
  creaseStart: THREE.Vector3,
  creaseEnd: THREE.Vector3
): THREE.Vector3 | null => {
  const creaseVector = new THREE.Vector3().subVectors(creaseEnd, creaseStart);
  const cross =
    foldDirection.x * creaseVector.y - foldDirection.y * creaseVector.x;
  if (Math.abs(cross) < 1e-6) return null;

  const toCrease = new THREE.Vector3().subVectors(creaseStart, foldCenter);
  const parameter =
    (toCrease.x * foldDirection.y - toCrease.y * foldDirection.x) / cross;

  // 交点が折り目の両端点から離れた内部にあること
  const creaseLength = creaseVector.length();
  const margin = SNAP_MERGE_TOLERANCE / creaseLength;
  if (parameter < margin || parameter > 1 - margin) return null;

  return new THREE.Vector3(
    creaseStart.x + creaseVector.x * parameter,
    creaseStart.y + creaseVector.y * parameter,
    0
  );
};

/**
 * 片を直線で分割し、指定した点の側の片をmovingPieceとして返す
 */
const splitPiece = (
  piece: BoardPiece,
  movingSidePoint: THREE.Vector3,
  line: FoldLine
): { movingPiece: BoardPiece; staticPiece: BoardPiece } | null => {
  const separated = separateBoard(piece.polygon, piece.sourcePolygon, line);
  if (!separated) return null;
  return selectMovingBoard(separated, movingSidePoint, line);
};

/**
 * 2点がXY平面上で同一位置（スナップ集約の許容誤差内）にあるか
 */
const isSamePosition = (a: THREE.Vector3, b: THREE.Vector3): boolean =>
  Math.abs(a.x - b.x) < SNAP_MERGE_TOLERANCE &&
  Math.abs(a.y - b.y) < SNAP_MERGE_TOLERANCE;
