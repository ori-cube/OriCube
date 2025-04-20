import * as THREE from "three";
import { Point } from "@/types/model";

type RenderPoint = (props: { scene: THREE.Scene; point: Point }) => void;

export const renderPoint: RenderPoint = ({ scene, point }) => {
  const geometry = new THREE.SphereGeometry(1, 32, 32).scale(0.7, 0.7, 0.7);
  const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
  const pointMesh = new THREE.Mesh(geometry, material);
  pointMesh.position.set(point[0], point[1], point[2]);
  pointMesh.name = "Point";
  scene.add(pointMesh);
};
