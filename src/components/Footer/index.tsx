import React from "react";
import styles from "./index.module.scss";

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p className={styles.copy}>
          &copy; {new Date().getFullYear()} OriCube. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
