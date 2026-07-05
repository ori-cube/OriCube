import * as THREE from "three";

/**
 * 折り紙の板（多角形）
 *
 * @description
 * - 順序付きの頂点列で多角形を表現する
 * - 初期状態は正方形だが、折るたびに任意の多角形になる
 */
export type Board = THREE.Vector3[];

/**
 * 折り線（折り紙境界との交点で区切られた線分）
 */
export interface FoldLine {
  /** 折り線の始点 */
  start: THREE.Vector3;
  /** 折り線の終点 */
  end: THREE.Vector3;
}

/**
 * 折り畳み空間と展開図空間のポリゴンの組
 *
 * @description
 * - polygonとsourcePolygonは同じ長さで、インデックスiの頂点同士が
 *   紙上の同一点に対応する
 * - sourcePolygonは折る前の正方形の座標系（展開図空間、z=0）で保持する。
 *   折りで回転・鏡映されず、分割時に細分されるだけなので誤差が蓄積しない
 * - 紙は展開図上では連続体なので、2つの板が物理的につながっているか
 *   （＝折り目を共有しているか）はsourcePolygon同士が正の長さの
 *   境界線分を共有するかで正確に判定できる
 */
export interface BoardPiece {
  /** 板の多角形（折り畳み空間、XY平面上） */
  polygon: Board;
  /** 板の多角形（展開図空間、初期正方形の座標系） */
  sourcePolygon: Board;
}

/**
 * レイヤー番号付きの板
 *
 * @description
 * - polygonはXY平面上（z=0）で保持し、重なり順はlayerで表現する
 * - 描画時に z = layer * オフセット で立体的に重ねる
 * - layerは大きいほど表側（+Z側）。折るたびに再割り当てされるため
 *   連番とは限らず、負の値も取り得る
 */
export interface LayeredBoard extends BoardPiece {
  /** 重なり順（大きいほど表側） */
  layer: number;
}

/**
 * 1回の折り操作（折り手順の履歴の1要素）
 *
 * @description
 * 初期状態の正方形にFoldStepを順に適用（リプレイ）することで、
 * 現在の板の形状を再現できる最小限の情報を持つ。
 * この履歴がUndo/Redoと投稿データ化の基礎になる。
 */
export interface FoldStep {
  /** 折り線（無限直線として扱う。start/endは表示用のスパン） */
  foldLine: FoldLine;
  /** ドラッグした頂点の元位置（折る板の特定と、動く側の判定に使用） */
  dragVertex: THREE.Vector3;
  /** 折る枚数（頂点を共有する板のうち、視点側から数えて何枚折るか） */
  foldCount: number;
  /** 折ったときに表側（+Z側）から見ていたか */
  viewFront: boolean;
}
