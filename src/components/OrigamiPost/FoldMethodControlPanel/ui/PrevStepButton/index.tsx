import styles from "./index.module.scss";
import { HiOutlineArrowLeft } from "react-icons/hi2";

type Props = {
  handlePrevStep: () => void;
};

export const PrevStepButton: React.FC<Props> = ({ handlePrevStep }) => {
  return (
    <button className={styles.button} onClick={handlePrevStep}>
      <HiOutlineArrowLeft aria-hidden />
      戻る
    </button>
  );
};
