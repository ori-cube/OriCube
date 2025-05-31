import React from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiDotsHorizontal,
} from "react-icons/hi";
import style from "./index.module.scss";
import { IconButton } from "@/components/ui/IconButton";

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
        handleClick={() => {
          if (currentPage != 1) {
            changePage((i) => {
              return i - 1;
            });
          }
        }}
        Icon={HiOutlineArrowLeft}
        disable={currentPage != 1 ? false : true}
      />
    );
  };
  const PaginationNext = () => {
    return (
      <IconButton
        handleClick={() => {
          if (currentPage != count) {
            changePage((i) => {
              return i + 1;
            });
          }
        }}
        Icon={HiOutlineArrowRight}
        disable={currentPage != count ? false : true}
      />
    );
  };
  const PaginationDots = () => {
    return <HiDotsHorizontal size={8} className={style.icon} />;
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

  const PaginationDots_2 = () => {
    return <HiDotsHorizontal size={8} className={style.icon_2} />;
  };

  const PaginationDots_3 = () => {
    return <HiDotsHorizontal size={8} className={style.icon_3} />;
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
  } else if (currentPage == 3) {
    numList.push(1);
    numList.push(2);
    numList.push(3);
    numList.push(4);
    numList.push("..");
    numList.push(count);
  } else if (currentPage == count - 2) {
    numList.push(1);
    numList.push("..");
    numList.push(count - 3);
    numList.push(count - 2);
    numList.push(count - 1);
    numList.push(count);
  } else if (currentPage == count - 1 || currentPage == count) {
    numList.push(1);
    numList.push("...");
    numList.push(count - 2);
    numList.push(count - 1);
    numList.push(count);
  } else {
    numList.push(1);
    numList.push(".");
    numList.push(currentPage - 1);
    numList.push(currentPage);
    numList.push(currentPage + 1);
    numList.push(".");
    numList.push(count);
  }
  return (
    <div className={style.pagination}>
      {PaginationPrev()}
      {numList.map((i, index) => {
        if (typeof i === "number") {
          return <div key={index}>{PaginationNum(i)}</div>;
        } else if (i === ".") {
          return <div key={index}>{PaginationDots()}</div>;
        } else if (i === "..") {
          return <div key={index}>{PaginationDots_2()}</div>;
        } else if (i === "...") {
          return <div key={index}>{PaginationDots_3()}</div>;
        }
      })}
      {PaginationNext()}
    </div>
  );
};
