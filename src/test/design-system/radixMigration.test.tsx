import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchField } from "@oricube/design-system";
import { NameAndColorControlPanel } from "@/components/OrigamiPost/NameAndColorControlPanel";
import { FoldMethodSelectPanel } from "@/components/OrigamiPost/FoldMethodControlPanel/FoldMethodSelectPanel";
import { FoldStepSegmentedControl } from "@/components/OrigamiPost/FoldMethodControlPanel/ui/FoldStepSegmentedControl";
import { SearchBoxSp } from "@/components/Header/SearchBox/Sp";
import { InputField } from "@/components/Header/SearchBox/InputField";
import { OrigamiListPageProvider, useOrigamiListPage } from "@/app/_provider";
import type { Model } from "@/types/model";

vi.mock("next/font/google", () => ({ Zen_Maru_Gothic: () => ({ className: "font" }) }));

const origamiData: Model[] = [
  { id: "crane", name: "つる", searchKeyword: ["つる"], color: "#ff0000", imageUrl: "", procedure: {} },
  { id: "boat", name: "ふね", searchKeyword: ["ふね"], color: "#ff0000", imageUrl: "", procedure: {} },
];
function FilteredNames() {
  const { filteredOrigamiList } = useOrigamiListPage();
  return <output data-testid="results">{filteredOrigamiList.map(item => item.name).join(",")}</output>;
}

describe("Radix から共通部品への移行", () => {
  it("投稿名と色をラベルから入力できる", () => {
    const onName = vi.fn();
    const onColor = vi.fn();
    render(<NameAndColorControlPanel name="" color="#ff0000" handleNameChange={onName} handleColorChange={onColor} />);
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), { target: { value: "つる" } });
    expect(onName).toHaveBeenCalledWith("つる");
    fireEvent.change(screen.getByLabelText("色"), { target: { value: "#0000ff" } });
    expect(onColor).toHaveBeenCalled();
  });
  it("折る角度・説明・登録の操作を既存処理へ渡す", () => {
    const onAngle = vi.fn();
    const onDescription = vi.fn();
    const onRegister = vi.fn();
    render(<FoldMethodSelectPanel handlePrevStep={vi.fn()} handleNextStep={vi.fn()} handleFoldFrontSide={vi.fn()} handleFoldBackSide={vi.fn()} foldAngle={180} handleFoldAngleChange={onAngle} totalNumber={1} currentNumber={1} isFoldFrontSide handleRegisterOrigami={onRegister} origamiDescription="" handleOrigamiDescriptionChange={onDescription} />);
    fireEvent.keyDown(screen.getByRole("slider", { name: "折る角度（度）" }), { key: "ArrowLeft" });
    expect(onAngle).toHaveBeenCalledWith(179);
    fireEvent.change(screen.getByRole("textbox", { name: "折り方の説明" }), { target: { value: "半分に折る" } });
    expect(onDescription).toHaveBeenCalledWith("半分に折る");
    fireEvent.click(screen.getByRole("button", { name: "折り紙を登録" }));
    expect(onRegister).toHaveBeenCalledOnce();
  });
  it("入力した手順を番号で選択し、前後に移動できる", () => {
    const onChange = vi.fn();
    render(<FoldStepSegmentedControl procedureLength={4} currentStep={1} handleChangeStep={onChange} />);
    expect(screen.getByRole("button", { name: "ステップ 1" })).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "ステップ 4" }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });
  it("検索の入力とクリアで表示される折り紙が変わる", () => {
    render(<OrigamiListPageProvider origamiData={origamiData}><InputField origamiData={origamiData} /><FilteredNames /></OrigamiListPageProvider>);
    fireEvent.change(screen.getByRole("searchbox", { name: "折り紙を検索" }), { target: { value: "つる" } });
    expect(screen.getByTestId("results")).toHaveTextContent(/^つる$/);
    fireEvent.click(screen.getByRole("button", { name: "検索をクリア" }));
    expect(screen.getByTestId("results")).toHaveTextContent("つる,ふね");
  });
  it("モバイル検索を開いたら入力へ、閉じたら開くボタンへフォーカスを移す", () => {
    render(<SearchBoxSp><SearchField label="折り紙を検索" hideLabel /></SearchBoxSp>);
    fireEvent.click(screen.getByRole("button", { name: "検索を開く" }));
    expect(screen.getByRole("searchbox", { name: "折り紙を検索" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "検索を閉じる" }));
    expect(screen.getByRole("button", { name: "検索を開く" })).toHaveFocus();
  });
});
