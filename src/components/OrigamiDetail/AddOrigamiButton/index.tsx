"use client";

import styles from "./index.module.scss";
import Link from "next/link";
import { FaPlus } from "react-icons/fa6";
import { useSession } from "next-auth/react";

const AddOrigamiButton: React.FC = () => {
  const { status } = useSession();
  return (
    <>
      {status === "authenticated" ? (
        <Link href="/post" className={styles.menu_link}>
          <FaPlus className={styles.icon} size={32} color="white" />
        </Link>
      ) : (
        <></>
      )}
    </>
  );
};

export default AddOrigamiButton;
