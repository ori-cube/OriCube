"use client";
import { SearchBoxPc } from "./Pc";
import { SearchBoxSp } from "./Sp";
import { InputField } from "./InputField";

export const SearchBoxPresenter: React.FC = () => {
  return (
    <>
      <SearchBoxPc>
        <InputField />
      </SearchBoxPc>
      <SearchBoxSp>
        <InputField />
      </SearchBoxSp>
    </>
  );
};
