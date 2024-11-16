import styles from "./index.module.scss";
import { NextStepButton } from "../ui/NextStepButton";
import { PrevStepButton } from "../ui/PrevStepButton";
import Image from "next/image";

type Props = {
  handlePrevStep: () => void;
  handleNextStep: () => void;
};

export const FoldTargetSelectPanel: React.FC<Props> = ({
  handlePrevStep,
  handleNextStep,
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>折る側の面を選択(2/3)</h2>
      <div className={styles.descriptions}>
        <p>動画のように、折りたい方の面を選択してください。</p>
        <Image
          src="/assets/step2.gif"
          alt="動画：カーソルが動いて、折り紙の折る側の面を選択している。"
          width={255}
          height={255}
          className={styles.gif}
        />
      </div>
      <div className={styles.buttons}>
        <PrevStepButton handlePrevStep={handlePrevStep} />
        <NextStepButton handleNextStep={handleNextStep} />
      </div>
    </div>
  );
};
