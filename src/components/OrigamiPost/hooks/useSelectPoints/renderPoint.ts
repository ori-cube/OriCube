import * as THREE from "three";
import { Point } from "@/types/model";

// 共通化した型定義
type RenderPoint = (props: {
  scene: THREE.Scene;
  point: Point;
  color: number;
  scale: number;
  name: string;
}) => void;

export const renderPoint: RenderPoint = ({
  scene,
  point,
  color,
  scale,
  name,
}) => {
  const geometry = new THREE.SphereGeometry(1, 32, 32).scale(
    scale,
    scale,
    scale
  );
  const material = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(point[0], point[1], point[2]);
  mesh.name = name;
  scene.add(mesh);
};

// 既存の関数はラップするだけ
export const renderSelectedPoint = (props: {
  scene: THREE.Scene;
  point: Point;
}) =>
  renderPoint({
    ...props,
    color: 0x001eff,
    scale: 1,
    name: "Point",
  });

export const renderHighlightPoint = (props: {
  scene: THREE.Scene;
  point: Point;
}) =>
  renderPoint({
    ...props,
    color: 0x00aaff,
    scale: 0.7,
    name: "HighlightPoint",
  });

export const renderSnapPoint = (props: { scene: THREE.Scene; point: Point }) =>
  renderPoint({
    ...props,
    color: 0x007b94,
    scale: 0.3,
    name: "SnapPoint",
  });
