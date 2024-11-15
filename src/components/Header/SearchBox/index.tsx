"use client";
import { SearchBoxPc } from "./Pc";
import { SearchBoxSp } from "./Sp";
import { InputField } from "./InputField";
import { Model } from "@/types/model";

export const SearchBoxPresenter: React.FC<{ origamiData: Model[] }> = ({
  origamiData,
}: {
  origamiData: Model[];
}) => {
  return (
    <>
      <SearchBoxPc>
        <InputField origamiData={origamiData} />
      </SearchBoxPc>
      <SearchBoxSp>
        <InputField origamiData={origamiData} />
      </SearchBoxSp>
    </>
  );
};
