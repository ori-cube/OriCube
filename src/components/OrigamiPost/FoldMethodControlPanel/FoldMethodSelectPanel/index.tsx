import styles from "./index.module.scss";
import { NextStepButton } from "../ui/NextStepButton";
import { PrevStepButton } from "../ui/PrevStepButton";
import { FoldButton } from "../ui/FoldButton";
import { Slider, TextArea, Button } from "@radix-ui/themes";
import React, { useState } from "react";
import { ShootingModal } from "../ShootingModal";
import { Board, RotateAxis } from "@/types/model";

type Props = {
  handlePrevStep: () => void;
  handleFoldFrontSide: () => void;
  handleFoldBackSide: () => void;
  foldAngle: number;
  handleFoldAngleChange: (angle: number) => void;
  handleNextStep: () => void;
  totalNumber: number;
  currentNumber: number;
  isFoldFrontSide: boolean;
  handleRegisterOrigami: () => void;
  origamiDescription: string;
  handleOrigamiDescriptionChange: (description: string) => void;
  origamiColor: string;
  foldBoards: Board[];
  notFoldBoards: Board[];
  // Current folding state parameters
  rotateAxis: RotateAxis;
  numberOfMoveBoards: number;
  isFoldingDirectionFront: boolean;
  isMoveBoardsRight: boolean;
};

export const FoldMethodSelectPanel: React.FC<Props> = ({
  handlePrevStep,
  handleNextStep,
  handleFoldFrontSide,
  handleFoldBackSide,
  foldAngle,
  handleFoldAngleChange,
  totalNumber,
  currentNumber,
  isFoldFrontSide,
  handleRegisterOrigami,
  origamiDescription,
  handleOrigamiDescriptionChange,
  origamiColor,
  foldBoards,
  notFoldBoards,
  rotateAxis,
  numberOfMoveBoards,
  isFoldingDirectionFront,
  isMoveBoardsRight,
}) => {
  const [isShootingModalOpen, setIsShootingModalOpen] = useState(false);

  const handleOpenShootingModal = () => {
    setIsShootingModalOpen(true);
  };

  const handleCloseShootingModal = () => {
    setIsShootingModalOpen(false);
  };
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>折り方を選択(3/3)</h2>
        <div className={styles.foldButtons}>
          <FoldButton
            handleClick={handleFoldFrontSide}
            currentStep={isFoldFrontSide ? currentNumber : 0}
            totalSteps={totalNumber}
            isFrontSide={true}
          />
          <FoldButton
            handleClick={handleFoldBackSide}
            currentStep={isFoldFrontSide ? 0 : currentNumber}
            totalSteps={totalNumber}
            isFrontSide={false}
          />
        </div>
        <section className={styles.h3Section}>
          <h3 className={styles.h3}>折る角度</h3>
          <div className={styles.sliderWrapper}>
            0
            <Slider
              className={styles.slider}
              min={0}
              max={180}
              size="3"
              onValueChange={(value) => {
                handleFoldAngleChange(value[0]);
              }}
              defaultValue={[180]}
              value={[foldAngle]}
            />
            180
          </div>
        </section>
        <section className={styles.h3Section}>
          <h3 className={styles.h3}>折り方の説明</h3>
          <TextArea
            placeholder="半分に折る"
            className={styles.textArea}
            value={origamiDescription}
            onChange={(e) => handleOrigamiDescriptionChange(e.target.value)}
          />
        </section>
        <div className={styles.stepButtons}>
          <PrevStepButton handlePrevStep={handlePrevStep} />
          <NextStepButton handleNextStep={handleNextStep} />
        </div>
      </div>
      <Button
        onClick={handleOpenShootingModal}
        className={styles.registerButton}
        size="3"
      >
        折り紙を登録
      </Button>
      {isShootingModalOpen && (
        <ShootingModal
          onClose={handleCloseShootingModal}
          handleRegisterOrigami={handleRegisterOrigami}
          origamiColor={origamiColor}
          foldBoards={foldBoards}
          notFoldBoards={notFoldBoards}
          foldingAngle={foldAngle}
          rotateAxis={rotateAxis}
          numberOfMoveBoards={numberOfMoveBoards}
          isFoldingDirectionFront={isFoldingDirectionFront}
          isMoveBoardsRight={isMoveBoardsRight}
        />
      )}
    </div>
  );
};
