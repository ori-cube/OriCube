import * as THREE from "three";
import { useEffect } from "react";

type UseOrigamiRenderer = (props: {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  origamiColor: string;
  size: number;
}) => void;

export const useOrigamiRenderer: UseOrigamiRenderer = ({
  sceneRef,
  origamiColor,
  size,
}) => {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 既存の折り紙オブジェクトをクリア
    const existingOrigami = scene.getObjectByName("origami");
    if (existingOrigami) {
      scene.remove(existingOrigami);
    }

    // 折り紙のジオメトリを作成（正方形の板）
    const geometry = new THREE.PlaneGeometry(size, size);

    // マテリアルを作成
    const material = new THREE.MeshLambertMaterial({
      color: origamiColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    // メッシュを作成
    const origamiMesh = new THREE.Mesh(geometry, material);
    origamiMesh.name = "origami";
    origamiMesh.rotation.x = -Math.PI / 2; // 水平に配置
    origamiMesh.position.y = 0;

    // 折り紙の枠線を追加
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.rotation.x = -Math.PI / 2;
    wireframe.position.y = 0.1; // 少し上に配置して重なりを避ける

    // グループを作成して折り紙と枠線をまとめる
    const origamiGroup = new THREE.Group();
    origamiGroup.name = "origami";
    origamiGroup.add(origamiMesh);
    origamiGroup.add(wireframe);

    scene.add(origamiGroup);

    return () => {
      // クリーンアップ
      geometry.dispose();
      material.dispose();
      lineMaterial.dispose();
      if (scene) {
        const origami = scene.getObjectByName("origami");
        if (origami) {
          scene.remove(origami);
        }
      }
    };
  }, [sceneRef, origamiColor, size]);
};
