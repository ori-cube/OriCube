import styles from "./index.module.scss";
import { HiOutlineArrowRight, HiOutlineArrowLeft } from "react-icons/hi2";

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
      <h2 className={styles.title}>折る側の紙を選択</h2>
      <div>ここにGIFの説明が入る</div>
      <div className={styles.buttons}>
        <button className={styles.button} onClick={handlePrevStep}>
          <HiOutlineArrowLeft aria-hidden />
          戻る
        </button>
        <button className={styles.button} onClick={handleNextStep}>
          次へ
          <HiOutlineArrowRight aria-hidden />
        </button>
      </div>
    </div>
  );
};
