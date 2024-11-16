/*
点が線分の左側にあるかどうかを判定する関数
zx平面、yz平面では使用できない...
**/

import { Point } from "@/types/three";

type IsOnLeftSide = (props: {
  point: Point;
  axis1: Point;
  axis2: Point;
}) => boolean;

export const isOnLeftSide: IsOnLeftSide = ({ point, axis1, axis2 }) => {
  // axis1とaxis2を、常にx座標が大きい方を1, 小さい方を2にするようにする
  const newAxis1 = axis1[0] < axis2[0] ? axis1 : axis2;
  const newAxis2 = axis1[0] < axis2[0] ? axis2 : axis1;

  // 2つのベクトルの外積(z成分)が正ならば左側にある
  const v1 = [
    newAxis2[0] - newAxis1[0],
    newAxis2[1] - newAxis1[1],
    newAxis2[2] - newAxis1[2],
  ];
  const v2 = [
    point[0] - newAxis1[0],
    point[1] - newAxis1[1],
    point[2] - newAxis1[2],
  ];
  const crossProduct = [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];

  return crossProduct[2] > 0;

  // 2つのベクトルの外積(z成分)が正ならば左側にある
  //   const v1 = [axis2[0] - axis1[0], axis2[1] - axis1[1], axis2[2] - axis1[2]];
  //   const v2 = [point[0] - axis1[0], point[1] - axis1[1], point[2] - axis1[2]];
  //   const crossProduct = [
  //     v1[1] * v2[2] - v1[2] * v2[1],
  //     v1[2] * v2[0] - v1[0] * v2[2],
  //     v1[0] * v2[1] - v1[1] * v2[0],
  //   ];
  //   return crossProduct[2] > 0;
};
