import styles from "./index.module.scss";
import { NextStepButton } from "../ui/NextStepButton";
import { PrevStepButton } from "../ui/PrevStepButton";

type Props = {
  handlePrevStep: () => void;
  handleNextStep: () => void;
};

export const FoldMethodSelectPanel: React.FC<Props> = ({
  handlePrevStep,
  handleNextStep,
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>折り方を選択</h2>
      <div className={styles.buttons}>
        <PrevStepButton handlePrevStep={handlePrevStep} />
        <NextStepButton handleNextStep={handleNextStep} />
      </div>
    </div>
  );
};
