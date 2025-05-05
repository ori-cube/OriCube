import * as THREE from "three";
import { Point } from "@/types/model";

type RenderPoint = (props: { scene: THREE.Scene; point: Point }) => void;

export const renderPoint: RenderPoint = ({ scene, point }) => {
  const geometry = new THREE.SphereGeometry(1, 32, 32).scale(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x001eff });
  const pointMesh = new THREE.Mesh(geometry, material);
  pointMesh.position.set(point[0], point[1], point[2]);
  pointMesh.name = "Point";
  scene.add(pointMesh);
};

export const renderHighlightPoint = ({
  scene,
  point,
}: {
  scene: THREE.Scene;
  point: Point;
}) => {
  const geometry = new THREE.SphereGeometry(1, 32, 32).scale(0.7, 0.7, 0.7);
  const material = new THREE.MeshBasicMaterial({ color: 0x00aaff });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(point[0], point[1], point[2]);
  sphere.name = "HighlightPoint";
  scene.add(sphere);
};

export const renderSnapPoint = ({
  scene,
  point,
}: {
  scene: THREE.Scene;
  point: Point;
}) => {
  const geometry = new THREE.SphereGeometry(1, 32, 32).scale(0.3, 0.3, 0.3);
  const material = new THREE.MeshBasicMaterial({ color: 0x007b94 });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(point[0], point[1], point[2]);
  sphere.name = "SnapPoint";
  scene.add(sphere);
};
