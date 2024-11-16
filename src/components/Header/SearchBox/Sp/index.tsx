import { Flex } from "@radix-ui/themes";
import { HiMagnifyingGlass, HiOutlineArrowLeft } from "react-icons/hi2";
import { useState } from "react";
import style from "./index.module.scss";
import { IconButton } from "@/components/ui/IconButton";
import { ButtonSizeProp } from "@/types/button";

export const SearchBoxSp: React.FC<{ children?: React.ReactNode }> = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const [isOpenSpSearch, setIsOpenSpSearch] = useState(false);

  const handleClick = () => {
    setIsOpenSpSearch(!isOpenSpSearch);
  };

  return (
    <div className={style.search_box_sp}>
      {isOpenSpSearch ? (
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
            {children}
          </Flex>
        </div>
      ) : (
        <div className={style.search_box_sp_icon}>
          <IconButton
            Icon={HiMagnifyingGlass}
            handleClick={() => handleClick()}
            disable={false}
            size={ButtonSizeProp.medium}
          />
        </div>
      )}
    </div>
  );
};
