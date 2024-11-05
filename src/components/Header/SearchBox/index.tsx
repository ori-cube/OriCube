"use client";

import { TextField, Box, Flex } from "@radix-ui/themes";
import {
  HiMagnifyingGlass,
  HiMiniXMark,
  HiOutlineArrowLeft,
} from "react-icons/hi2";
import style from "./index.module.scss";
import { useContext, useState } from "react";
import { Zen_Maru_Gothic } from "next/font/google";
import { IconButton } from "@/components/ui/IconButton";
import { OrigamiListPageContext } from "@/app/page";
import origamiData from "@/models/origamiList.json";

const ZenMaruFont = Zen_Maru_Gothic({
  weight: "500",
  subsets: ["latin"],
});

export const SearchBoxPresenter: React.FC = () => {
  return (
    <>
      <SearchBoxPc />
      <SearchBoxSp />
    </>
  );
};

const SearchBoxPc: React.FC = () => {
  return (
    <div className={style.search_box}>
      <InputField />
    </div>
  );
};

const SearchBoxSp: React.FC = () => {
  const [openSpSearch, setOpenSpSearch] = useState(false);

  const handleClick = () => {
    setOpenSpSearch(!openSpSearch);
  };

  return (
    <div className={style.search_box_sp}>
      {openSpSearch ? (
        <div className={style.container}>
          <Flex
            align="center"
            width="100%"
            height="46px"
            justify="between"
            gap="4"
            className={style.container_flex}
          >
            <IconButton
              Icon={HiOutlineArrowLeft}
              handleClick={() => {
                handleClick();
              }}
              disable={false}
            />
            <InputField />
          </Flex>
        </div>
      ) : (
        <div className={style.search_box_sp_icon}>
          <IconButton
            Icon={HiMagnifyingGlass}
            handleClick={() => handleClick()}
            disable={false}
          />
        </div>
      )}
    </div>
  );
};

const InputField: React.FC = () => {
  const items = origamiData;

  const { searchKeyword, setSearchKeyword, setFilteredOrigamiList } =
    useContext(OrigamiListPageContext);

  const handleSearch = (searchKeyword: string) => {
    // 検索キーワードでフィルタリング
    const newFilteredOrigamiList = items.filter((item) =>
      item.searchKeyword.some((keyword: string) =>
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

  const onKeyDown = (key: string) => {
    switch (key) {
      case "Enter":
        handleSearch(searchKeyword);
        break;
      default:
        break;
    }
  };

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
        onKeyDown={(e) => onKeyDown(e.key)}
        className={ZenMaruFont.className}
      >
        <TextField.Slot>
          <HiMagnifyingGlass height="26" width="26" />
        </TextField.Slot>
        <TextField.Slot pr="3">
          <IconButton
            Icon={HiMiniXMark}
            handleClick={() => resetSearchKeyword()}
            disable={false}
            size={20}
          />
        </TextField.Slot>
      </TextField.Root>
    </Box>
  );
};
