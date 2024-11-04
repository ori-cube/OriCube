import { createContext, useState } from "react";

export type SearchBoxContextProps = {
  searchKeyword: string;
  setSearchKeyword: React.Dispatch<React.SetStateAction<string>>;
};

export const SearchBoxContext = createContext<SearchBoxContextProps>(
  {} as SearchBoxContextProps
);

export const SearchBoxProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [searchKeyword, setSearchKeyword] = useState("");

  return (
    <SearchBoxContext.Provider
      value={{
        searchKeyword: searchKeyword,
        setSearchKeyword: setSearchKeyword,
      }}
    >
      {children}
    </SearchBoxContext.Provider>
  );
};
