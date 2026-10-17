import * as THREE from "three";
import { disposeObject3D } from "./disposeObject3D";

export const removeObjects = (
  parent: THREE.Object3D,
  shouldRemove: (object: THREE.Object3D) => boolean = () => true
) => {
  for (const child of [...parent.children]) {
    if (!shouldRemove(child)) continue;
    parent.remove(child);
    disposeObject3D(child);
  }
};
