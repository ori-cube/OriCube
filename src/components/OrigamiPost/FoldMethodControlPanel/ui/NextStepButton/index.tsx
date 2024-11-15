import styles from "./index.module.scss";
import { HiOutlineArrowRight } from "react-icons/hi2";

type Props = {
  handleNextStep: () => void;
};

export const NextStepButton: React.FC<Props> = ({ handleNextStep }) => {
  return (
    <button className={styles.button} onClick={handleNextStep}>
      次へ
      <HiOutlineArrowRight aria-hidden />
    </button>
  );
};
