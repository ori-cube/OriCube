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
  kind: "fold" | "squash" | "petal" | "insideReverse";
  /** アニメーション中も動かない板 */
  fixBoards: FixBoardV2[];
  /** 動く板 */
  moveBoards: MoveBoardV2[];
  /** 表示用の折り線（開いて畳むはヒンジ、花弁折りはかぶせ折り線を含む） */
  foldLines: SegmentV2[];
  /**
   * 回転再生の目標角（ラジアン、省略時はπ = 180度）
   *
   * @description
   * 180度未満は仕上げ角度（例: 鶴の羽の150度折り）。閲覧側はθを
   * 0からこの角度まで進めて再生する
   */
  targetAngle?: number;
}

/** ジェスチャ履歴の1要素（再編集・ソルバ改良時の再エクスポート用） */
export type HistoryStepV2 =
  | {
      kind: "fold";
      foldLine: SegmentV2;
      dragVertex: PointV2;
      foldCount: number;
      viewFront: boolean;
      /** 折り角（ラジアン、省略時はπ = 180度の平面折り） */
      angle?: number;
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
    }
  | {
      kind: "insideReverse";
      foldLine: SegmentV2;
      dragVertex: PointV2;
      viewFront: boolean;
    }
  | {
      /** 裏返し（version 3 以降）。viewFront は裏返した後の表裏 */
      kind: "flip";
      viewFront: boolean;
    };

/** v2投稿データ（Model.procedureとして保存する形式） */
export interface ProcedureV2 {
  /**
   * データ形式の版
   *
   * @description
   * - 2: 裏返しを保存しない。閲覧時は折りの表裏（viewFront）の変化から推定する
   * - 3: 裏返しを history に手順として保存する。steps は折りだけで、history の折りと同じ順に対応する
   */
  version: 2 | 3;
  /** 折る前の正方形の一辺 */
  size: number;
  /** 各ステップの答えデータ（閲覧側はθ回転で再生するだけ） */
  steps: StepV2[];
  /** 全ステップ適用後の最終状態（完成形の表示用） */
  finalBoards: FixBoardV2[];
  /** ジェスチャ履歴 */
  history: HistoryStepV2[];
}

/** 回転を表す単位クォータニオン [x, y, z, w] */
export type QuaternionV2 = [number, number, number, number];

/**
 * 完成形を見せる向き
 *
 * @description
 * 閲覧の表示座標（完成形の中心を原点にし、最後の表裏に合わせて Y 軸周りに回したあと）に掛ける回転。
 * 対角線で折る鶴のように、折ったときの向きでは傾いて見える作品を立てるのに使う。
 * 折る途中の手順は折ったときの向きのまま見せ、最後の「完成形の向きに整える」ステップでこの向きへ回す
 */
export interface PresentationV2 {
  rotation: QuaternionV2;
}

/** 単位クォータニオンとして使える値か（有限・長さ1） */
export const isUnitQuaternion = (value: unknown): value is QuaternionV2 =>
  Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === "number" && Number.isFinite(item))
  && Math.abs(Math.hypot(...(value as number[])) - 1) < 1e-3;
