"use client";

import { TextField, IconButton, Box } from "@radix-ui/themes";
import { HiMagnifyingGlass, HiMiniXMark } from "react-icons/hi2";
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

  useEffect(() => {
    if (!hasVisited) localStorage.setItem("hasVisited", "true");
    else setSearchKeyword("");
  }, []);

  const handleClick = () => {
    if (searchKeyword === "") return;
    handleSearch(searchKeyword);
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

      <button className={style.search_box_sp} onClick={() => handleClick()}>
        <HiMagnifyingGlass size={26} />
      </button>
    </>
  );
};
