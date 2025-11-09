import * as THREE from "three";

type RenderOrigamiBoard = (props: {
  scene: THREE.Scene;
  origamiColor: string;
  size: number;
}) => void;

/**
 * 折り紙の板をThree.jsシーンに描画する関数
 *
 * @description
 * - 指定されたサイズの正方形の板を作成
 * - 指定された色でマテリアルを設定（半透明）
 * - 水平に配置（Y軸を-90度回転）
 * - 枠線を追加して折り紙の境界を表示
 * - 折り紙と枠線をグループ化してシーンに追加
 *
 * @param props.scene - 描画対象のThree.jsシーン
 * @param props.origamiColor - 折り紙の色（CSS色文字列）
 * @param props.size - 折り紙のサイズ（正方形の一辺の長さ）
 */
export const renderOrigamiBoard: RenderOrigamiBoard = ({
  scene,
  origamiColor,
  size,
}) => {
  // 折り紙のジオメトリを作成（正方形の板）
  const geometry = new THREE.PlaneGeometry(size, size);

  // マテリアルを作成
  const material = new THREE.MeshLambertMaterial({
    color: origamiColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });

  // メッシュを作成（XY平面にそのまま配置: Z法線）
  const origamiMesh = new THREE.Mesh(geometry, material);
  origamiMesh.name = "origami";
  origamiMesh.position.z = 0;

  // 折り紙の枠線を追加
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
  });
  const wireframe = new THREE.LineSegments(edges, lineMaterial);
  wireframe.position.z = 0.1; // 少し手前に配置して重なりを避ける

  // グループを作成して折り紙と枠線をまとめる
  const origamiGroup = new THREE.Group();
  origamiGroup.name = "origami";
  origamiGroup.add(origamiMesh);
  origamiGroup.add(wireframe);

  scene.add(origamiGroup);
};
