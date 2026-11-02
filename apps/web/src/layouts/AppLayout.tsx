import { Link, Outlet } from "react-router";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#origami-viewer">本文へ移動</a>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <img alt="ロゴ:OriCube" src="/assets/OriCube.png" width={140} height={46} />
        </Link>
        {/* ログインが無いため、このブラウザで投稿した作品（編集用の鍵がある作品）を出す */}
        <Link to="/me" className={styles.link}>自分の作品</Link>
      </header>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
