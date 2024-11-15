import styles from "./index.module.scss";
import { HiOutlineArrowRight } from "react-icons/hi2";

type Props = {
  handleNextStep: () => void;
};

export const AxisSelectPanel: React.FC<Props> = ({ handleNextStep }) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>折り線を選択</h2>
      <div>ここにGIFの説明が入る</div>
      <button className={styles.button} onClick={handleNextStep}>
        次へ
        <HiOutlineArrowRight aria-hidden />
      </button>
    </div>
  );
};
