import React from "react";
import { HiOutlineArrowLeft, HiOutlineArrowRight,HiDotsHorizontal } from "react-icons/hi";
import style from "./index.module.scss"

type Props = {
  currentPage: number;
  limit: number;
  count: number;
  changePage: React.Dispatch<React.SetStateAction<number>>;
};

export const Pagination = ({currentPage, limit, count, changePage }: Props) => {
  const PaginationPrev = () => {
    return <HiOutlineArrowLeft size={16} className={(currentPage != 0)?(style.icon):(style.icon_disable)} onClick={() => (changePage((i) => {return i-1}))}/>
  }
  const PaginationNext = () => {
    return <HiOutlineArrowRight size={16} className={(currentPage != count)?(style.icon):(style.icon_disable)} onClick={() => (changePage((i) => {return i+1}))}/>
  }
  const PaginationDots = () => {
    return <HiDotsHorizontal size={16} className={style.icon}/>
  }
  const PaginationNum = (i: number) => {
    return (
      <div className={(currentPage == i)?(style.box_active):(style.box)} onClick={() => {changePage(i)}}>{i}</div>
    )
  }
  const numList = []
  if (count <= limit){
    for(let i = 1; i <= count; i++){
      numList.push(i)
    }
  }else if(currentPage == 1 || currentPage == 2){
    numList.push(1)
    numList.push(2)
    numList.push(3)
    numList.push("...")
    numList.push(count)
  }else if(currentPage == count - 1 || currentPage == count) {
    numList.push(1)
    numList.push("...")
    numList.push(count-2)
    numList.push(count-1)
    numList.push(count)
  }else{
    numList.push("...")
    numList.push(currentPage-1)
    numList.push(currentPage)
    numList.push(currentPage+1)
    numList.push("...")
  }
  return(
    <div className={style.pagination}>
      {PaginationPrev()}
      {
        numList.map((i) => {
          if(typeof i === "number"){
            return PaginationNum(i)
          }else{
            return PaginationDots()
          }
        })
      }
      {PaginationNext()}
    </div>
  )
};
