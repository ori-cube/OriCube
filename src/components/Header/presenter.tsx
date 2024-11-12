import { Flex } from "@radix-ui/themes";
import Link from "next/link";
import Image from "next/image";
import style from "./presenter.module.scss";
import { SearchBoxPresenter } from "./SearchBox";
import { GoogleAuthButton } from "./GoogleAuth";
import { HeaderProps } from "./index";

export const HeaderPresenter: React.FC<HeaderProps> = ({
  enableSearch,
  origamiData,
}: HeaderProps) => (
  <header className={style.header}>
    <Flex id="header-container" align="center" height="46px" justify="between">
      <Flex id="header-logo-container" gapX="8px">
        <Link href="/">
          <Image
            alt="ロゴ:OriCube"
            src="/assets/OriCube.png"
            width={140}
            height={46}
          />
        </Link>
      </Flex>
      <Flex gapX="8px" justify="between" align="center">
        {enableSearch ? (
          <Flex id="navigation-container" align="center">
            <SearchBoxPresenter origamiData={origamiData} />
          </Flex>
        ) : (
          <></>
        )}
        <Flex id="navigation-container" align="center">
          <GoogleAuthButton />
        </Flex>
      </Flex>
    </Flex>
  </header>
);
