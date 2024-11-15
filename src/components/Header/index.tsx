import { HeaderPresenter } from "./presenter";
import { Model } from "@/types/model";

export type HeaderProps =
  | { enableSearch: true; origamiData: Model[] } // enableSearch が true の場合
  | { enableSearch: false; origamiData?: undefined }; // enableSearch が false の場合

export const Header: React.FC<HeaderProps> = ({
  enableSearch,
  origamiData,
}: HeaderProps) => {
  return (
    <>
      {enableSearch ? (
        <HeaderPresenter
          enableSearch={enableSearch}
          origamiData={origamiData}
        />
      ) : (
        <HeaderPresenter enableSearch={enableSearch} />
      )}
    </>
  );
};
