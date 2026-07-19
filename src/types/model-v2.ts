/**
 * v2投稿データ（答え形式）の型定義
 *
 * @description
 * - 投稿側（OrigamiPost v2）のジェスチャ履歴を保存時にエクスポートした、
 *   閲覧側がソルバなしで再生できる「答え」のデータ
 * - 閲覧側は各ステップの動く板の頂点を、頂点ごとの回転軸の列で
 *   同一角度θ（0→π）回転させて描画するだけでよい
 * - 旧形式（model.tsのProcedure）とは互換性がない
 */

/** 座標 [x, y, z] */
export type PointV2 = [number, number, number];

/** 表示用の線分（折り線・ヒンジ・かぶせ折り線など） */
export interface SegmentV2 {
  start: PointV2;
  end: PointV2;
}

/** 回転軸（軸が通る点と向き付きの方向。正の回転角で持ち上がる向き） */
export interface AxisV2 {
  origin: PointV2;
  direction: PointV2;
}

/** アニメーション中も動かない板 */
export interface FixBoardV2 {
  polygon: PointV2[];
  /** 重なり順（大きいほど表側。z = layer × オフセットで浮かせて描画する） */
  layer: number;
}

/** 動く板（頂点ごとの回転軸の列を持つ） */
export interface MoveBoardV2 {
  /** 回転前の頂点列 */
  polygon: PointV2[];
  /** アニメーション中の重なり順 */
  layer: number;
  /**
   * polygonと同じ長さ。各頂点を同一角度θで順に回転する軸の列（0本=不動）。
   * 複数の軸で別々に動く折り（開いて畳む・花弁折り）も表現できる
   */
  vertexAxes: AxisV2[][];
}

/** 折り手順の1ステップ（答え形式） */
export interface StepV2 {
  /** 折り操作の種類 */
  kind: "fold" | "squash" | "petal";
  /** アニメーション中も動かない板 */
  fixBoards: FixBoardV2[];
  /** 動く板 */
  moveBoards: MoveBoardV2[];
  /** 表示用の折り線（開いて畳むはヒンジ、花弁折りはかぶせ折り線を含む） */
  foldLines: SegmentV2[];
}

/** ジェスチャ履歴の1要素（再編集・ソルバ改良時の再エクスポート用） */
export type HistoryStepV2 =
  | {
      kind: "fold";
      foldLine: SegmentV2;
      dragVertex: PointV2;
      foldCount: number;
      viewFront: boolean;
    }
  | {
      kind: "squash";
      foldLine: SegmentV2;
      dragVertex: PointV2;
      viewFront: boolean;
    }
  | {
      kind: "petal";
      foldLine: SegmentV2;
      dragVertex: PointV2;
      viewFront: boolean;
    };

/** v2投稿データ（Model.procedureとして保存する形式） */
export interface ProcedureV2 {
  version: 2;
  /** 折る前の正方形の一辺 */
  size: number;
  /** 各ステップの答えデータ（閲覧側はθ回転で再生するだけ） */
  steps: StepV2[];
  /** 全ステップ適用後の最終状態（完成形の表示用） */
  finalBoards: FixBoardV2[];
  /** ジェスチャ履歴 */
  history: HistoryStepV2[];
}
