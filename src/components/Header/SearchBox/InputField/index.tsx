import { TextField, Box } from "@radix-ui/themes";
import { HiMagnifyingGlass, HiMiniXMark } from "react-icons/hi2";
import { Zen_Maru_Gothic } from "next/font/google";
import { ButtonSizeProp } from "@/types/button";
import { IconButton } from "@/components/ui/IconButton";
import { useOrigamiListPage } from "@/app/_provider";
import { Model } from "@/types/model";
import { useEffect } from "react";
import styles from "./index.module.scss";

const ZenMaruFont = Zen_Maru_Gothic({
  weight: "500",
  subsets: ["latin"],
});

export const InputField: React.FC<{ origamiData: Model[] }> = ({
  origamiData,
}: {
  origamiData: Model[];
}) => {
  const { searchKeyword, setSearchKeyword, setFilteredOrigamiList } =
    useOrigamiListPage();

  const handleSearch = (searchKeyword: string) => {
    // 検索キーワードでフィルタリング
    const newFilteredOrigamiList = origamiData.filter((item) =>
      item.searchKeyword?.some((keyword: string) =>
        keyword.includes(searchKeyword)
      )
    );

    // searchKeywordを除いた結果を設定
    const newItems = newFilteredOrigamiList.map((item) => {
      const { ...rest } = item;
      return rest;
    });
    setFilteredOrigamiList(newItems); // フィルタリング結果を更新
  };

  useEffect(() => {
    handleSearch(searchKeyword);
  }, [searchKeyword]);

  const resetSearchKeyword = () => {
    setSearchKeyword("");
    handleSearch("");
  };
  return (
    <Box width="90%">
      <TextField.Root
        placeholder="おりがみのなまえを入力してください 例：つる"
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        className={`${ZenMaruFont.className} ${styles.text_field}`}
      >
        <TextField.Slot>
          <HiMagnifyingGlass size={18} />
        </TextField.Slot>
        {searchKeyword !== "" ? (
          <TextField.Slot pr="3">
            <IconButton
              Icon={HiMiniXMark}
              handleClick={() => resetSearchKeyword()}
              disable={false}
              size={ButtonSizeProp.medium}
            />
          </TextField.Slot>
        ) : (
          <></>
        )}
      </TextField.Root>
    </Box>
  );
};
