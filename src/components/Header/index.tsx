import { HeaderPresenter } from "./presenter";

export const Header: React.FC<{ enableSearch: boolean }> = ({
  enableSearch,
}: {
  enableSearch: boolean;
}) => {
  return <HeaderPresenter enableSearch={enableSearch} />;
};
