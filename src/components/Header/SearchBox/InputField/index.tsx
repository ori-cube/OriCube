import { SearchField } from "@oricube/design-system";
import { Zen_Maru_Gothic } from "next/font/google";
import { useOrigamiListPage } from "@/app/_provider";
import type { Model } from "@/types/model";
import { useEffect } from "react";
import styles from "./index.module.scss";

const ZenMaruFont = Zen_Maru_Gothic({ weight: "500", subsets: ["latin"] });

export function InputField({ origamiData }: { origamiData: Model[] }) {
  const { searchKeyword, setSearchKeyword, setFilteredOrigamiList } = useOrigamiListPage();
  useEffect(() => {
    setFilteredOrigamiList(origamiData.filter((item) => item.searchKeyword?.some((keyword) => keyword.includes(searchKeyword))));
  }, [searchKeyword, origamiData, setFilteredOrigamiList]);
  return <SearchField
    label="折り紙を検索"
    hideLabel
    placeholder="例：つる"
    value={searchKeyword}
    onChange={setSearchKeyword}
    className={`${ZenMaruFont.className} ${styles.text_field}`}
  />;
}
