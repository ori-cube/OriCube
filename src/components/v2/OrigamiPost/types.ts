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
 * 1回の通常の折り操作（折り手順の履歴の1要素）
 *
 * @description
 * 初期状態の正方形にOrigamiStepを順に適用（リプレイ）することで、
 * 現在の板の形状を再現できる最小限の情報を持つ。
 * この履歴がUndo/Redoと投稿データ化の基礎になる。
 */
export interface FoldStep {
  kind: "fold";
  /** 折り線（無限直線として扱う。start/endは表示用のスパン） */
  foldLine: FoldLine;
  /** ドラッグした頂点の元位置（折る板の特定と、動く側の判定に使用） */
  dragVertex: THREE.Vector3;
  /** 折る枚数（頂点を共有する板のうち、視点側から数えて何枚折るか） */
  foldCount: number;
  /** 折ったときに表側（+Z側）から見ていたか */
  viewFront: boolean;
  /**
   * 折り角（ラジアン、省略時はπ = 180度の平面折り）
   *
   * @description
   * - πより小さい値は仕上げ角度（例: 鶴の羽の150度折り）。板の分割・
   *   破れ判定などのエンジン処理は180度折りとして扱い（平面プロキシ）、
   *   描画とアニメーションだけが実際の角度で表示する
   * - 仕上げ角度の板にさらに折りを重ねると物理的に破綻するため、
   *   仕上げは最後の手として使う想定
   */
  angle?: number;
}

/**
 * 開いて畳む操作（スクワッシュフォールド）の履歴要素
 *
 * @description
 * - 折り目（スパイン）でつながった視点側2枚のフラップを、ドラッグした
 *   頂点の折り線で開いて平らに畳む操作
 * - 対象のフラップや分割・変換の幾何はリプレイ時に板群から再導出する
 *   ため、通常の折りと同じくジェスチャの最小情報のみを持つ
 */
export interface SquashFoldStep {
  kind: "squash";
  /** 折り線（無限直線として扱う。start/endは表示用のスパン） */
  foldLine: FoldLine;
  /** ドラッグした頂点の元位置（フラップの特定と、動く側の判定に使用） */
  dragVertex: THREE.Vector3;
  /** 折ったときに表側（+Z側）から見ていたか */
  viewFront: boolean;
}

/**
 * 花弁折り（ペタルフォールド）の履歴要素
 *
 * @description
 * - 正方基本形の先端のように、スパインでつながった前面フラップ2枚と
 *   その裏の相方2枚を、先端の持ち上げ＋左右のかぶせ折りで畳む操作
 * - 折り線はジェスチャからではなく板群の構造から正準化して導出する
 *   （かぶせ折りが成立する位置は構造から一意に決まるため）。
 *   保存する折り線は正準化済みのもの
 */
export interface PetalFoldStep {
  kind: "petal";
  /** 折り線（正準化済み。スパンはかぶせ折り線との交点間） */
  foldLine: FoldLine;
  /** ドラッグした頂点の元位置（フラップの特定に使用） */
  dragVertex: THREE.Vector3;
  /** 折ったときに表側（+Z側）から見ていたか */
  viewFront: boolean;
}

/**
 * 中割り折り（インサイドリバースフォールド）の履歴要素
 *
 * @description
 * - 鶴の首・尾のように、折り目で重なった1本の「点」（展開図連結な板の束）の
 *   先端を、折り筋を反転させながらレイヤーの間へ差し込む操作
 * - 動かす点はドラッグ頂点を共有する候補板のうち、視点側の先頭板と
 *   展開図上でつながっている連結成分として特定する（リプレイ時に再導出）
 */
export interface InsideReverseFoldStep {
  kind: "insideReverse";
  /** 折り線（無限直線として扱う。start/endは表示用のスパン） */
  foldLine: FoldLine;
  /** ドラッグした頂点の元位置（動かす点の特定に使用） */
  dragVertex: THREE.Vector3;
  /** 折ったときに表側（+Z側）から見ていたか */
  viewFront: boolean;
}

/**
 * 折り手順の履歴の1要素（通常の折り・開いて畳む・花弁折り・中割り折り）
 */
export type OrigamiStep =
  | FoldStep
  | SquashFoldStep
  | PetalFoldStep
  | InsideReverseFoldStep;
