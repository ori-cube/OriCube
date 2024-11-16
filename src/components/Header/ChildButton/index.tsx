"use client";

import { useChildren } from "@/app/_children-provider";
import { Button } from "@radix-ui/themes";
import styles from "./index.module.scss";

const ChildrenModeButton = () => {
  const { isChildren, setIsChildren } = useChildren();

  const toggleChildrenMode = () => {
    setIsChildren(!isChildren);
  };

  return (
    <Button
      color="gray"
      variant="surface"
      highContrast
      onClick={() => toggleChildrenMode()}
      className={styles.button}
    >
      {isChildren ? <div>漢字にする</div> : <div>ひらがなにする</div>}
    </Button>
  );
};

export default ChildrenModeButton;
