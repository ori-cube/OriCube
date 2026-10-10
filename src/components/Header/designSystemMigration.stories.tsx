import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { OrigamiListPageProvider, useOrigamiListPage } from "@/app/_provider";
import type { Model } from "@/types/model";
import { NameAndColorControlPanel } from "@/components/OrigamiPost/NameAndColorControlPanel";
import { FoldMethodSelectPanel } from "@/components/OrigamiPost/FoldMethodControlPanel/FoldMethodSelectPanel";
import { FoldStepSegmentedControl } from "@/components/OrigamiPost/FoldMethodControlPanel/ui/FoldStepSegmentedControl";
import { HeaderPresenter } from "./presenter";

const models: Model[] = [
  { id: "crane", name: "つる", searchKeyword: ["つる"], color: "#ed7070", imageUrl: "", procedure: {} },
  { id: "boat", name: "ふね", searchKeyword: ["ふね"], color: "#ed7070", imageUrl: "", procedure: {} },
];
function SearchResults() {
  const { filteredOrigamiList } = useOrigamiListPage();
  return <p>作品：{filteredOrigamiList.map(model => model.name).join("、")}</p>;
}
function MigrationExample() {
  const [name, setName] = useState("つる");
  const [color, setColor] = useState("#ed7070");
  const [angle, setAngle] = useState(180);
  const [description, setDescription] = useState("半分に折る");
  const [step, setStep] = useState(1);
  const [front, setFront] = useState(true);
  return <OrigamiListPageProvider origamiData={models}>
    <HeaderPresenter enableSearch origamiData={models} />
    <main style={{ maxWidth: 760, margin: "100px auto 32px", padding: "0 16px", display: "grid", gap: 24 }}>
      <SearchResults />
      <NameAndColorControlPanel name={name} handleNameChange={setName} color={color} handleColorChange={event => setColor(event.target.value)} />
      <FoldMethodSelectPanel handlePrevStep={fn()} handleNextStep={fn()} handleFoldFrontSide={() => setFront(true)} handleFoldBackSide={() => setFront(false)} foldAngle={angle} handleFoldAngleChange={setAngle} totalNumber={1} currentNumber={1} isFoldFrontSide={front} handleRegisterOrigami={fn()} origamiDescription={description} handleOrigamiDescriptionChange={setDescription} />
      <FoldStepSegmentedControl procedureLength={8} currentStep={step} handleChangeStep={setStep} />
    </main>
  </OrigamiListPageProvider>;
}
const meta = { title: "Components/DesignSystemMigration", component: MigrationExample, parameters: { layout: "fullscreen" } } satisfies Meta<typeof MigrationExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LegacyControls: Story = {};
