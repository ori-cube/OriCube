import { Link, Outlet } from "react-router";
import styles from "./AppLayout.module.css";
import { AuthMenu } from "./AuthMenu";

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#origami-viewer">本文へ移動</a>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <img alt="ロゴ:OriCube" src="/assets/OriCube.png" width={140} height={46} />
        </Link>
        <div className={styles.menu}>
          <AuthMenu />
        </div>
      </header>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
