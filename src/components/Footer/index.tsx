import React from "react";
import styles from "./index.module.scss";

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p className={styles.copy}>
          &copy; {new Date().getFullYear()} OriCube. All rights reserved.
        </p>
        <nav className={styles.nav}>
          <a href="http://www.goo.ne.jp/">
            <img
              src="https://u.xgoo.jp/img/sgoo.png"
              alt="supported by goo"
              title="supported by goo"
              width={100}
            />
          </a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
