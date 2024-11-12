"use client";
import { HeaderPresenter } from "./presenter";
import { Model } from "@/types/model";
import { useOrigamiListPage } from "@/app/_provider";

export type HeaderProps =
  | { enableSearch: true; origamiData: Model[] } // enableSearch が true の場合
  | { enableSearch: false; origamiData?: undefined }; // enableSearch が false の場合

export const Header: React.FC<HeaderProps> = ({
  enableSearch,
  origamiData,
}: HeaderProps) => {
  const { setSearchKeyword } = useOrigamiListPage();
  const onIconClick = () => {
    setSearchKeyword("");
  };
  return (
    <>
      {enableSearch ? (
        <HeaderPresenter
          enableSearch={enableSearch}
          origamiData={origamiData}
          onIconClick={onIconClick}
        />
      ) : (
        <HeaderPresenter
          enableSearch={enableSearch}
          onIconClick={onIconClick}
        />
      )}
    </>
  );
};
