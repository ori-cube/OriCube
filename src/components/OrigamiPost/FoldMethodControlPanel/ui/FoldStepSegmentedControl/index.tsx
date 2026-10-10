import { Pagination } from "@oricube/design-system";

type Props = { procedureLength: number; currentStep: number; handleChangeStep: (step: number) => void };

export function FoldStepSegmentedControl({ procedureLength, currentStep, handleChangeStep }: Props) {
  return <Pagination label="入力済みの折り手順" currentType="step" page={currentStep} totalPages={procedureLength} onChange={handleChangeStep} getPageLabel={(step) => `ステップ ${step}`} />;
}
