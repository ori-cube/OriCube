"use client";
import styles from "./page.module.scss";
import { OrigamiList } from "@/components/OrigamiList";
import { useState } from "react";
import { ListItemProps } from "@/components/OrigamiListItem";
import origamiData from "../models/origamiList.json";
import { SearchBoxPresenter } from "@/components/SearchBox/presenter";
import { Header } from "@/components/Header";

export default function Home() {
  const items = origamiData;
  const [filteredOrigamiList, setfilteredOrigamiList] = useState<
    ListItemProps[] | null
  >(null);
  const origamiList = items.map((item) => {
    const { ...rest } = item;
    return rest;
  });

  const handleSearch = (searchKeyword: string) => {
    // 検索キーワードでフィルタリング
    const newfilteredOrigamiList = items.filter((item) =>
      item.searchKeyword.some((keyword: string) =>
        keyword.includes(searchKeyword)
      )
    );

    // searchKeywordを除いた結果を設定
    const newItems = newfilteredOrigamiList.map((item) => {
      const { ...rest } = item;
      return rest;
    });
    setfilteredOrigamiList(newItems); // フィルタリング結果を更新
  };
  return (
    <>
      <Header>
        <SearchBoxPresenter handleSearch={handleSearch} />
      </Header>
      <main className={styles.main}>
        {filteredOrigamiList ? (
          <OrigamiList origamiList={filteredOrigamiList} />
        ) : (
          <OrigamiList origamiList={origamiList} />
        )}
      </main>
    </>
  );
}
