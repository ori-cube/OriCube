import { Flex } from "@radix-ui/themes";
import Link from "next/link";
import Image from "next/image";
import style from "./presenter.module.scss";
import { SearchBoxPresenter } from "./SearchBox";
// import { GoogleAuthButton } from "./GoogleAuth";
import { Model } from "@/types/model";
// import MobileMenu from "./HamburgerMenu";

export type HeaderPresenterProps =
  | { enableSearch: true; origamiData: Model[] } // enableSearch が true の場合
  | { enableSearch: false; origamiData?: undefined }; // enableSearch が false の場合

export const HeaderPresenter: React.FC<HeaderPresenterProps> = ({
  enableSearch,
  origamiData,
}: HeaderPresenterProps) => (
  <header className={style.header}>
    <Flex id="header-container" align="center" height="46px" justify="between">
      {/* <div className={style.mobile_menu}>
        <MobileMenu />
      </div> */}
      <Flex id="header-logo-container" gapX="8px" className={style.logo}>
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
        {/* <Flex
          id="navigation-container"
          align="center"
          className={style.google_auth_button}
        >
          <GoogleAuthButton />
        </Flex> */}
      </Flex>
    </Flex>
  </header>
);
