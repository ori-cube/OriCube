// MobileMenu.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { RxHamburgerMenu } from "react-icons/rx";
import { HiMiniXMark } from "react-icons/hi2";
import { IconButton } from "@/components/ui/IconButton";
import { GoogleAuthButton } from "../GoogleAuth";
import styles from "./index.module.scss"; // Sassファイルをインポート
import { ButtonSizeProp } from "@/types/button";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.mobile_menu_container}>
      <div className={styles.hamburger_button}>
        <IconButton
          handleClick={toggleMenu}
          Icon={RxHamburgerMenu}
          disable={false}
        />
      </div>
      <div
        ref={menuRef}
        className={`${styles.menu} ${isOpen ? styles.open : styles.closed}`}
      >
        <div className={styles.menu_icon}>
          <IconButton
            handleClick={toggleMenu}
            Icon={HiMiniXMark}
            disable={false}
            size={ButtonSizeProp.medium}
          />
        </div>
        <nav className={styles.menu_nav}>
          <ul className={styles.menu_list}>
            <li className={styles.menu_item}>
              <Link href="/" className={styles.menu_link} onClick={toggleMenu}>
                ホーム
              </Link>
            </li>
            <li className={styles.menu_item}>
              <Link
                href="/add"
                className={styles.menu_link}
                onClick={toggleMenu}
              >
                折り紙を追加
              </Link>
            </li>
          </ul>
          <div className={styles.menu_auth}>
            <GoogleAuthButton />
          </div>
        </nav>
      </div>
      {isOpen && (
        <div
          className={styles.menu_overlay}
          aria-hidden="true"
          onClick={toggleMenu}
        />
      )}
    </div>
  );
}
