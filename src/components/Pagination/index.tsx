import React from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiDotsHorizontal,
} from "react-icons/hi";
import style from "./index.module.scss";
import { IconButton } from "../IconButton";

type Props = {
  currentPage: number;
  limit: number;
  count: number;
  changePage: React.Dispatch<React.SetStateAction<number>>;
};

export const Pagination = ({
  currentPage,
  limit,
  count,
  changePage,
}: Props) => {
  const PaginationPrev = () => {
    return (
      <IconButton
        handleClick={() =>
          changePage((i) => {
            return i - 1;
          })
        }
        Icon={HiOutlineArrowLeft}
      />
    );
  };
  const PaginationNext = () => {
    return (
      <IconButton
        handleClick={() =>
          changePage((i) => {
            return i + 1;
          })
        }
        Icon={HiOutlineArrowRight}
      />
    );
  };
  const PaginationDots = () => {
    return <HiDotsHorizontal size={16} className={style.icon} />;
  };
  const PaginationNum = (i: number) => {
    return (
      <button
        className={currentPage == i ? style.box_active : style.box}
        onClick={() => {
          changePage(i);
        }}
      >
        {i}
      </button>
    );
  };
  const numList = [];
  if (count <= limit) {
    for (let i = 1; i <= count; i++) {
      numList.push(i);
    }
  } else if (currentPage == 1 || currentPage == 2) {
    numList.push(1);
    numList.push(2);
    numList.push(3);
    numList.push("...");
    numList.push(count);
  } else if (currentPage == count - 1 || currentPage == count) {
    numList.push(1);
    numList.push("...");
    numList.push(count - 2);
    numList.push(count - 1);
    numList.push(count);
  } else {
    numList.push("...");
    numList.push(currentPage - 1);
    numList.push(currentPage);
    numList.push(currentPage + 1);
    numList.push("...");
  }
  return (
    <div className={style.pagination}>
      {currentPage > 1 && PaginationPrev()}
      {numList.map((i, index) => {
        if (typeof i === "number") {
          return (
            <div key={index}>
              {PaginationNum(i)}
            </div>
          )
        } else {
          return (
            <div key={index}>
              {PaginationDots()}
            </div>
          )
        }
      })}
      {currentPage < count && PaginationNext()}
    </div>
  );
};
