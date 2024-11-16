import styles from "./index.module.scss";
import { PiArrowArcRightBold } from "react-icons/pi";

type Props = {
  handleClick: () => void;
  currentStep: number;
  totalSteps: number;
  isFrontSide: boolean;
  isFoldFrontSide: boolean;
};

export const FoldButton: React.FC<Props> = ({
  handleClick,
  currentStep,
  totalSteps,
  isFrontSide,
  isFoldFrontSide,
}) => {
  return (
    <button
      className={`${styles.button} ${currentStep > 0 && styles.active}`}
      onClick={handleClick}
    >
      {isFrontSide ? (
        <>
          <PiArrowArcRightBold aria-hidden size={32} />
          手前に折る
        </>
      ) : (
        <>
          <PiArrowArcRightBold
            aria-hidden
            size={32}
            className={styles.backIcon}
          />
          奥に折る
        </>
      )}
      {totalSteps <= 1 || currentStep === 0 ? null : (
        <div className={styles.steps}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={index < currentStep ? styles.active : styles.step}
            />
          ))}
        </div>
      )}
    </button>
  );
};
