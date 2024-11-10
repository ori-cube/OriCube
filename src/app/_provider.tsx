"use client";
import { createContext, useState, useContext, useEffect } from "react";
import { Model } from "@/types/model";

type OrigamiListPageProps = {
  filteredOrigamiList: Model[];
  setFilteredOrigamiList: React.Dispatch<React.SetStateAction<Model[]>>;
  searchKeyword: string;
  setSearchKeyword: React.Dispatch<React.SetStateAction<string>>;
};

const OrigamiListPageContext = createContext<OrigamiListPageProps>(
  {} as OrigamiListPageProps
);

export const OrigamiListPageProvider: React.FC<{
  children: React.ReactNode;
  origamiData: Model[];
}> = ({
  children,
  origamiData,
}: {
  children: React.ReactNode;
  origamiData: Model[];
}) => {
  const origamiList = origamiData.map((item) => {
    const { ...rest } = item;
    return rest;
  });

  const [filteredOrigamiList, setFilteredOrigamiList] =
    useState<Model[]>(origamiList);
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
