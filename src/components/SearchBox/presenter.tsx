"use client";

import { TextField } from "@radix-ui/themes";
import { HiMagnifyingGlass } from "react-icons/hi2";
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
  return (
    <>
      <div className={style.search_box}>
        <TextField.Root
          placeholder="おりがみのなまえを入力してください 例：よっと"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => onKeyDown(e.key)}
        >
          <TextField.Slot>
            <HiMagnifyingGlass height="26" width="26" />
          </TextField.Slot>
        </TextField.Root>
      </div>

      <button className={style.search_box_sp} onClick={() => handleClick()}>
        <HiMagnifyingGlass size={26} />
      </button>
    </>
  );
};
