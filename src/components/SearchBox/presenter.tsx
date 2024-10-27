"use client";

import { TextField, IconButton, Box, Flex } from "@radix-ui/themes";
import {
  HiMagnifyingGlass,
  HiMiniXMark,
  HiOutlineArrowLeft,
} from "react-icons/hi2";
import style from "./presenter.module.scss";
import { useEffect, useState } from "react";

export type SearchBoxPresenterProps = {
  handleSearch: (keyword: string) => void;
};

export const SearchBoxPresenter: React.FC<SearchBoxPresenterProps> = ({
  handleSearch,
}) => {
  const hasVisited =
    typeof window !== "undefined" && !!localStorage.getItem("hasVisited");

  const [searchKeyword, setSearchKeyword] = useState("");
  const [openSpSearch, setOpenSpSearch] = useState(false);

  useEffect(() => {
    if (!hasVisited) localStorage.setItem("hasVisited", "true");
    else setSearchKeyword("");
  }, []);

  const handleClick = () => {
    setOpenSpSearch(!openSpSearch);
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
    <>
      <div className={style.search_box}>
        <Box maxWidth="400px">
          <TextField.Root
            placeholder="おりがみのなまえを入力してください 例：つる"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => onKeyDown(e.key)}
          >
            <TextField.Slot>
              <HiMagnifyingGlass height="26" width="26" />
            </TextField.Slot>
            {searchKeyword.length != 0 ? (
              <TextField.Slot pr="3">
                <IconButton size="1" variant="ghost">
                  <HiMiniXMark
                    height="14"
                    width="14"
                    onClick={() => resetSearchKeyword()}
                    color="#000"
                  />
                </IconButton>
              </TextField.Slot>
            ) : (
              <></>
            )}
          </TextField.Root>
        </Box>
      </div>

      {openSpSearch ? (
        <></>
      ) : (
        <button className={style.search_box_sp} onClick={() => handleClick()}>
          <HiMagnifyingGlass size={26} />
        </button>
      )}

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
            <HiOutlineArrowLeft
              size={24}
              onClick={() => {
                handleClick();
              }}
            />
            <Box width="90%">
              <TextField.Root
                placeholder="おりがみのなまえを入力してください 例：つる"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => onKeyDown(e.key)}
              >
                <TextField.Slot>
                  <HiMagnifyingGlass height="26" width="26" />
                </TextField.Slot>
                {searchKeyword.length != 0 ? (
                  <TextField.Slot pr="3">
                    <IconButton size="1" variant="ghost">
                      <HiMiniXMark
                        height="14"
                        width="14"
                        onClick={() => resetSearchKeyword()}
                        color="#000"
                      />
                    </IconButton>
                  </TextField.Slot>
                ) : (
                  <></>
                )}
              </TextField.Root>
            </Box>
          </Flex>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};
