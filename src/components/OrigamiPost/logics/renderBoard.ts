import * as THREE from "three";
import { Board } from "@/types/three";

type RenderBoard = (props: {
  scene: THREE.Scene;
  board: Board;
  color: string;
}) => void;

export const renderBoard: RenderBoard = ({ scene, board, color }) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(board.flat()), 3)
  );

  if (board.length >= 4) {
    const indices = [];
    for (let j = 0; j < board.length - 2; j++) {
      indices.push(0, j + 1, j + 2);
    }
    geometry.setIndex(indices);
  }

  const frontMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    side: THREE.FrontSide,
    transparent: true,
  });
  const backMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#DFDFDF"),
    side: THREE.BackSide,
    transparent: true,
  });
  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
  });

  const frontMesh = new THREE.Mesh(geometry, frontMaterial);
  const backMesh = new THREE.Mesh(geometry, backMaterial);
  scene.add(frontMesh);
  scene.add(backMesh);

  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const wireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);
  scene.add(wireframe);
};
