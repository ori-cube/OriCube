"use client";

import { TextField, Box, Flex } from "@radix-ui/themes";
import {
  HiMagnifyingGlass,
  HiMiniXMark,
  HiOutlineArrowLeft,
} from "react-icons/hi2";
import style from "./index.module.scss";
import { createContext, useContext, useState } from "react";
import { Zen_Maru_Gothic } from "next/font/google";
import { IconButton } from "../ui/IconButton";

const ZenMaruFont = Zen_Maru_Gothic({
  weight: "500",
  subsets: ["latin"],
});

export type SearchBoxProps = {
  handleSearch: (keyword: string) => void;
};

type SearchBoxContextProps = {
  searchKeyword: string;
  setSearchKeyword: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: (keyword: string) => void;
  handleClick: () => void;
};

const SearchBoxContext = createContext<SearchBoxContextProps>(
  {} as SearchBoxContextProps
);

export const SearchBoxPresenter: React.FC<SearchBoxProps> = ({
  handleSearch,
}) => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [openSpSearch, setOpenSpSearch] = useState(false);

  const handleClick = () => {
    setOpenSpSearch(!openSpSearch);
  };

  return (
    <SearchBoxContext.Provider
      value={{
        searchKeyword: searchKeyword,
        setSearchKeyword: setSearchKeyword,
        handleSearch: handleSearch,
        handleClick: handleClick,
      }}
    >
      <div className={style.search_box}>
        <InputField />
      </div>

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
        <div className={style.search_box_sp}>
          <IconButton
            Icon={HiMagnifyingGlass}
            handleClick={() => handleClick()}
            disable={false}
          />
        </div>
      )}
    </SearchBoxContext.Provider>
  );
};

const InputField = () => {
  const { handleSearch, searchKeyword, setSearchKeyword } =
    useContext(SearchBoxContext);
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
