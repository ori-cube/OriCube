'use client';
import { Header } from '@/components/header';
import styles from './page.module.scss';
import { OrigamiList } from '@/components/OrigamiList';
import { useState } from 'react';
import { SearchBoxPresenter } from '@/components/search-box/presenter';
import { ListItemProps } from '@/components/OrigamiListItem';
import origamiData from '../models/origamiList.json';

export default function Home() {
  const items = origamiData;
  const [filteredOrigamiList, setfilteredOrigamiList] = useState<
    ListItemProps[] | null
  >(null);
  const origamiList = items.map(({ searchKeyword, ...rest }) => rest);

  const handleSearch = (searchKeyword: string) => {
    console.log('searchKeyword:', searchKeyword); // 検索キーワードの確認

    // 検索キーワードが空の場合、全データを表示
    if (searchKeyword === '') {
      setfilteredOrigamiList(null);
      return;
    }

    // 検索キーワードでフィルタリング
    const newfilteredOrigamiList = items.filter((item) =>
      item.searchKeyword.some((keyword: string) =>
        keyword.includes(searchKeyword)
      )
    );

    // searchKeywordを除いた結果を設定
    const newItems = newfilteredOrigamiList.map(
      ({ searchKeyword, ...rest }) => rest
    );
    setfilteredOrigamiList(newItems); // フィルタリング結果を更新
  };
  return (
    <>
      <Header>
        <SearchBoxPresenter handleSearch={handleSearch} />
      </Header>
      <main className={styles.main}>
        {filteredOrigamiList && filteredOrigamiList.length > 0 ? (
          <OrigamiList origamiList={filteredOrigamiList} />
        ) : (
          <OrigamiList origamiList={origamiList} />
        )}
      </main>
    </>
  );
}
