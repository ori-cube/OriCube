import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, Pagination, SearchField } from "@oricube/design-system";
import { apiClient, fetchOrigamiList, type OrigamiSummary } from "../../apiClient";
import { OrigamiCover } from "../../components/OrigamiCover";
import styles from "./OrigamiList.module.css";

/** 入力が止まってから検索するまでの時間 */
export const SEARCH_DELAY_MS = 300;

const parsePage = (value: string | null) => {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page >= 1 ? page : 1;
};

function OrigamiCard({ origami }: { origami: OrigamiSummary }) {
  return <li className={styles.item}>
    <Link to={`/view/${origami.id}`} className={styles.card}>
      <OrigamiCover thumbnailUrl={origami.thumbnailUrl} thumbnail={origami.thumbnail} color={origami.color} />
      <div className={styles.body}>
        <h2 className={styles.name}>{origami.name}</h2>
        <p className={styles.steps}>{origami.stepCount > 0 ? `${origami.stepCount}ステップ` : "折り手順なし"}</p>
        {origami.description && <p className={styles.description}>{origami.description}</p>}
      </div>
    </Link>
  </li>;
}

/**
 * 作品の一覧
 *
 * @description
 * 検索語とページは URL（?q=&page=）に持ち、共有・戻る操作で同じ一覧に戻れるようにする
 */
export function OrigamiList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q")?.trim() ?? "";
  const page = parsePage(searchParams.get("page"));
  const [input, setInput] = useState(q);
  const query = useQuery({
    queryKey: ["origami-list", q, page],
    queryFn: () => fetchOrigamiList(apiClient, { q, page }),
    placeholderData: keepPreviousData,
  });

  const search = (value: string) => {
    const keyword = value.trim();
    if (keyword === q) return;
    setSearchParams(keyword ? { q: keyword } : {}, { replace: true });
  };
  // 戻る操作などで URL が変わったときは入力欄をそろえる
  useEffect(() => setInput((current) => current.trim() === q ? current : q), [q]);
  useEffect(() => {
    if (input.trim() === q) return;
    const timer = setTimeout(() => search(input), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  });
  const changePage = (next: number) => {
    setSearchParams({ ...(q ? { q } : {}), ...(next > 1 ? { page: String(next) } : {}) });
    window.scrollTo({ top: 0 });
  };

  const data = query.data;
  return <main id="origami-viewer" className={styles.page}>
    <div className={styles.header}>
      <h1 className={styles.title}>折り紙を見る</h1>
      <Link to="/post" className={styles.create}>折り紙を作る</Link>
    </div>
    <div role="search" className={styles.search}>
      <SearchField label="作品を検索" hideLabel placeholder="作品名・説明で検索" value={input} onChange={setInput} onSubmit={search} onClear={() => search("")} />
    </div>
    {query.isPending ? <p className={styles.message} role="status">作品を読み込んでいます…</p>
      : query.isError ? <div className={styles.message}>
        <p role="alert">作品を読み込めませんでした。もう一度読み込んでください。</p>
        <Button text="再試行" onClick={() => void query.refetch()} />
      </div>
      : <>
        <p className={styles.count} role="status">{q ? `「${q}」の検索結果 ${data?.total ?? 0}件` : `${data?.total ?? 0}件の作品`}</p>
        {data?.items.length ? <ul className={styles.list} aria-label="作品" aria-busy={query.isPlaceholderData || undefined}>
          {data.items.map((origami) => <OrigamiCard key={origami.id} origami={origami} />)}
        </ul> : <p className={styles.message}>{data?.total ? "このページには作品がありません。" : q ? "条件に一致する作品はありません。別の言葉で検索してください。" : "まだ作品がありません。"}</p>}
        {data && data.totalPages > 1 && <Pagination label="一覧のページ" page={Math.min(page, data.totalPages)} totalPages={data.totalPages} onChange={changePage} />}
      </>}
  </main>;
}
