// import styles from "./index.module.scss";
import { SegmentedControl } from "@radix-ui/themes";

type Props = {
  procedureLength: number;
  currentStep: number;
  handleChangeStep: (step: number) => void;
};

export const FoldStepSegmentedControl: React.FC<Props> = ({
  procedureLength,
  currentStep,
  handleChangeStep,
}) => {
  return (
    <SegmentedControl.Root
      defaultValue="1"
      value={currentStep !== undefined ? currentStep.toString() : "1"}
      onValueChange={(value) => handleChangeStep(Number(value))}
    >
      {Array.from({ length: procedureLength }).map((_, index) => (
        <SegmentedControl.Item key={index} value={String(index + 1)}>
          {index + 1}
        </SegmentedControl.Item>
      ))}
    </SegmentedControl.Root>
  );
};
