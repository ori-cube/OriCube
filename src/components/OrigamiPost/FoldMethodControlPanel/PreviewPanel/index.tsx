import styles from "./index.module.scss";
import { NextStepButton } from "../ui/NextStepButton";
import { PrevStepButton } from "../ui/PrevStepButton";
import Image from "next/image";
import { Button } from "@radix-ui/themes";

type Props = {
  handlePrevStep: () => void;
  handleNextStep: () => void;
  handleRegisterOrigami: () => void;
};

export const PreviewPanel: React.FC<Props> = ({
  handlePrevStep,
  handleNextStep,
  handleRegisterOrigami,
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>折り紙を公開する</h2>
      <div className={styles.descriptions}>
        <p></p>
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
        <Button
          className={styles.registerButton}
          onClick={handleRegisterOrigami}
        >
          折り紙を登録する
        </Button>
      </div>
    </div>
  );
};
