import { Flex, Box, Button } from "@radix-ui/themes";
import Link from "next/link";
import Image from "next/image";
import style from "./presenter.module.scss";

interface HeaderProps {
  title: string;
  children: React.ReactNode;
}

export const HeaderPresenter: React.FC<HeaderProps> = (props: HeaderProps) => (
  <header className={style.header}>
    <Flex id="header-container" align="center" height="46px" justify="between">
      <Flex id="header-logo-container" gapX="8px">
        <Link href="/">
          <Image
            alt="ロゴ：OriCube"
            src="/assets/OriCube.png"
            width={140}
            height={46}
          />
        </Link>
      </Flex>
      <Flex id="navigation-container" align="center">
        {props.children}
      </Flex>
    </Flex>
  </header>
);
