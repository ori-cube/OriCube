import Link from "next/link";
import Image from "next/image";
import style from "./presenter.module.scss";
import { SearchBoxPresenter } from "./SearchBox";
import type { Model } from "@/types/model";

export type HeaderPresenterProps =
  | { enableSearch: true; origamiData: Model[] }
  | { enableSearch: false; origamiData?: undefined };

export function HeaderPresenter({ enableSearch, origamiData }: HeaderPresenterProps) {
  return (
    <header className={style.header}>
      <div id="header-container" className={style.container}>
        <div id="header-logo-container" className={style.logo}>
          <Link href="/">
            <Image alt="ロゴ:OriCube" src="/assets/OriCube.png" width={140} height={46} />
          </Link>
        </div>
        {enableSearch && <div id="navigation-container" className={style.navigation}>
          <SearchBoxPresenter origamiData={origamiData} />
        </div>}
      </div>
    </header>
  );
}
