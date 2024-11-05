"use client";
import styles from "./page.module.scss";
import { OrigamiList } from "@/components/OrigamiList";
import { createContext, useState } from "react";
import { ListItemProps } from "@/components/OrigamiList/OrigamiListItem";
import { Header } from "@/components/Header";
import origamiData from "@/models/origamiList.json";

export type OrigamiListPageProps = {
  filteredOrigamiList: ListItemProps[];
  setFilteredOrigamiList: React.Dispatch<React.SetStateAction<ListItemProps[]>>;
  searchKeyword: string;
  setSearchKeyword: React.Dispatch<React.SetStateAction<string>>;
};

export const OrigamiListPageContext = createContext<OrigamiListPageProps>(
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

export default function Home() {
  return (
    <OrigamiListPageProvider>
      <Header enableSearch={true} />
      <main className={styles.main}>
        <OrigamiList />
      </main>
    </OrigamiListPageProvider>
  );
}
