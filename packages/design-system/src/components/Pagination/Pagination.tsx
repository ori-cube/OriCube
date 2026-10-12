"use client";

import { Button } from "react-aria-components";
import { IconButton } from "../IconButton";
import styles from "./Pagination.module.css";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
  currentType?: "page" | "step";
  getPageLabel?: (page: number) => string;
}

export function Pagination({ page, totalPages, onChange, label = "ページ切り替え", currentType = "page", getPageLabel = (value) => `${value}ページ目` }: PaginationProps) {
  if (totalPages < 1) return null;
  const first = Math.max(1, Math.min(page - 1, totalPages - 2));
  const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => first + index);
  const items = Array.from(new Set([1, ...pages, totalPages])).sort((a, b) => a - b);
  return (
    <nav aria-label={label} className={styles.pagination}>
      <IconButton icon="PreviousIcon" label="前へ" isDisabled={page <= 1} onPress={() => onChange(page - 1)} />
      <span className={styles.counter}>{page} / {totalPages}</span>
      <div className={styles.pages}>
        {items.map((value, index) => <div className={styles.item} key={value}>
          {index > 0 && value - items[index - 1] > 1 && <span className={styles.gap} aria-hidden>…</span>}
          <Button className={styles.page} aria-current={page === value ? currentType : undefined} aria-label={getPageLabel(value)} onPress={() => onChange(value)}>{value}</Button>
        </div>)}
      </div>
      <IconButton icon="NextIcon" label="次へ" isDisabled={page >= totalPages} onPress={() => onChange(page + 1)} />
    </nav>
  );
}
