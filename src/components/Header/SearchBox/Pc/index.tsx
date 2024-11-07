import style from "./index.module.scss";

export const SearchBoxPc: React.FC<{ children?: React.ReactNode }> = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  return <div className={style.search_box}>{children}</div>;
};
