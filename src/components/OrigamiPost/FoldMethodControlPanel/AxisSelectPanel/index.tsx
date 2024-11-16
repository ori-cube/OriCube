import styles from "./index.module.scss";
import { NextStepButton } from "../ui/NextStepButton";
import Image from "next/image";

type Props = {
  handleNextStep: () => void;
};

export const AxisSelectPanel: React.FC<Props> = ({ handleNextStep }) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>折り線を選択(1/3)</h2>
      <div className={styles.descriptions}>
        <p>動画のように、折り紙の辺上の2点を選択してください。</p>
        <Image
          src="/assets/step1.gif"
          alt="動画：カーソルが動いて、折り紙の辺上の2点を選択している。"
          width={255}
          height={255}
          className={styles.gif}
        />
      </div>
      <NextStepButton handleNextStep={handleNextStep} />
    </div>
  );
};
