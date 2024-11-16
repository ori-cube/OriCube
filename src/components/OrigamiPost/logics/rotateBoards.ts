/*
板を与えられた角度によって回転する関数
**/
import * as THREE from "three";
import { Point, Board } from "@/types/three";

type rotateBoards = (props: {
  boards: Board[];
  rotateAxis: [Point, Point];
  angle: number;
  isFoldingDirectionFront: boolean;
}) => Board[];

export const rotateBoards: rotateBoards = ({
  boards,
  rotateAxis,
  angle,
  isFoldingDirectionFront,
}) => {
  //  isMoveBoardsRightがtrueのとき、軸をx軸が負の方向を向くようにソート
  //  falseのとき、軸をx軸が正の方向を向くようにソート
  //  axisは[1] -> [0]の向きになる
  const sortedRotateAxis = rotateAxis;
  //   if (isMoveBoardsRight) {
  //     sortedRotateAxis =
  //       rotateAxis[0][0] < rotateAxis[1][0]
  //         ? rotateAxis
  //         : [rotateAxis[1], rotateAxis[0]];
  //   } else {
  //     sortedRotateAxis =
  //       rotateAxis[0][0] > rotateAxis[1][0]
  //         ? rotateAxis
  //         : [rotateAxis[1], rotateAxis[0]];
  //   }

  // 重なっている板を回転するとき、
  // 板のz座標がisFoldingDirectionFrontがtrueのときは一番大きい板のz座標を基準に回転する
  // falseのときは一番小さい板のz座標を基準に回転する
  let z;
  //  回転軸の2つのz座標の差の絶対値が0.01以下の場合、z座標を一番大きい板のz座標に合わせる
  if (Math.abs(sortedRotateAxis[0][2] - sortedRotateAxis[1][2]) < 0.01) {
    for (let i = 0; i < boards.length; i++) {
      const board = boards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        if (isFoldingDirectionFront) {
          if (z === undefined || board[0][2] > z) {
            z = board[0][2];
          }
        } else {
          if (z === undefined || board[0][2] < z) {
            z = board[0][2];
          }
        }
      }
    }
  }

  console.log("z", z);

  let axis = new THREE.Vector3(...sortedRotateAxis[0])
    .sub(new THREE.Vector3(...sortedRotateAxis[1]))
    .normalize();
  let subNode = new THREE.Vector3(...sortedRotateAxis[0]);

  if (z !== undefined) {
    axis = new THREE.Vector3(sortedRotateAxis[0][0], sortedRotateAxis[0][1], z)
      .sub(new THREE.Vector3(sortedRotateAxis[1][0], sortedRotateAxis[1][1], z))
      .normalize();
    subNode = new THREE.Vector3(
      sortedRotateAxis[0][0],
      sortedRotateAxis[0][1],
      z
    );
  }

  const theta = THREE.MathUtils.degToRad(
    isFoldingDirectionFront ? angle : -angle
  );

  const newBoards = [];
  for (let i = 0; i < boards.length; i++) {
    // moveBoardの各頂点のz座標が同じの場合、rotateAxisのz座標をそれに合わせる
    const moveBoard = boards[i];

    const newBoard: Board = moveBoard.map((point) => {
      const node = new THREE.Vector3(...point);
      const rotateNode = node.clone().sub(subNode);
      rotateNode.applyAxisAngle(axis, theta);
      rotateNode.add(subNode);
      return [rotateNode.x, rotateNode.y, rotateNode.z] as Point;
    });

    newBoards.push(newBoard);
  }

  return newBoards;
};
