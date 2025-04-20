import { atom } from "jotai";
import { Step } from "../FoldMethodControlPanel";

type CurrentStep = {
  inputStep: Step;
  procedureIndex: number;
};

export const currentStepAtom = atom<CurrentStep>({
  inputStep: "axis",
  procedureIndex: 1,
});
