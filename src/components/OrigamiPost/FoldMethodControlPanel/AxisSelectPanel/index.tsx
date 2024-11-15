import styles from "./index.module.scss";
import { NextStepButton } from "../ui/NextStepButton";

type Props = {
  handleNextStep: () => void;
};

export const AxisSelectPanel: React.FC<Props> = ({ handleNextStep }) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>折り線を選択</h2>
      <div>ここにGIFの説明が入る</div>
      <NextStepButton handleNextStep={handleNextStep} />
    </div>
  );
};
