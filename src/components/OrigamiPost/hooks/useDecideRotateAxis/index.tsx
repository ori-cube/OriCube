import { Point } from "@/types/model";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtom } from "jotai";
import { validateSelectedPoints, processBoards } from "./processBoards";

type UseDecideRotateAxis = () => {
  handleDecideRotateAxis: () => void;
  handleCancelRotateAxis: () => void;
};

export const useDecideRotateAxis: UseDecideRotateAxis = () => {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [inputStepObject, setInputStepObject] = useAtom(inputStepObjectAtom);

  const procedureIndex = currentStep.procedureIndex;
  const selectedPoints =
    inputStepObject[procedureIndex.toString()].selectedPoints;
  const fixBoards = inputStepObject[procedureIndex.toString()].fixBoards;

  const handleDecideRotateAxis = async () => {
    try {
      // step0:選択された点のバリデーション
      validateSelectedPoints(selectedPoints);

      // step1:選択された点を元に、回転軸を決定
      const axis: [Point, Point] = [
        [...selectedPoints[0]],
        [...selectedPoints[1]],
      ];

      // step2:板を分割するか、回転軸が左右どちらに属するかを判定
      const { lefts, rights } = processBoards(fixBoards, axis);

      // step3:状態を更新
      setInputStepObject({
        ...inputStepObject,
        [procedureIndex.toString()]: {
          ...inputStepObject[procedureIndex.toString()],
          rotateAxis: axis,
          leftBoards: lefts,
          rightBoards: rights,
        },
      });

      // step4:次のステップに進む
      setCurrentStep({
        ...currentStep,
        inputStep: "target",
      });
    } catch (error) {
      throw error;
    }
  };

  const handleCancelRotateAxis = () => {
    // 選択をキャンセルしてリセット
    setCurrentStep({
      ...currentStep,
      inputStep: "axis",
    });
  };

  return {
    handleDecideRotateAxis,
    handleCancelRotateAxis,
  };
};
