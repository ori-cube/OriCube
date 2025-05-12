import { useAtom } from "jotai";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";

export const useCancelFoldTarget = () => {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [inputStepObject, setInputStepObject] = useAtom(inputStepObjectAtom);

  const handleCancelFoldTarget = () => {
    const procedureIndex = currentStep.procedureIndex;
    const step = inputStepObject[procedureIndex.toString()];
    if (step.type !== "Base") return;

    const fixBoards = step.fixBoards;
    const moveBoards = step.moveBoards;

    setCurrentStep({ inputStep: "target", procedureIndex: procedureIndex });
    setInputStepObject((prev) => ({
      ...prev,
      [procedureIndex.toString()]: {
        ...prev[procedureIndex.toString()],
        fixBoards: [...fixBoards, ...moveBoards],
        moveBoards: [],
        numberOfMoveBoards: 0,
        isFoldingDirectionFront: true,
        maxNumberOfMoveBoards: 0,
      },
    }));
  };

  return { handleCancelFoldTarget };
};
