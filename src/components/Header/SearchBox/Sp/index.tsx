import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconButton } from "@oricube/design-system";
import style from "./index.module.scss";

export function SearchBoxSp({ children }: { children?: ReactNode }) {
  const [isOpenSpSearch, setIsOpenSpSearch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasOpened = useRef(false);
  useEffect(() => {
    if (isOpenSpSearch) {
      hasOpened.current = true;
      containerRef.current?.querySelector("input")?.focus();
    } else if (hasOpened.current) {
      containerRef.current?.querySelector("button")?.focus();
    }
  }, [isOpenSpSearch]);
  return <div ref={containerRef} className={style.search_box_sp}>
    {isOpenSpSearch ? <div className={style.container}>
      <div className={style.container_flex}>
        <IconButton icon="PreviousIcon" label="検索を閉じる" onPress={() => setIsOpenSpSearch(false)} />
        {children}
      </div>
    </div> : <div className={style.search_box_sp_icon}>
      <IconButton icon="SearchIcon" label="検索を開く" onPress={() => setIsOpenSpSearch(true)} />
    </div>}
  </div>;
}
