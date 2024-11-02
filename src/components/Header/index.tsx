import { HeaderPresenter } from "./presenter";

interface Props {
  children?: React.ReactNode;
}

export const Header: React.FC<Props> = ({ children }: Props) => {
  return <HeaderPresenter title="oricube">{children}</HeaderPresenter>;
};
