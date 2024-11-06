"use client";
import origamiData from "@/models/origamiList.json";
import { createContext, useState, useContext } from "react";
import { ListItemProps } from "@/components/OrigamiList/OrigamiListItem";

type OrigamiListPageProps = {
  filteredOrigamiList: ListItemProps[];
  setFilteredOrigamiList: React.Dispatch<React.SetStateAction<ListItemProps[]>>;
  searchKeyword: string;
  setSearchKeyword: React.Dispatch<React.SetStateAction<string>>;
};

const OrigamiListPageContext = createContext<OrigamiListPageProps>(
  {} as OrigamiListPageProps
);

export const OrigamiListPageProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }: { children: React.ReactNode }) => {
  const origamiList = origamiData.map((item) => {
    const { ...rest } = item;
    return rest;
  });

  const [filteredOrigamiList, setFilteredOrigamiList] =
    useState<ListItemProps[]>(origamiList);
  const [searchKeyword, setSearchKeyword] = useState("");

  return (
    <OrigamiListPageContext.Provider
      value={{
        filteredOrigamiList: filteredOrigamiList,
        setFilteredOrigamiList: setFilteredOrigamiList,
        searchKeyword: searchKeyword,
        setSearchKeyword: setSearchKeyword,
      }}
    >
      {children}
    </OrigamiListPageContext.Provider>
  );
};

export function useOrigamiListPage() {
  const context = useContext(OrigamiListPageContext);
  if (!context) {
    throw new Error(
      "useOrigamiListPage must be used within a OrigamiListPageProvider"
    );
  }
  return context;
}
