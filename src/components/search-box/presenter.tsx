"use client"

import { TextField } from "@radix-ui/themes";
import { HiMagnifyingGlass } from "react-icons/hi2";
import style from "./presenter.module.scss"

export const SearchBoxPresenter: React.FC = () => {
  return(
    <>
      <div className={style.search_box}>
        <TextField.Root placeholder="折り紙名を入力してください">
          <TextField.Slot>
            <HiMagnifyingGlass height="26" width="26" />
          </TextField.Slot>
        </TextField.Root>
      </div>
      <div className={style.search_box_sp} onClick={() => {console.log("clicked")}}>
        <HiMagnifyingGlass size={26}/>
      </div>
    </>
  )
}