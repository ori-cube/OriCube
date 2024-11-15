import styles from "./index.module.scss";
import { HiOutlineArrowRight } from "react-icons/hi2";

type Props = {};

export const AxisSelectPanel: React.FC<Props> = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>折り線を選択</h2>
      <div>説明</div>
      <button className={styles.button}>
        次へ
        <HiOutlineArrowRight />
      </button>
    </div>
  );
};
