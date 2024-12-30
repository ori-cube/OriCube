import { Point, Board } from "@/types/three";
import * as THREE from "three";
import { getAllIntersections } from "../../logics/getAllIntersections";
import { separateBoard } from "../../logics/separateBoard";
import { useState } from "react";
import { isOnLeftSide } from "../../logics/isOnLeftSide";
import { LineGeometry } from "three/examples/jsm/Addons.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { Line2 } from "three/examples/jsm/Addons.js";
import { renderBoard } from "../../logics/renderBoard";
import { Step } from "../../FoldMethodControlPanel";

type UseDecideRotateAxis = (props: {
  selectedPoints: Point[];
  fixBoards: Board[];
  setInputStep: React.Dispatch<React.SetStateAction<Step>>;
  origamiColor: string;
}) => {
  handleDecideRotateAxis: (scene: THREE.Scene) => void;
  handleCancelRotateAxis: () => void;
  leftBoards: Board[];
  rightBoards: Board[];
  rotateAxis: [Point, Point] | [];
};

export const useDecideRotateAxis: UseDecideRotateAxis = ({
  selectedPoints,
  fixBoards,
  setInputStep,
  origamiColor,
}) => {
  const [leftBoards, setLeftBoards] = useState<Board[]>([]);
  const [rightBoards, setRightBoards] = useState<Board[]>([]);
  const [rotateAxis, setRotateAxis] = useState<[Point, Point] | []>([]);

  const handleDecideRotateAxis = (scene: THREE.Scene) => {
    if (selectedPoints.length < 2)
      return console.error("点が2つ選択されていません");

    const axis: [Point, Point] = [
      [...selectedPoints[0]],
      [...selectedPoints[1]],
    ];

    const lefts: Board[] = [];
    const rights: Board[] = [];

    for (let i = 0; i < fixBoards.length; i++) {
      const board = fixBoards[i];
      const intersections = getAllIntersections({
        board,
        rotateAxis: axis,
      });
      if (intersections.length === 2) {
        // 板を分割する場合
        const separatedBoard = separateBoard({
          board,
          rotateAxis: axis,
        });
        if (!separatedBoard) return alert("Failed to separate board.");
        const { leftBoard, rightBoard } = separatedBoard;
        lefts.push(leftBoard);
        rights.push(rightBoard);
      } else {
        // 板を分割しない場合
        // 板が回転軸の左側にあるか、右側にあるかを判定
        // TODO: 一部分だけ回転軸の左右にある場合はエラーになる。

        const isLeftSide = board.map((point) =>
          isOnLeftSide({
            point,
            axis1: axis[0],
            axis2: axis[1],
          })
        );

        const isAllLeft = isLeftSide.every((b) => b);
        const isAllRight = isLeftSide.every((b) => !b);

        if (isAllLeft) {
          lefts.push(board);
        } else if (isAllRight) {
          rights.push(board);
        } else {
          //   return setPopup({
          //     message: "板が回転軸の左右にまたがっているため、分割できません。",
          //     type: "error",
          //   });
        }
      }
    }
    // sceneから板、線を削除
    scene.children = scene.children.filter(
      (child) => child.type !== "Mesh" && child.type !== "LineSegments"
    );
    // pointを削除する
    scene.children = scene.children.filter((child) => child.type !== "Points");

    // 折り線を描画
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions([
      axis[0][0],
      axis[0][1],
      axis[0][2],
      axis[1][0],
      axis[1][1],
      axis[1][2],
    ]);
    const lineMaterial = new LineMaterial({
      color: 0xff00ff,
      linewidth: 3,
    });
    const lineMesh = new Line2(lineGeometry, lineMaterial);
    lineMesh.name = "Axis";
    scene.add(lineMesh);

    setRotateAxis(axis);
    setInputStep("target");
    lefts.forEach((board) =>
      renderBoard({ scene, board, color: origamiColor })
    );
    rights.forEach((board) =>
      renderBoard({ scene, board, color: origamiColor })
    );

    console.log("lefts", lefts);
    console.log("rights", rights);
    setLeftBoards(lefts);
    setRightBoards(rights);
  };

  const handleCancelRotateAxis = () => {
    setRotateAxis([]);
    // TODO: 状態を保持しておいて、一個前の状態に戻すようにする
    // setFixBoards([initialBoard]);
    // setMoveBoards([]);
    setInputStep("axis");
  };

  return {
    handleDecideRotateAxis,
    handleCancelRotateAxis,
    leftBoards,
    rightBoards,
    rotateAxis,
  };
};
