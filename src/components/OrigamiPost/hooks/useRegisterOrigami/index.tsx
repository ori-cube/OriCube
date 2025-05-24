import { Model } from "@/types/model";
import { decideNewProcedure } from "../../logics/decideNewProcedure";
import { insertData } from "@/utils/upload-data";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import * as THREE from "three";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtomValue } from "jotai";

type UseRegisterOrigami = (props: {
  origamiName: string;
  origamiColor: string;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
}) => {
  handleDecideProcedure: () => Model | undefined;
  handleRegisterOrigami: () => void;
};

export const useRegisterOrigami: UseRegisterOrigami = ({
  origamiName,
  origamiColor,
  sceneRef,
  cameraRef,
  rendererRef,
}) => {
  const currentStep = useAtomValue(currentStepAtom);
  const procedureIndex = currentStep.procedureIndex;
  const { data: session } = useSession();
  const inputStepObject = useAtomValue(inputStepObjectAtom);
  const step = inputStepObject[procedureIndex.toString()];

  const fixBoards = step.fixBoards;
  const moveBoards = step.moveBoards;
  const numberOfMoveBoards = step.numberOfMoveBoards;
  const rotateAxis = step.rotateAxis;
  const isFoldingDirectionFront = step.isFoldingDirectionFront;
  const isMoveBoardsRight = step.isMoveBoardsRight;
  const description = step.description;

  const handleDecideProcedure = () => {
    //折り面、折り線がない場合は登録できない。
    if (!moveBoards.length) return;
    if (!rotateAxis.length) return;

    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    // ここはatomから取得した方がいいのでは？
    const { newProcedure } = decideNewProcedure({
      fixBoards,
      moveBoards,
      numberOfMoveBoards,
      rotateAxis,
      isFoldingDirectionFront,
      isMoveBoardsRight,
      description,
    });

    // TODO: ProcedureとinputStepObjectの整合性を取る
    // 現在はnewProcedureだけが入っているが、それまでの手順は入っていない
    const procedures = { [procedureIndex]: newProcedure };
    if (!procedures) {
      console.error("Procedure is null.");
      return;
    }

    // idとimageUrlはDBから取得するため、空文字を設定
    const model: Model = {
      id: "",
      name: origamiName,
      color: origamiColor,
      imageUrl: "",
      procedure: procedures,
    };

    return model;
  };

  const handleRegisterOrigami = () => {
    // タイトル、折り紙モデルがない場合は登録できない。
    if (!origamiName.length) {
      console.error("Origami name is required.");
      return;
    }
    const model = handleDecideProcedure();
    if (!model) {
      console.error("Failed to decide procedure.");
      return;
    }

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) {
      console.error("Failed to register origami.");
      return;
    }

    renderer.render(scene, camera);

    renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "model.png", { type: "image/png" });
      //   setPopup({ message: "データ送信中です", type: "info" });
      insertData(file, session, model).then(() => {
        // setPopup({ message: "データの挿入に成功しました！", type: "success" });
        // setTimeout(() => {
        //   redirect("/");
        // }, 1500);
        redirect("/");
      });
    });
  };

  return {
    handleRegisterOrigami,
    handleDecideProcedure,
  };
};
