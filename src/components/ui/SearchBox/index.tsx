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
import { SearchBoxProvider, SearchBoxContext } from "./provider";

const ZenMaruFont = Zen_Maru_Gothic({
  weight: "500",
  subsets: ["latin"],
});

export type SearchBoxProps = {
  handleSearch: (keyword: string) => void;
};

export const SearchBoxPresenter: React.FC<SearchBoxProps> = ({
  handleSearch,
}) => {
  return (
    <SearchBoxProvider>
      <SearchBoxPc handleSearch={handleSearch} />
      <SearchBoxSp handleSearch={handleSearch} />
    </SearchBoxProvider>
  );
};

const SearchBoxPc = ({
  handleSearch,
}: {
  handleSearch: (word: string) => void;
}) => {
  return (
    <div className={style.search_box}>
      <InputField handleSearch={handleSearch} />
    </div>
  );
};

const SearchBoxSp = ({
  handleSearch,
}: {
  handleSearch: (word: string) => void;
}) => {
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
            <InputField handleSearch={handleSearch} />
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

const InputField: React.FC<{ handleSearch: (word: string) => void }> = ({
  handleSearch,
}: {
  handleSearch: (word: string) => void;
}) => {
  const { searchKeyword, setSearchKeyword } = useContext(SearchBoxContext);
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
